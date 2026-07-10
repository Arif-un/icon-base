<?php

namespace IconBase\Services;

if (!\defined('ABSPATH')) {
    exit;
}

use IconBase\Config;

// This plugin ships a bundled SQLite database for static icon data; $wpdb (MySQL-only) cannot be used here.
// The chmod calls harden the SQLite files (0700/0600) — WP_Filesystem has no equivalent.
// phpcs:disable WordPress.DB.RestrictedClasses.mysql__PDO, WordPress.WP.AlternativeFunctions.file_system_operations_chmod

class SQLiteDB
{
    private static $_instance;

    private \PDO $pdo;

    private function __construct()
    {
        $dataDir = Config::get('BASEDIR') . DIRECTORY_SEPARATOR . 'data';

        if (!is_dir($dataDir)) {
            wp_mkdir_p($dataDir);
        }

        $dbPath = $dataDir . DIRECTORY_SEPARATOR . 'ib.db';

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

        $this->ensureFTS();

        self::hardenDirectory($dataDir, $dbPath);
    }

    private function ensureFTS(): void
    {
        $this->pdo->exec(
            "CREATE VIRTUAL TABLE IF NOT EXISTS icons_fts USING fts5(
                name, tags, content='icons', content_rowid='id'
            )"
        );

        $this->pdo->exec(
            'CREATE TRIGGER IF NOT EXISTS icons_ai AFTER INSERT ON icons BEGIN
                INSERT INTO icons_fts(rowid, name, tags) VALUES (new.id, new.name, new.tags);
            END'
        );

        $this->pdo->exec(
            'CREATE TRIGGER IF NOT EXISTS icons_ad AFTER DELETE ON icons BEGIN
                INSERT INTO icons_fts(icons_fts, rowid, name, tags)
                    VALUES(\'delete\', old.id, old.name, old.tags);
            END'
        );

        $this->pdo->exec(
            'CREATE TRIGGER IF NOT EXISTS icons_au AFTER UPDATE ON icons BEGIN
                INSERT INTO icons_fts(icons_fts, rowid, name, tags)
                    VALUES(\'delete\', old.id, old.name, old.tags);
                INSERT INTO icons_fts(rowid, name, tags) VALUES (new.id, new.name, new.tags);
            END'
        );

        if (get_transient('icon_base_fts_built')) {
            return;
        }

        $idxCount = (int) $this->pdo->query('SELECT COUNT(*) FROM icons_fts_idx')->fetchColumn();

        if ($idxCount === 0) {
            $this->pdo->exec("INSERT INTO icons_fts(icons_fts) VALUES('rebuild')");
        }

        set_transient('icon_base_fts_built', 1, DAY_IN_SECONDS);
    }

    private static function hardenDirectory(string $dataDir, string $dbPath): void
    {
        if (\PHP_OS_FAMILY === 'Windows') {
            return;
        }

        chmod($dataDir, 0700);

        foreach ([$dbPath, $dbPath . '-wal', $dbPath . '-shm'] as $file) {
            if (file_exists($file)) {
                chmod($file, 0600);
            }
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
