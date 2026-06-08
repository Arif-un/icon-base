<?php

use Tests\Helpers\InMemoryDB;

beforeEach(function () {
    $this->pdo = InMemoryDB::setup();
});

afterEach(function () {
    InMemoryDB::teardown();
});

describe('FTS setup', function () {
    test('icons_fts table exists', function () {
        $stmt = $this->pdo->query(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='icons_fts'"
        );

        expect($stmt->fetchColumn())->toBe('icons_fts');
    });

    test('insert trigger populates FTS index', function () {
        InMemoryDB::seedLibraries($this->pdo, [
            ['id' => 1, 'slug' => 'test', 'name' => 'Test'],
        ]);

        $this->pdo->exec(
            "INSERT INTO icons (name, type_id, tags, library_id, filename)
             VALUES ('arrow-left', NULL, 'arrow,left', 1, 'test-arrow')"
        );

        $fts = $this->pdo->query("SELECT * FROM icons_fts WHERE icons_fts MATCH '\"arrow\"*'")->fetchAll();

        expect($fts)->not->toBeEmpty();
        expect($fts[0]['name'])->toBe('arrow-left');
    });

    test('delete trigger removes from FTS index', function () {
        InMemoryDB::seedLibraries($this->pdo, [
            ['id' => 1, 'slug' => 'test', 'name' => 'Test'],
        ]);

        $this->pdo->exec(
            "INSERT INTO icons (name, type_id, tags, library_id, filename)
             VALUES ('arrow-left', NULL, 'arrow,left', 1, 'test-arrow')"
        );

        $this->pdo->exec("DELETE FROM icons WHERE filename = 'test-arrow'");

        $fts = $this->pdo->query("SELECT * FROM icons_fts WHERE icons_fts MATCH '\"arrow\"*'")->fetchAll();

        expect($fts)->toBeEmpty();
    });

    test('update trigger re-indexes FTS', function () {
        InMemoryDB::seedLibraries($this->pdo, [
            ['id' => 1, 'slug' => 'test', 'name' => 'Test'],
        ]);

        $this->pdo->exec(
            "INSERT INTO icons (name, type_id, tags, library_id, filename)
             VALUES ('arrow-left', NULL, 'arrow,left', 1, 'test-arrow')"
        );

        $this->pdo->exec("UPDATE icons SET name = 'star-icon', tags = 'star,favorite' WHERE filename = 'test-arrow'");

        $oldMatch = $this->pdo->query("SELECT * FROM icons_fts WHERE icons_fts MATCH '\"arrow\"*'")->fetchAll();
        expect($oldMatch)->toBeEmpty();

        $newMatch = $this->pdo->query("SELECT * FROM icons_fts WHERE icons_fts MATCH '\"star\"*'")->fetchAll();
        expect($newMatch)->not->toBeEmpty();
        expect($newMatch[0]['name'])->toBe('star-icon');
    });
});
