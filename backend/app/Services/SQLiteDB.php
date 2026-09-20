<?php

namespace IconIndexa\Services;

if (!defined('ABSPATH')) {
    exit;
}

use IconIndexa\Config;

// This plugin ships a static, public icon dataset as backend/data/ib.json (source of truth).
// At runtime it generates a SQLite database from that JSON into the writable uploads directory
// (wp-content/uploads/icon-indexa/ib.db) - it never ships a binary db and never writes inside the
// plugin directory. The db is rebuilt whenever Config::DATA_VERSION is newer than the stored
// data_version option. The dataset holds only public icon metadata; no user or sensitive data.
// $wpdb is MySQL-only and cannot read SQLite, hence PDO.
// phpcs:disable WordPress.DB.RestrictedClasses.mysql__PDO

class SQLiteDB
{
    private static $_instance;

    private \PDO $pdo;

    private function __construct()
    {
        // WordPress core only requires the mysqli driver, so pdo_sqlite is often absent on
        // shared/locked-down hosts. Fail with a clear, catchable message instead of a cryptic
        // "could not find driver" PDOException deep in the constructor.
        if (!self::isSupported()) {
            throw new \RuntimeException('Icon Indexa: the PHP pdo_sqlite extension is required but not installed.');
        }

        $dbDir  = Config::get('RUNTIME_DB_DIR');
        $dbPath = Config::get('RUNTIME_DB_PATH');

        $this->prepareDir($dbDir);

        if ($this->needsRebuild($dbPath)) {
            $this->rebuildLocked($dbDir, $dbPath);
        }

        $this->pdo = new \PDO(
            'sqlite:' . $dbPath,
            null,
            null,
            [
                \PDO::ATTR_ERRMODE            => \PDO::ERRMODE_EXCEPTION,
                \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
            ]
        );

        $this->pdo->exec('PRAGMA journal_mode=WAL;');
        $this->pdo->exec('PRAGMA foreign_keys=ON;');
    }

    private function needsRebuild(string $dbPath): bool
    {
        if (!file_exists($dbPath)) {
            return true;
        }

        $installed = (string) Config::getOption('data_version', '0');

        return version_compare($installed, Config::DATA_VERSION, '<');
    }

    /**
     * Serialize rebuilds across concurrent requests with an exclusive flock, so two workers don't
     * both delete the live db's -wal/-shm sidecars and rename over it at once (a transient 500, and
     * on Windows a rename-over-open-file failure). After acquiring the lock the waiter re-checks
     * needsRebuild (double-checked locking): the holder that just finished has bumped the
     * data_version option, so the waiter sees the fresh db and does nothing.
     *
     * The data_version option is autoloaded, so needsRebuild() reads it from the request's primed `alloptions`
     * cache. Under the default non-persistent object cache the holder's update_option can't
     * invalidate a waiter's already-loaded cache, so without the bust below every concurrent waiter
     * would re-read its stale value and rebuild redundantly over the just-installed db. Drop the
     * alloptions cache entry inside the lock so the re-check re-queries the db and the double-check
     * actually short-circuits.
     *
     * ponytail: single-host advisory flock; fine for one server. Multi-host NFS flock is
     * unreliable, but the rename stays atomic there so the worst case is the same transient 500
     * this path already had - not corruption or data loss (the db regenerates from ib.json).
     */
    private function rebuildLocked(string $dbDir, string $dbPath): void
    {
        $lockPath = $dbDir . DIRECTORY_SEPARATOR . '.rebuild.lock';

        // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_fopen -- advisory lock file in the writable uploads dir, not a remote resource.
        $handle = @fopen($lockPath, 'c');

        if ($handle === false) {
            // Can't create the lock file (e.g. read-only dir); fall back to an unlocked rebuild
            // rather than failing outright - no worse than the pre-lock behavior.
            $this->rebuild($dbPath);

            return;
        }

        try {
            flock($handle, LOCK_EX);

            // A concurrent worker may have rebuilt while we waited for the lock. Its bumped
            // data_version is committed to the db but not to this request's primed alloptions cache
            // (non-persistent object cache can't invalidate cross-process), so drop that cache entry
            // and force needsRebuild() to re-read the fresh value; otherwise the double-check never
            // short-circuits and we rebuild over the live db.
            wp_cache_delete('alloptions', 'options');

            if ($this->needsRebuild($dbPath)) {
                $this->rebuild($dbPath);
            }
        } finally {
            flock($handle, LOCK_UN);
            // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_fclose -- closing the local lock file handle.
            fclose($handle);
        }
    }

