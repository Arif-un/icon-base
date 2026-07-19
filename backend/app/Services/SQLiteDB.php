<?php

namespace IconBase\Services;

if (!defined('ABSPATH')) {
    exit;
}

use IconBase\Config;

// This plugin ships a static, public icon dataset as backend/data/ib.json (source of truth).
// At runtime it generates a SQLite database from that JSON into the writable uploads directory
// (wp-content/uploads/icon-base/ib.db) — it never ships a binary db and never writes inside the
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
        $dbDir  = Config::get('RUNTIME_DB_DIR');
        $dbPath = Config::get('RUNTIME_DB_PATH');

        $this->prepareDir($dbDir);

        if ($this->needsRebuild($dbPath)) {
            $this->rebuild($dbPath);
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
     * Build a fresh SQLite db from the shipped JSON into a temp file, then atomically move it
     * into place. Atomic rename guarantees concurrent readers never see a half-built database.
     */
    private function rebuild(string $dbPath): void
    {
        $source = Config::get('DATA_SOURCE');

        if (!is_readable($source)) {
            throw new \RuntimeException('Icon Base: icon dataset not found at ' . esc_html($source));
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
            $this->createFts($builder);
        } catch (\Throwable $e) {
            $builder = null;
            $this->deleteFile($tmpPath);

            throw $e;
        }

        // Close the builder handle before renaming/removing files.
        $builder = null;

        // Clear any stale WAL sidecars left by a previous runtime connection.
        $this->deleteFile($dbPath . '-wal');
        $this->deleteFile($dbPath . '-shm');

        // phpcs:ignore WordPress.WP.AlternativeFunctions.rename_rename -- moving a locally generated file within the uploads dir, not a remote operation.
        if (!@rename($tmpPath, $dbPath)) {
            $this->deleteFile($tmpPath);

            throw new \RuntimeException('Icon Base: failed to install generated database.');
        }

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
            throw new \RuntimeException('Icon Base: icon dataset JSON is invalid.');
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
            // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents -- writable uploads dir, not the plugin dir.
            @file_put_contents($index, "<?php\n// Silence is golden.\n");
        }

        $htaccess = $dir . DIRECTORY_SEPARATOR . '.htaccess';

        if (!file_exists($htaccess)) {
            $rules = <<<'HTACCESS'
                <IfModule mod_authz_core.c>
                Require all denied
                </IfModule>
                <IfModule !mod_authz_core.c>
                Order allow,deny
                Deny from all
                </IfModule>
                HTACCESS;
            // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents -- writable uploads dir, not the plugin dir.
            @file_put_contents($htaccess, $rules);
        }
    }

    private function deleteFile(string $path): void
    {
        if (file_exists($path)) {
            wp_delete_file($path);
        }
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
