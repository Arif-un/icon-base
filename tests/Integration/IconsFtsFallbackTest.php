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
        ['name' => 'arrow-left', 'type_id' => 1, 'tags' => 'arrow,left', 'library_id' => 1, 'filename' => 'antd-arrow-left'],
        ['name' => 'arrow-right', 'type_id' => 1, 'tags' => 'arrow,right', 'library_id' => 1, 'filename' => 'antd-arrow-right'],
        ['name' => 'home', 'type_id' => 1, 'tags' => 'house', 'library_id' => 1, 'filename' => 'antd-home'],
    ]);
});

afterEach(function () {
    InMemoryDB::teardown();
});

describe('Icons::search FTS failure fallback', function () {
    test('falls back to fuzzy matching when the FTS query throws', function () {
        // Simulate a corrupt / missing FTS index: the MATCH query will raise a PDOException,
        // which search() must catch and recover from via the fuzzy fallback path.
        $this->pdo->exec('DROP TRIGGER IF EXISTS icons_au');
        $this->pdo->exec('DROP TRIGGER IF EXISTS icons_ai');
        $this->pdo->exec('DROP TRIGGER IF EXISTS icons_ad');
        $this->pdo->exec('DROP TABLE icons_fts');

        $result = Icons::search('arrow', 1, 100);

        $names = array_column($result['items'], 'name');

        expect($names)->toContain('arrow-left');
        expect($names)->toContain('arrow-right');
        // 'home' scores below the threshold for the query "arrow" and is filtered out.
        expect($names)->not->toContain('home');
    });

    test('applies id filters while in the fuzzy fallback path', function () {
        InMemoryDB::seedLibraries($this->pdo, [
            ['id' => 2, 'slug' => 'boxicons', 'name' => 'Boxicons'],
        ]);
        InMemoryDB::seedIcons($this->pdo, [
            ['name' => 'arrow-up', 'type_id' => 1, 'tags' => 'arrow,up', 'library_id' => 2, 'filename' => 'bx-arrow-up'],
        ]);

        $this->pdo->exec('DROP TRIGGER IF EXISTS icons_au');
        $this->pdo->exec('DROP TRIGGER IF EXISTS icons_ai');
        $this->pdo->exec('DROP TRIGGER IF EXISTS icons_ad');
        $this->pdo->exec('DROP TABLE icons_fts');

        // Fuzzy fallback runs with a library filter, exercising the bound-id path.
        $result = Icons::search('arrow', 1, 100, [1]);

        $libraryIds = array_column($result['items'], 'library_id');

        expect($libraryIds)->not->toBeEmpty();
        expect(array_unique($libraryIds))->toBe([1]);
    });
});

describe('Icons::search multi-word scoring', function () {
    test('scores individual words of a multi-word field on a typo query', function () {
        // A spaced name forces scoreField into its per-word token loop, and a typo query
        // ("arow") produces no FTS matches so the fuzzy fallback supplies the candidate.
        InMemoryDB::seedIcons($this->pdo, [
            ['name' => 'arrow up', 'type_id' => 1, 'tags' => 'direction', 'library_id' => 1, 'filename' => 'antd-arrow-up-spaced'],
        ]);

        $result = Icons::search('arow', 1, 100);

        expect(array_column($result['items'], 'name'))->toContain('arrow up');
    });
});
