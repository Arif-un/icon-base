<?php

use Tests\Helpers\InMemoryDB;
use IconBase\HTTP\Controllers\IconTypeController;

beforeEach(function () {
    $this->pdo = InMemoryDB::setup();
});

afterEach(function () {
    InMemoryDB::teardown();
});

describe('IconTypeController::index', function () {
    test('returns all icon types', function () {
        InMemoryDB::seedTypes($this->pdo, [
            ['id' => 1, 'type' => 'outlined'],
            ['id' => 2, 'type' => 'filled'],
        ]);

        $controller = new IconTypeController();
        $response = $controller->index();

        expect($response)->not->toBeNull();
    });
});