    /**
     * Build a fresh SQLite db from the shipped JSON into a temp file, then atomically move it
     * into place. Atomic rename guarantees concurrent readers never see a half-built database.
     */
    private function rebuild(string $dbPath): void
    {
        $source = Config::get('DATA_SOURCE');

        if (!is_readable($source)) {
            throw new \RuntimeException('Icon Indexa: icon dataset not found at ' . esc_html($source));
        }

        $tmpPath = $dbPath . '.' . uniqid('build', true) . '.tmp';

        // Build with the default rollback journal (no WAL sidecar files) so the temp db is a
        // single self-contained file that can be renamed atomically.
        $builder = new \PDO(
            'sqlite:' . $tmpPath,
            null,
            null,
            [\PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION]
        );

        try {
            $this->createSchema($builder);
            $this->importJson($builder, $source);
        } catch (\Throwable $e) {
            $builder = null;
            $this->deleteFile($tmpPath);

            throw $e;
        }

        // FTS5 is a compile-time SQLite module and is missing on some builds. Treat it as
        // optional: if the index cannot be created, the db is still valid and Icons::search()
        // catches the resulting "no such table: icons_fts" and falls back to fuzzy matching.
        try {
            $this->createFts($builder);
        } catch (\Throwable $e) {
            // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
            error_log('Icon Indexa: FTS5 unavailable, search will use fuzzy fallback: ' . $e->getMessage());
        }

        // Close the builder handle before renaming/removing files.
        $builder = null;

        // Clear any stale WAL sidecars left by a previous runtime connection.
        $this->deleteFile($dbPath . '-wal');
        $this->deleteFile($dbPath . '-shm');

        // phpcs:ignore WordPress.WP.AlternativeFunctions.rename_rename -- moving a locally generated file within the uploads dir, not a remote operation.
        if (!@rename($tmpPath, $dbPath)) {
            $this->deleteFile($tmpPath);

            throw new \RuntimeException('Icon Indexa: failed to install generated database.');
        }

        // Tighten perms so the generated db is not world-readable on shared/multi-tenant hosts
        // (the default umask often leaves it 0644). Best-effort; not fatal if the host rejects it.
        // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_chmod -- WP_Filesystem has no chmod on a raw path; this tightens perms on a file just written outside the VFS abstraction
        @chmod($dbPath, 0640);

        Config::updateOption('data_version', Config::DATA_VERSION, true);
    }

    private function createSchema(\PDO $pdo): void
    {
        $pdo->exec(
            'CREATE TABLE icon_type (
                id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                type TEXT NOT NULL UNIQUE
            )'
        );

