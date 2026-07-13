<?php

namespace IconBase\Services;

if (!defined('ABSPATH')) {
    exit;
}

use IconBase\Config;

// This plugin ships a bundled SQLite database for static, public icon metadata (icon names, tags
// and SVG markup). It contains no user or sensitive data. $wpdb is MySQL-only and cannot read it.
// phpcs:disable WordPress.DB.RestrictedClasses.mysql__PDO

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
