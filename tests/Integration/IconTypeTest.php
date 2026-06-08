<?php

use Tests\Helpers\InMemoryDB;
use IconBase\Models\IconType;

beforeEach(function () {
    $this->pdo = InMemoryDB::setup();
});

afterEach(function () {
    InMemoryDB::teardown();
});

describe('IconType::getAll', function () {
    test('returns all icon types ordered by id', function () {
        InMemoryDB::seedTypes($this->pdo, [
            ['id' => 1, 'type' => 'outlined'],
            ['id' => 2, 'type' => 'filled'],
            ['id' => 3, 'type' => 'twotone'],
        ]);

        $result = IconType::getAll();

        expect($result)->toHaveCount(3);
        expect($result[0]['type'])->toBe('outlined');
        expect($result[1]['type'])->toBe('filled');
        expect($result[2]['type'])->toBe('twotone');
    });

    test('returns empty array when no types exist', function () {
        $result = IconType::getAll();

        expect($result)->toBe([]);
    });

    test('returns id and type columns', function () {
        InMemoryDB::seedTypes($this->pdo, [
            ['id' => 1, 'type' => 'outlined'],
        ]);

        $result = IconType::getAll();

        expect($result[0])->toHaveKeys(['id', 'type']);
    });
});
