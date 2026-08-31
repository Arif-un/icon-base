<?php

use Tests\Helpers\InMemoryDB;
use IconIndexa\Models\Icons;

beforeEach(function () {
    $this->pdo = InMemoryDB::setup();

    InMemoryDB::seedLibraries($this->pdo, [
        ['id' => 1, 'slug' => 'antd', 'name' => 'Ant Design'],
    ]);

    InMemoryDB::seedTypes($this->pdo, [
        ['id' => 1, 'type' => 'outlined'],
    ]);

    InMemoryDB::seedIcons($this->pdo, [
        ['name' => 'arrow-left', 'type_id' => 1, 'tags' => 'arrow', 'library_id' => 1, 'filename' => 'antd-arrow-left.svg'],
        ['name' => 'home', 'type_id' => 1, 'tags' => 'house', 'library_id' => 1, 'filename' => 'antd-home.svg'],
    ]);
});

afterEach(function () {
    InMemoryDB::teardown();
});

describe('Icons::allForRegistry', function () {
    test('returns every icon with the fields the collection bridge needs', function () {
        $rows = Icons::allForRegistry();

        expect($rows)->toHaveCount(2);

        foreach ($rows as $row) {
            expect($row)->toHaveKeys(['id', 'name', 'filename', 'library_id']);
        }

        expect($rows[0]['name'])->toBe('arrow-left');
        expect($rows[0]['filename'])->toBe('antd-arrow-left.svg');
        expect((int) $rows[0]['library_id'])->toBe(1);
    });
});
