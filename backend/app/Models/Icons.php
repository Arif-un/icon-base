<?php

namespace IconBase\Models;

if (!\defined('ABSPATH')) {
    exit;
}

use IconBase\Services\SQLiteDB;

class Icons
{
    public const TABLE = 'icons';

    public static function getAll(): array
    {
        $pdo = SQLiteDB::instance()->pdo();
        $stmt = $pdo->query('SELECT * FROM ' . self::TABLE . ' ORDER BY id ASC');

        return $stmt->fetchAll();
    }

    public static function getById(int $id): ?array
    {
        $pdo = SQLiteDB::instance()->pdo();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::TABLE . ' WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();

        return $row ?: null;
    }

    public static function create(array $data): int
    {
        $pdo = SQLiteDB::instance()->pdo();
        $stmt = $pdo->prepare(
            'INSERT INTO ' . self::TABLE . ' (slug, name) VALUES (:slug, :name)'
        );
        $stmt->execute([':slug' => $data['slug'], ':name' => $data['name']]);

        return (int) $pdo->lastInsertId();
    }

    public static function update(int $id, array $data): bool
    {
        $pdo = SQLiteDB::instance()->pdo();
        $stmt = $pdo->prepare(
            'UPDATE ' . self::TABLE . ' SET slug = :slug, name = :name WHERE id = :id'
        );
        $stmt->execute([':slug' => $data['slug'], ':name' => $data['name'], ':id' => $id]);

        return $stmt->rowCount() > 0;
    }

    public static function delete(int $id): bool
    {
        $pdo = SQLiteDB::instance()->pdo();
        $stmt = $pdo->prepare('DELETE FROM ' . self::TABLE . ' WHERE id = :id');
        $stmt->execute([':id' => $id]);

        return $stmt->rowCount() > 0;
    }
}
