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
    ]);

    InMemoryDB::seedIcons($this->pdo, [
        ['name' => 'arrow-left', 'type_id' => 1, 'tags' => 'arrow,left,direction,navigate', 'library_id' => 1, 'filename' => 'antd-arrow-left'],
        ['name' => 'arrow-right', 'type_id' => 1, 'tags' => 'arrow,right,direction,navigate', 'library_id' => 1, 'filename' => 'antd-arrow-right'],
        ['name' => 'arrow-up', 'type_id' => 2, 'tags' => 'arrow,up,direction', 'library_id' => 1, 'filename' => 'antd-arrow-up'],
        ['name' => 'home', 'type_id' => 2, 'tags' => 'house,building,residence', 'library_id' => 2, 'filename' => 'bx-home'],
        ['name' => 'star', 'type_id' => 1, 'tags' => 'favorite,rating,bookmark', 'library_id' => 2, 'filename' => 'bx-star'],
        ['name' => 'heart', 'type_id' => 2, 'tags' => 'love,like,favorite', 'library_id' => 2, 'filename' => 'bx-heart'],
    ]);
});

afterEach(function () {
    InMemoryDB::teardown();
});

describe('Icons::search', function () {
    test('finds icons by name via FTS', function () {
        $result = Icons::search('arrow', 1, 100);

        expect($result['items'])->not->toBeEmpty();

        foreach ($result['items'] as $item) {
            expect($item['name'])->toContain('arrow');
        }
    });

    test('finds icons by tag via FTS', function () {
        $result = Icons::search('navigate', 1, 100);

        expect($result['items'])->not->toBeEmpty();
    });

    test('returns paginated structure', function () {
        $result = Icons::search('arrow', 1, 100);

        expect($result)->toHaveKeys(['items', 'total', 'page', 'per_page', 'total_pages']);
    });

    test('paginates search results', function () {
        $result = Icons::search('arrow', 1, 2);

        expect($result['per_page'])->toBe(2);
        expect($result['items'])->toHaveCount(2);
        expect($result['total'])->toBe(3);
        expect($result['total_pages'])->toBe(2);
    });

    test('filters search by library_id', function () {
        $result = Icons::search('arrow', 1, 100, [1]);

        foreach ($result['items'] as $item) {
            expect($item['library_id'])->toBe(1);
        }
    });

    test('filters search by type_id', function () {
        $result = Icons::search('arrow', 1, 100, [], [2]);

        expect($result['items'])->toHaveCount(1);
        expect($result['items'][0]['name'])->toBe('arrow-up');
    });

    test('filters search by both library and type', function () {
        $result = Icons::search('arrow', 1, 100, [1], [1]);

        expect($result['total'])->toBe(2);

        foreach ($result['items'] as $item) {
            expect($item['library_id'])->toBe(1);
            expect($item['type_id'])->toBe(1);
        }
    });

    test('no match returns empty', function () {
        $result = Icons::search('zzzznonexistent', 1, 100);

        expect($result['items'])->toBe([]);
        expect($result['total'])->toBe(0);
    });

    test('does not include _score in output', function () {
        $result = Icons::search('arrow', 1, 100);

        foreach ($result['items'] as $item) {
            expect($item)->not->toHaveKey('_score');
        }
    });

    test('exact name match ranks highest', function () {
        $result = Icons::search('home', 1, 100);

        expect($result['items'][0]['name'])->toBe('home');
    });

    test('falls back to getPaginated when query builds empty FTS', function () {
        $result = Icons::search('***', 1, 100);

        expect($result['total'])->toBe(6);
    });
});
