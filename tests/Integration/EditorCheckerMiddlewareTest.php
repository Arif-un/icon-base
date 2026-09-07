<?php

use Brain\Monkey\Functions;
use IconIndexa\HTTP\Middleware\EditorCheckerMiddleware;
use IconIndexa\Deps\BitApps\WPKit\Http\Response;

describe('EditorCheckerMiddleware::handle', function () {
    test('passes when user has edit_posts capability', function () {
        Functions\expect('current_user_can')
            ->once()
            ->with('edit_posts')
            ->andReturn(true);

        $result = (new EditorCheckerMiddleware())->handle();

        expect($result)->toBeTrue();
    });

    /**
     * The point of the separate middleware: an Author or Editor persisting their own
     * onboarding state must not be turned away for lacking manage_options.
     */
    test('does not require manage_options', function () {
        Functions\expect('current_user_can')
            ->once()
            ->with('edit_posts')
            ->andReturn(true);
        Functions\expect('current_user_can')
            ->never()
            ->with('manage_options');

        expect((new EditorCheckerMiddleware())->handle())->toBeTrue();
    });

    test('returns error response when capability is missing', function () {
        Functions\expect('current_user_can')
            ->once()
            ->with('edit_posts')
            ->andReturn(false);

        $result = (new EditorCheckerMiddleware())->handle();

        expect($result)->toBeInstanceOf(Response::class);
        expect(Response::getStatus())->toBe(Response::ERROR);
        expect(Response::getData())->toBe('You do not have permission to perform this action.');
        expect(Response::getHttpStatusCode())->toBe(400);
    });
});
