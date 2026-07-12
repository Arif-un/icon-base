<?php

use Brain\Monkey\Functions;
use IconBase\HTTP\Middleware\NonceCheckerMiddleware;
use IconBase\Deps\BitApps\WPKit\Http\Request\Request;
use IconBase\Deps\BitApps\WPKit\Http\Response;

beforeEach(function () {
    unset($_SERVER['HTTP_X_ICON_BASE_NONCE']);

    Functions\when('sanitize_text_field')->alias(function ($str) {
        return trim(strip_tags((string) $str));
    });
    Functions\when('wp_unslash')->alias(function ($value) {
        return $value;
    });
});

afterEach(function () {
    unset($_SERVER['HTTP_X_ICON_BASE_NONCE']);
});

describe('NonceCheckerMiddleware::handle', function () {
    test('passes when header nonce is valid', function () {
        $_SERVER['HTTP_X_ICON_BASE_NONCE'] = 'valid-header-nonce';

        Functions\expect('wp_verify_nonce')
            ->once()
            ->with('valid-header-nonce', 'ICON_BASE_nonce')
            ->andReturn(1);

        $request = Mockery::mock(Request::class);
        $request->shouldNotReceive('get');

        $result = (new NonceCheckerMiddleware())->handle($request);

        expect($result)->toBeTrue();
    });

    test('falls back to request _nonce when header absent', function () {
        Functions\expect('wp_verify_nonce')
            ->once()
            ->with('valid-body-nonce', 'ICON_BASE_nonce')
            ->andReturn(1);

        $request = Mockery::mock(Request::class);
        $request->shouldReceive('get')->with('_nonce')->andReturn('valid-body-nonce');

        $result = (new NonceCheckerMiddleware())->handle($request);

        expect($result)->toBeTrue();
    });

    test('casts null request _nonce to empty string without error', function () {
        Functions\expect('wp_verify_nonce')
            ->once()
            ->with('', 'ICON_BASE_nonce')
            ->andReturn(false);

        $request = Mockery::mock(Request::class);
        $request->shouldReceive('get')->with('_nonce')->andReturn(null);

        $result = (new NonceCheckerMiddleware())->handle($request);

        expect($result)->toBeInstanceOf(Response::class);
        expect(Response::getStatus())->toBe(Response::ERROR);
        expect(Response::getData())->toBe('Nonce verification failed.');
    });

    test('returns error response when nonce is invalid', function () {
        $_SERVER['HTTP_X_ICON_BASE_NONCE'] = 'bad-nonce';

        Functions\expect('wp_verify_nonce')
            ->once()
            ->with('bad-nonce', 'ICON_BASE_nonce')
            ->andReturn(false);

        $request = Mockery::mock(Request::class);

        $result = (new NonceCheckerMiddleware())->handle($request);

        expect($result)->toBeInstanceOf(Response::class);
        expect(Response::getStatus())->toBe(Response::ERROR);
        expect(Response::getData())->toBe('Nonce verification failed.');
        expect(Response::getHttpStatusCode())->toBe(400);
    });

    test('header nonce takes precedence over request _nonce', function () {
        $_SERVER['HTTP_X_ICON_BASE_NONCE'] = 'header-nonce';

        Functions\expect('wp_verify_nonce')
            ->once()
            ->with('header-nonce', 'ICON_BASE_nonce')
            ->andReturn(1);

        $request = Mockery::mock(Request::class);
        $request->shouldNotReceive('get');

        $result = (new NonceCheckerMiddleware())->handle($request);

        expect($result)->toBeTrue();
    });
});
