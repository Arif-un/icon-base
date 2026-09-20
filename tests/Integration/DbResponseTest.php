<?php

use IconIndexa\HTTP\Controllers\DbResponse;
use IconIndexa\Deps\BitApps\WPKit\Http\Response;

describe('DbResponse::guard', function () {
    test('returns success response with the read result', function () {
        $response = DbResponse::guard(static fn () => ['items' => [1, 2, 3]]);

        expect($response)->toBeInstanceOf(Response::class);
        expect(Response::getStatus())->toBe(Response::SUCCESS);
        expect(Response::getData())->toBe(['items' => [1, 2, 3]]);
    });

    test('converts a thrown throwable into a 500 error response instead of fataling', function () {
        $response = DbResponse::guard(static function () {
            throw new \RuntimeException('Icon Indexa: the PHP pdo_sqlite extension is required but not installed.');
        });

        expect($response)->toBeInstanceOf(Response::class);
        expect(Response::getStatus())->toBe(Response::ERROR);
        expect(Response::getHttpStatusCode())->toBe(500);
        expect(Response::getData())->toHaveKey('message');
    });

    test('catches PDOException from the data layer', function () {
        $response = DbResponse::guard(static function () {
            throw new \PDOException('no such table: icons');
        });

        expect(Response::getStatus())->toBe(Response::ERROR);
        expect(Response::getHttpStatusCode())->toBe(500);
    });
});