        $pdo->exec(
            'CREATE TABLE library (
                id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                slug TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                meta TEXT
            )'
        );

        $pdo->exec(
            'CREATE TABLE icons (
                id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                name TEXT NOT NULL,
                type_id INTEGER,
                tags TEXT,
                library_id INTEGER NOT NULL,
                filename TEXT NOT NULL,
                FOREIGN KEY (type_id) REFERENCES icon_type(id),
                FOREIGN KEY (library_id) REFERENCES library(id)
            )'
        );

        $pdo->exec('CREATE UNIQUE INDEX icons_filename_unique ON icons (filename)');
    }

    private function importJson(\PDO $pdo, string $source): void
    {
        // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- local plugin data file read, not a remote URL.
        $raw  = file_get_contents($source);
        $data = json_decode((string) $raw, true);

        if (!is_array($data)) {
            throw new \RuntimeException('Icon Indexa: icon dataset JSON is invalid.');
        }

        $pdo->beginTransaction();

        $typeStmt = $pdo->prepare('INSERT INTO icon_type (id, type) VALUES (:id, :type)');

        foreach ($data['icon_type'] ?? [] as $row) {
            $typeStmt->execute(
                [
                    ':id'   => $row['id'],
                    ':type' => $row['type'],
                ]
            );
        }

        $libStmt = $pdo->prepare('INSERT INTO library (id, slug, name, meta) VALUES (:id, :slug, :name, :meta)');

        foreach ($data['library'] ?? [] as $row) {
            $libStmt->execute(
                [
                    ':id'   => $row['id'],
                    ':slug' => $row['slug'],
                    ':name' => $row['name'],
                    ':meta' => $row['meta'] ?? null,
                ]
            );
        }

        $iconStmt = $pdo->prepare(
            'INSERT INTO icons (id, name, type_id, tags, library_id, filename)
             VALUES (:id, :name, :type_id, :tags, :library_id, :filename)'
        );

        foreach ($data['icons'] ?? [] as $row) {
            $iconStmt->execute(
                [
                    ':id'         => $row['id'],
                    ':name'       => $row['name'],
                    ':type_id'    => $row['type_id'] ?? null,
                    ':tags'       => $row['tags'] ?? null,
                    ':library_id' => $row['library_id'],
                    ':filename'   => $row['filename'],
                ]
            );
        }

        $pdo->commit();
    }

    private function createFts(\PDO $pdo): void
    {
        $pdo->exec(
            "CREATE VIRTUAL TABLE IF NOT EXISTS icons_fts USING fts5(
                name, tags, content='icons', content_rowid='id'
            )"
        );

        $pdo->exec(
            'CREATE TRIGGER IF NOT EXISTS icons_ai AFTER INSERT ON icons BEGIN
                INSERT INTO icons_fts(rowid, name, tags) VALUES (new.id, new.name, new.tags);
            END'
        );

        $pdo->exec(
            'CREATE TRIGGER IF NOT EXISTS icons_ad AFTER DELETE ON icons BEGIN
                INSERT INTO icons_fts(icons_fts, rowid, name, tags)
                    VALUES(\'delete\', old.id, old.name, old.tags);
            END'
        );

        $pdo->exec(
            'CREATE TRIGGER IF NOT EXISTS icons_au AFTER UPDATE ON icons BEGIN
                INSERT INTO icons_fts(icons_fts, rowid, name, tags)
                    VALUES(\'delete\', old.id, old.name, old.tags);
                INSERT INTO icons_fts(rowid, name, tags) VALUES (new.id, new.name, new.tags);
            END'
        );

        // Populate the FTS index from the freshly imported content table.
        $pdo->exec("INSERT INTO icons_fts(icons_fts) VALUES('rebuild')");
    }

    private function prepareDir(string $dir): void
    {
        if (!is_dir($dir)) {
            wp_mkdir_p($dir);
        }

        $index = $dir . DIRECTORY_SEPARATOR . 'index.php';

        if (!file_exists($index)) {
            $this->writeGuardFile($index, "<?php\n// Silence is golden.\n");
        }

        $htaccess = $dir . DIRECTORY_SEPARATOR . '.htaccess';

        if (!file_exists($htaccess)) {
            // Apache-only: .htaccess is ignored by nginx/Caddy/IIS, so the generated db can be
            // downloaded directly there. Accepted: the db holds only the public, shipped icon
            // metadata (name/tags/filename) that also lives in the committed ib.json and the
            // plugin zip, so no user or secret data is exposed. index.php blocks directory
            // listing on every stack.
            $rules = <<<'HTACCESS'
                <IfModule mod_authz_core.c>
                Require all denied
                </IfModule>
                <IfModule !mod_authz_core.c>
                Order allow,deny
                Deny from all
                </IfModule>
                HTACCESS;
            $this->writeGuardFile($htaccess, $rules);
        }
    }

    /**
     * Write a directory-protection file (index.php / .htaccess), surfacing a silent failure. The
     * db is still served without the guard if this fails, so log it instead of swallowing it so an
     * unprotected uploads dir is diagnosable rather than invisible.
     */
    private function writeGuardFile(string $path, string $contents): void
    {
        // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents -- writable uploads dir, not the plugin dir.
        if (@file_put_contents($path, $contents) === false) {
            // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
            error_log('Icon Indexa: could not write protection file ' . $path);
        }
    }

    private function deleteFile(string $path): void
    {
        if (file_exists($path)) {
            wp_delete_file($path);
        }
    }

    /**
     * Whether this host can run the plugin's data layer. WordPress core only requires mysqli, so
     * pdo_sqlite is not guaranteed to be present.
     */
    public static function isSupported(): bool
    {
        return extension_loaded('pdo_sqlite') && \in_array('sqlite', \PDO::getAvailableDrivers(), true);
    }

    public static function instance(): self
    {
        if (!self::$_instance) {
            self::$_instance = new self();
        }

        return self::$_instance;
    }

    public function pdo(): \PDO
    {
        return $this->pdo;
    }
}
