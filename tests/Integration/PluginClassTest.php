<?php

use Brain\Monkey\Functions;
use IconIndexa\Plugin;
use IconIndexa\HTTP\Middleware\NonceCheckerMiddleware;
use IconIndexa\HTTP\Middleware\AdminCheckerMiddleware;
use IconIndexa\HTTP\Middleware\EditorCheckerMiddleware;

beforeEach(function () {
    // Reset the singleton so load()/instance() start clean each test.
    $ref = new ReflectionProperty(Plugin::class, '_instance');
    $ref->setValue(null, null);

    Functions\when('register_activation_hook')->justReturn(null);
    Functions\when('register_deactivation_hook')->justReturn(null);
    Functions\when('register_uninstall_hook')->justReturn(null);
    Functions\when('plugin_basename')->alias(fn ($f) => basename((string) $f));
    Functions\when('plugin_dir_path')->justReturn('/var/www/plugins/icon-indexa/');
    Functions\when('sanitize_text_field')->alias(fn ($s) => trim(strip_tags((string) $s)));
    // db_version equals the shipped DB_VERSION so maybeMigrateDB never touches MigrationHelper.
    Functions\when('get_option')->justReturn('1.0.0');
});

afterEach(function () {
    $ref = new ReflectionProperty(Plugin::class, '_instance');
    $ref->setValue(null, null);
});

describe('Plugin::load / instance', function () {
    test('load builds the singleton once and returns true', function () {
        expect(Plugin::load())->toBeTrue();
        expect(Plugin::instance())->toBeInstanceOf(Plugin::class);
    });

    test('a second load is a no-op returning false', function () {
        Plugin::load();

        expect(Plugin::load())->toBeFalse();
    });

    test('construct registers the plugins_loaded action', function () {
        Plugin::load();

        expect(has_action('plugins_loaded'))->toBeTrue();
    });
});

describe('Plugin::middlewares / getMiddleware', function () {
    test('middlewares maps the nonce, isAdmin and isEditor aliases', function () {
        $middlewares = (new Plugin())->middlewares();

        expect($middlewares)->toBe([
            'nonce'    => NonceCheckerMiddleware::class,
            'isAdmin'  => AdminCheckerMiddleware::class,
            'isEditor' => EditorCheckerMiddleware::class,
        ]);
    });

    test('getMiddleware resolves a known middleware to an instance', function () {
        $plugin = new Plugin();

        expect($plugin->getMiddleware('nonce'))->toBeInstanceOf(NonceCheckerMiddleware::class);
        expect($plugin->getMiddleware('isAdmin'))->toBeInstanceOf(AdminCheckerMiddleware::class);
        expect($plugin->getMiddleware('isEditor'))->toBeInstanceOf(EditorCheckerMiddleware::class);
    });

    test('getMiddleware caches and returns the same instance', function () {
        $plugin = new Plugin();

        expect($plugin->getMiddleware('nonce'))->toBe($plugin->getMiddleware('nonce'));
    });

    test('getMiddleware returns false for an unknown name', function () {
        expect((new Plugin())->getMiddleware('does-not-exist'))->toBeFalse();
    });
});

describe('Plugin::loaded', function () {
    test('registers the init action and the plugin action links filter', function () {
        Functions\when('current_user_can')->justReturn(false);

        (new Plugin())->loaded();

        expect(has_action('init'))->toBeTrue();
        expect(has_filter('plugin_action_links_icon-indexa.php'))->toBeTrue();
    });
});

describe('Plugin::registerProviders', function () {
    test('registers admin providers on an admin request', function () {
        Functions\when('is_admin')->justReturn(true);

        Plugin::load();
        Plugin::instance()->registerProviders();

        // Layout registers admin_menu; HtmlTagModifier registers style_loader_tag; BlockProvider registers init.
        expect(has_action('admin_menu'))->toBeTrue();
        expect(has_filter('style_loader_tag'))->toBeTrue();
        expect(has_action('enqueue_block_editor_assets'))->toBeTrue();
    });

    test('skips admin-only providers on a non-admin request', function () {
        Functions\when('is_admin')->justReturn(false);

        Plugin::load();
        Plugin::instance()->registerProviders();

        // BlockProvider still runs (init), but the admin-only Layout menu is not registered.
        expect(has_action('enqueue_block_editor_assets'))->toBeTrue();
        expect(has_action('admin_menu'))->toBeFalse();
    });
});

describe('Plugin::maybeMigrateDB', function () {
    test('returns early when the user cannot manage options', function () {
        Functions\when('current_user_can')->justReturn(false);
        Functions\expect('get_option')->never();

        expect(Plugin::maybeMigrateDB())->toBeNull();
    });

    test('does not migrate when the stored db version is current', function () {
        Functions\when('current_user_can')->justReturn(true);
        Functions\when('get_option')->justReturn('1.0.0');

        // No exception: MigrationHelper is never reached because versions match.
        expect(Plugin::maybeMigrateDB())->toBeNull();
    });
});
