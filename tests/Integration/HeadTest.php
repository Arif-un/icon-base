<?php

use Brain\Monkey\Functions;
use IconIndexa\Views\Head;

beforeEach(function () {
    unset($_ENV['ICON_INDEXA_DEV'], $_ENV['ICON_INDEXA_DEV_URL']);

    Functions\when('sanitize_text_field')->alias(fn ($str) => trim(strip_tags((string) $str)));

    // Config::get(...) dependencies (URLs, paths).
    Functions\when('plugins_url')->justReturn('https://example.com/wp-content/plugins/icon-indexa');
    Functions\when('set_url_scheme')->returnArg(1);
    Functions\when('home_url')->justReturn('https://example.com');
    Functions\when('wp_parse_url')->justReturn(['scheme' => 'https']);
    Functions\when('site_url')->justReturn('https://example.com');
    Functions\when('network_site_url')->justReturn('https://example.com');
    Functions\when('get_admin_url')->justReturn('https://example.com/wp-admin/');
    Functions\when('admin_url')->alias(fn ($p = '') => 'https://example.com/wp-admin/' . $p);
    Functions\when('get_rest_url')->justReturn('https://example.com/wp-json/IconIndexa/v1');
    Functions\when('wp_upload_dir')->justReturn(['basedir' => '/var/www/uploads', 'baseurl' => 'https://example.com/uploads']);
    Functions\when('is_multisite')->justReturn(false);
    Functions\when('get_locale')->justReturn('en_US');
    Functions\when('wp_timezone_string')->justReturn('UTC');
    Functions\when('wp_create_nonce')->justReturn('nonce-abc');
    Functions\when('get_option')->justReturn('');

    // Enqueue side-effect stubs. Counters let us assert branch behaviour without
    // mixing Functions\when() and Functions\expect() on the same function (which conflict).
    $GLOBALS['ib_enqueued_scripts'] = 0;
    $GLOBALS['ib_enqueued_media']   = 0;
    Functions\when('wp_enqueue_style')->justReturn(true);
    Functions\when('wp_localize_script')->justReturn(true);
    Functions\when('wp_script_is')->justReturn(false);
    Functions\when('wp_enqueue_script')->alias(function () {
        $GLOBALS['ib_enqueued_scripts']++;

        return true;
    });
    Functions\when('wp_enqueue_media')->alias(function () {
        $GLOBALS['ib_enqueued_media']++;

        return true;
    });

    // API_URL branch reads the permalink structure off the global $wp_rewrite.
    global $wp_rewrite;
    $wp_rewrite = new class {
        public $permalink_structure = '/%postname%/';
    };
});

afterEach(function () {
    unset($_ENV['ICON_INDEXA_DEV'], $_ENV['ICON_INDEXA_DEV_URL']);
});

describe('Head::addHeadScripts', function () {
    test('does nothing when the screen is not a plugin screen', function () {
        (new Head())->addHeadScripts('some-other-screen');

        expect($GLOBALS['ib_enqueued_scripts'])->toBe(0);
        expect($GLOBALS['ib_enqueued_media'])->toBe(0);
    });

    test('enqueues the dev HMR modules when DEV env is set', function () {
        $_ENV['ICON_INDEXA_DEV']     = 'true';
        $_ENV['ICON_INDEXA_DEV_URL'] = 'http://localhost:3000';

        (new Head())->addHeadScripts('toplevel_page_icon-indexa');

        // 3 dev module scripts get enqueued.
        expect($GLOBALS['ib_enqueued_scripts'])->toBe(3);
    });

    test('enqueues the built bundle in production mode', function () {
        $dir = sys_get_temp_dir() . '/ib_head_' . uniqid();
        mkdir($dir . '/assets', 0777, true);
        file_put_contents($dir . '/assets/build-code-name.txt', 'happy-code');
        Functions\when('plugin_dir_path')->justReturn($dir . '/');

        (new Head())->addHeadScripts('toplevel_page_icon-indexa');

        // Exactly one bundle script in production.
        expect($GLOBALS['ib_enqueued_scripts'])->toBe(1);

        unlink($dir . '/assets/build-code-name.txt');
        rmdir($dir . '/assets');
        rmdir($dir);
    });

    test('enqueues the media library when media-upload is not already present', function () {
        $_ENV['ICON_INDEXA_DEV'] = 'true';
        $_ENV['ICON_INDEXA_DEV_URL'] = 'http://localhost:3000';
        Functions\when('wp_script_is')->justReturn(false);

        (new Head())->addHeadScripts('toplevel_page_icon-indexa');

        expect($GLOBALS['ib_enqueued_media'])->toBe(1);
    });

    test('skips the media library when it is already loaded', function () {
        $_ENV['ICON_INDEXA_DEV'] = 'true';
        $_ENV['ICON_INDEXA_DEV_URL'] = 'http://localhost:3000';
        Functions\when('wp_script_is')->justReturn(true);

        (new Head())->addHeadScripts('toplevel_page_icon-indexa');

        expect($GLOBALS['ib_enqueued_media'])->toBe(0);
    });
});

describe('Head::createConfigVariable', function () {
    test('assembles the localized config with the expected keys', function () {
        $config = Head::createConfigVariable();

        expect($config)->toHaveKeys([
            'nonce', 'restNonce', 'rootURL', 'siteURL', 'assetsURL',
            'pluginAdminURL', 'ajaxURL', 'apiURL', 'routePrefix', 'pluginSlug', 'version', 'lang',
        ]);
        expect($config['nonce'])->toBe('nonce-abc');
        expect($config['pluginSlug'])->toBe('icon-indexa');
        expect($config['routePrefix'])->toBe('ICON_INDEXA_');
        expect($config['lang'])->toBe('en_US');
        expect($config)->not->toHaveKey('translations');
    });

    test('uses the network site url on multisite', function () {
        Functions\when('is_multisite')->justReturn(true);
        Functions\when('network_site_url')->justReturn('https://network.example.com');

        expect(Head::createConfigVariable()['siteBaseURL'])->toBe('https://network.example.com');
    });

    test('includes translations for a non-english locale when the file exists', function () {
        $dir = sys_get_temp_dir() . '/ib_head_tr_' . uniqid();
        mkdir($dir . '/languages', 0777, true);
        file_put_contents(
            $dir . '/languages/frontend-extracted-strings.php',
            "<?php return ['hello' => 'bonjour'];"
        );
        Functions\when('plugin_dir_path')->justReturn($dir . '/');
        Functions\when('get_locale')->justReturn('fr_FR');

        $config = Head::createConfigVariable();

        expect($config['translations'])->toBe(['hello' => 'bonjour']);

        unlink($dir . '/languages/frontend-extracted-strings.php');
        rmdir($dir . '/languages');
        rmdir($dir);
    });
});
