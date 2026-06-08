<?php

use Tests\Helpers\InMemoryDB;
use IconBase\Models\Icons;

beforeEach(function () {
    $this->pdo = InMemoryDB::setup();

    InMemoryDB::seedLibraries($this->pdo, [
        ['id' => 1, 'slug' => 'antd', 'name' => 'Ant Design'],
        ['id' => 2, 'slug' => 'boxicons', 'name' => 'Boxicons'],
    ]);

    InMemoryDB::seedTypes($this->pdo, [
        ['id' => 1, 'type' => 'outlined'],
        ['id' => 2, 'type' => 'filled'],
        ['id' => 3, 'type' => 'twotone'],
    ]);

    InMemoryDB::seedIcons($this->pdo, [
        ['name' => 'arrow-left', 'type_id' => 1, 'tags' => 'arrow,left,direction', 'library_id' => 1, 'filename' => 'antd-arrow-left'],
        ['name' => 'arrow-right', 'type_id' => 1, 'tags' => 'arrow,right,direction', 'library_id' => 1, 'filename' => 'antd-arrow-right'],
        ['name' => 'arrow-up', 'type_id' => 2, 'tags' => 'arrow,up', 'library_id' => 1, 'filename' => 'antd-arrow-up'],
        ['name' => 'home', 'type_id' => 2, 'tags' => 'house,building', 'library_id' => 2, 'filename' => 'bx-home'],
        ['name' => 'star', 'type_id' => 3, 'tags' => 'favorite,rating', 'library_id' => 2, 'filename' => 'bx-star'],
    ]);
});

afterEach(function () {
    InMemoryDB::teardown();
});

describe('Icons::getPaginated', function () {
    test('returns all icons without filters', function () {
        $result = Icons::getPaginated(1, 100);

        expect($result['total'])->toBe(5);
        expect($result['items'])->toHaveCount(5);
        expect($result['page'])->toBe(1);
        expect($result['total_pages'])->toBe(1);
    });

    test('paginates correctly', function () {
        $page1 = Icons::getPaginated(1, 2);

        expect($page1['items'])->toHaveCount(2);
        expect($page1['total'])->toBe(5);
        expect($page1['total_pages'])->toBe(3);
        expect($page1['page'])->toBe(1);

        $page2 = Icons::getPaginated(2, 2);

        expect($page2['items'])->toHaveCount(2);
        expect($page2['page'])->toBe(2);

        $page3 = Icons::getPaginated(3, 2);

        expect($page3['items'])->toHaveCount(1);
    });

    test('clamps page to valid range', function () {
        $result = Icons::getPaginated(999, 100);

        expect($result['page'])->toBe(1);
    });

    test('filters by library_id', function () {
        $result = Icons::getPaginated(1, 100, [1]);

        expect($result['total'])->toBe(3);
        expect($result['items'])->toHaveCount(3);

        foreach ($result['items'] as $item) {
            expect($item['library_id'])->toBe(1);
        }
    });

    test('filters by type_id', function () {
        $result = Icons::getPaginated(1, 100, [], [2]);

        expect($result['total'])->toBe(2);

        foreach ($result['items'] as $item) {
            expect($item['type_id'])->toBe(2);
        }
    });

    test('filters by both library_id and type_id', function () {
        $result = Icons::getPaginated(1, 100, [1], [1]);

        expect($result['total'])->toBe(2);

        foreach ($result['items'] as $item) {
            expect($item['library_id'])->toBe(1);
            expect($item['type_id'])->toBe(1);
        }
    });

    test('multiple library ids', function () {
        $result = Icons::getPaginated(1, 100, [1, 2]);

        expect($result['total'])->toBe(5);
    });

    test('non-existent filter returns empty', function () {
        $result = Icons::getPaginated(1, 100, [999]);

        expect($result['total'])->toBe(0);
        expect($result['items'])->toBe([]);
    });

    test('pagination works with filters', function () {
        $result = Icons::getPaginated(1, 2, [1]);

        expect($result['total'])->toBe(3);
        expect($result['items'])->toHaveCount(2);
        expect($result['total_pages'])->toBe(2);

        $page2 = Icons::getPaginated(2, 2, [1]);

        expect($page2['items'])->toHaveCount(1);
    });
});
