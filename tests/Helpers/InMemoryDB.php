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

        // Build the schema and FTS objects from the production code so this in-memory mirror can
        // never drift from what SQLiteDB actually generates at runtime. See SQLiteDBTest.
        self::invokeBuilder('createSchema', $pdo);
        self::invokeBuilder('createFts', $pdo);

        self::injectIntoSingleton($pdo);

        return $pdo;
    }

    /**
     * Invoke one of SQLiteDB's private build steps against the given connection.
     */
    private static function invokeBuilder(string $method, \PDO $pdo): void
    {
        $instance = (new \ReflectionClass(SQLiteDB::class))->newInstanceWithoutConstructor();

        $ref = new \ReflectionMethod(SQLiteDB::class, $method);
        $ref->setAccessible(true);
        $ref->invoke($instance, $pdo);
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
