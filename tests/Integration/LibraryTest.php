<?php

use Tests\Helpers\InMemoryDB;
use IconIndexa\Models\Library;
use IconIndexa\HTTP\Controllers\LibraryController;
use IconIndexa\Deps\BitApps\WPKit\Http\Response;

beforeEach(function () {
    $this->pdo = InMemoryDB::setup();
});

afterEach(function () {
    InMemoryDB::teardown();
});

describe('Library::getAll', function () {
    test('returns all libraries ordered by id ascending', function () {
        InMemoryDB::seedLibraries($this->pdo, [
            ['id' => 2, 'slug' => 'boxicons', 'name' => 'Boxicons'],
            ['id' => 1, 'slug' => 'antd', 'name' => 'Ant Design'],
        ]);

        $result = Library::getAll();

        expect($result)->toHaveCount(2);
        expect($result[0]['id'])->toBe(1);
        expect($result[1]['id'])->toBe(2);
    });

    test('returns an empty array when no libraries exist', function () {
        expect(Library::getAll())->toBe([]);
    });

    test('decodes the JSON meta column into an array', function () {
        $this->pdo->prepare('INSERT INTO library (id, slug, name, meta) VALUES (:id, :slug, :name, :meta)')
            ->execute([
                ':id'   => 1,
                ':slug' => 'antd',
                ':name' => 'Ant Design',
                ':meta' => json_encode(['author' => 'Ant', 'count' => 42]),
            ]);

        $result = Library::getAll();

        expect($result[0]['meta'])->toBe(['author' => 'Ant', 'count' => 42]);
    });

    test('leaves a null meta column untouched', function () {
        InMemoryDB::seedLibraries($this->pdo, [
            ['id' => 1, 'slug' => 'antd', 'name' => 'Ant Design'],
        ]);

        $result = Library::getAll();

        expect($result[0]['meta'])->toBeNull();
    });
});

describe('LibraryController::index', function () {
    test('wraps Library::getAll in a success response', function () {
        InMemoryDB::seedLibraries($this->pdo, [
            ['id' => 1, 'slug' => 'antd', 'name' => 'Ant Design'],
        ]);

        $response = (new LibraryController())->index();

        expect($response)->toBeInstanceOf(Response::class);
        expect(Response::getStatus())->toBe(Response::SUCCESS);
        expect(Response::getData())->toHaveCount(1);
        expect(Response::getData()[0]['slug'])->toBe('antd');
    });
});
