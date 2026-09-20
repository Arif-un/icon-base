<?php

use Brain\Monkey\Functions;
use IconIndexa\Providers\HookProvider;

beforeEach(function () {
    // Point BASEDIR at the real plugin backend so hooks/api.php is readable.
    Functions\when('plugin_dir_path')->justReturn(\dirname(__DIR__, 2) . DIRECTORY_SEPARATOR);
});

describe('HookProvider::__construct', function () {
    test('registers the rest_api_init action and skips ajax on a non-ajax request', function () {
        new HookProvider();

        expect(has_action('rest_api_init'))->toBeTrue();
    });
});

describe('HookProvider::loadAppApiHooks', function () {
    test('does not register routes outside of a REST request', function () {
        // REST_REQUEST is undefined under test, so RequestType::is(API) is false and the
        // router include is skipped even though hooks/api.php is readable.
        $provider = new HookProvider();

        expect($provider->loadAppApiHooks())->toBeNull();
    });
});

describe('HookProvider::enforceRestPermission', function () {
    test('forces a manage_options permission_callback on this plugin\'s routes only', function () {
        $provider = new HookProvider();

        $endpoints = [
            '/IconIndexa/v1/settings' => [
                ['methods' => 'GET', 'permission_callback' => '__return_true'],
                ['methods' => 'POST', 'permission_callback' => '__return_true'],
            ],
            '/wp/v2/posts' => [
                ['methods' => 'GET', 'permission_callback' => '__return_true'],
            ],
        ];

        $result = $provider->enforceRestPermission($endpoints);

        // Foreign namespace is untouched.
        expect($result['/wp/v2/posts'][0]['permission_callback'])->toBe('__return_true');

        // Our routes get a real capability gate: it returns whatever current_user_can does.
        Functions\when('current_user_can')->justReturn(true);
        expect(($result['/IconIndexa/v1/settings'][0]['permission_callback'])())->toBeTrue();
        expect(($result['/IconIndexa/v1/settings'][1]['permission_callback'])())->toBeTrue();

        Functions\when('current_user_can')->justReturn(false);
        expect(($result['/IconIndexa/v1/settings'][0]['permission_callback'])())->toBeFalse();
    });

    test('leaves an endpoint entry without a permission_callback untouched', function () {
        $provider = new HookProvider();

        $endpoints = ['/IconIndexa/v1/icons' => [['methods' => 'GET']]];

        $result = $provider->enforceRestPermission($endpoints);

        expect($result['/IconIndexa/v1/icons'][0])->not->toHaveKey('permission_callback');
    });
});
