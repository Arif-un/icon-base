<?php

namespace IconBase\Models;

if (!\defined('ABSPATH')) {
    exit;
}

use IconBase\Services\SQLiteDB;

class IconType
{
    public const TABLE = 'icon_type';

    public static function getAll(): array
    {
        $pdo = SQLiteDB::instance()->pdo();
        $stmt = $pdo->query('SELECT * FROM ' . self::TABLE . ' ORDER BY id ASC');

        return $stmt->fetchAll();
    }
}
