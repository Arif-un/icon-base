<?php

namespace Tests\Helpers;

use IconBase\Services\SQLiteDB;

class InMemoryDB
{
    public static function setup(): \PDO
    {
        $pdo = new \PDO('sqlite::memory:', null, null, [
            \PDO::ATTR_ERRMODE            => \PDO::ERRMODE_EXCEPTION,
            \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
        ]);

        $pdo->exec('PRAGMA foreign_keys=ON;');

        $pdo->exec('
            CREATE TABLE icon_type (
                id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                type TEXT NOT NULL
            )
        ');

        $pdo->exec('
            CREATE TABLE library (
                id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                slug TEXT NOT NULL,
                name TEXT NOT NULL,
                meta TEXT
            )
        ');

        $pdo->exec('
            CREATE TABLE icons (
                id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                name TEXT NOT NULL,
                type_id INTEGER,
                tags TEXT,
                library_id INTEGER NOT NULL,
                filename TEXT NOT NULL,
                FOREIGN KEY (type_id) REFERENCES icon_type(id),
                FOREIGN KEY (library_id) REFERENCES library(id)
            )
        ');

        $pdo->exec("
            CREATE VIRTUAL TABLE icons_fts USING fts5(
                name, tags, content='icons', content_rowid='id'
            )
        ");

        $pdo->exec('
            CREATE TRIGGER icons_ai AFTER INSERT ON icons BEGIN
                INSERT INTO icons_fts(rowid, name, tags) VALUES (new.id, new.name, new.tags);
            END
        ');

        $pdo->exec('
            CREATE TRIGGER icons_ad AFTER DELETE ON icons BEGIN
                INSERT INTO icons_fts(icons_fts, rowid, name, tags)
                    VALUES(\'delete\', old.id, old.name, old.tags);
            END
        ');

        $pdo->exec('
            CREATE TRIGGER icons_au AFTER UPDATE ON icons BEGIN
                INSERT INTO icons_fts(icons_fts, rowid, name, tags)
                    VALUES(\'delete\', old.id, old.name, old.tags);
                INSERT INTO icons_fts(rowid, name, tags) VALUES (new.id, new.name, new.tags);
            END
        ');

        self::injectIntoSingleton($pdo);

        return $pdo;
    }

    public static function teardown(): void
    {
        $ref = new \ReflectionProperty(SQLiteDB::class, '_instance');
        $ref->setValue(null, null);
    }

    public static function seedLibraries(\PDO $pdo, array $libraries): void
    {
        $stmt = $pdo->prepare('INSERT INTO library (id, slug, name) VALUES (:id, :slug, :name)');

        foreach ($libraries as $lib) {
            $stmt->execute($lib);
        }
    }

    public static function seedTypes(\PDO $pdo, array $types): void
    {
        $stmt = $pdo->prepare('INSERT INTO icon_type (id, type) VALUES (:id, :type)');

        foreach ($types as $type) {
            $stmt->execute($type);
        }
    }

    public static function seedIcons(\PDO $pdo, array $icons): void
    {
        $stmt = $pdo->prepare(
            'INSERT INTO icons (name, type_id, tags, library_id, filename)
             VALUES (:name, :type_id, :tags, :library_id, :filename)'
        );

        foreach ($icons as $icon) {
            $stmt->execute($icon);
        }
    }

    private static function injectIntoSingleton(\PDO $pdo): void
    {
        $instance = (new \ReflectionClass(SQLiteDB::class))
            ->newInstanceWithoutConstructor();

        $pdoProp = new \ReflectionProperty(SQLiteDB::class, 'pdo');
        $pdoProp->setValue($instance, $pdo);

        $singletonProp = new \ReflectionProperty(SQLiteDB::class, '_instance');
        $singletonProp->setValue(null, $instance);
    }
}
