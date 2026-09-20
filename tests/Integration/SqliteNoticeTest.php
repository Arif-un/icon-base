<?php

use IconIndexa\Services\SQLiteDB;
use IconIndexa\Views\SqliteNotice;

describe('SqliteNotice::render', function () {
    test('renders nothing when pdo_sqlite is available', function () {
        // The test runner requires pdo_sqlite, so isSupported() short-circuits before any
        // capability check and the admin notice must not be emitted.
        expect(SQLiteDB::isSupported())->toBeTrue();

        ob_start();
        (new SqliteNotice())->render();
        $html = ob_get_clean();

        expect($html)->toBe('');
    });
});
