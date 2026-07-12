<?php

namespace IconBase\Models;

if (!defined('ABSPATH')) {
    exit;
}

use IconBase\Services\SQLiteDB;

class Library
{
    public const TABLE = 'library';

    public static function getAll(): array
    {
        $pdo = SQLiteDB::instance()->pdo();
        $stmt = $pdo->query('SELECT * FROM ' . self::TABLE . ' ORDER BY id ASC');

        return array_map([self::class, 'decodeMeta'], $stmt->fetchAll());
    }

    private static function decodeMeta(array $row): array
    {
        if (isset($row['meta'])) {
            $row['meta'] = json_decode($row['meta'], true);
        }

        return $row;
    }
}
