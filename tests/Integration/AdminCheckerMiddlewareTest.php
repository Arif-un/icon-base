<?php

use Brain\Monkey\Functions;
use IconBase\HTTP\Middleware\AdminCheckerMiddleware;
use IconBase\Deps\BitApps\WPKit\Http\Response;

describe('AdminCheckerMiddleware::handle', function () {
    test('passes when user has manage_options capability', function () {
        Functions\expect('current_user_can')
            ->once()
            ->with('manage_options')
            ->andReturn(true);

        $result = (new AdminCheckerMiddleware())->handle();

        expect($result)->toBeTrue();
    });

    test('returns error response when capability is missing', function () {
        Functions\expect('current_user_can')
            ->once()
            ->with('manage_options')
            ->andReturn(false);

        $result = (new AdminCheckerMiddleware())->handle();

        expect($result)->toBeInstanceOf(Response::class);
        expect(Response::getStatus())->toBe(Response::ERROR);
        expect(Response::getData())->toBe('You do not have permission to perform this action.');
        expect(Response::getHttpStatusCode())->toBe(400);
    });
});
