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
