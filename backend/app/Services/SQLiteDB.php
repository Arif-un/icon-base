<?php

namespace IconBase\Services;

if (!\defined('ABSPATH')) {
    exit;
}

use IconBase\Config;

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

        self::hardenDirectory($dataDir, $dbPath);
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
