<?php

use Brain\Monkey\Functions;
use IconIndexa\Config;

beforeEach(function () {
    unset($_ENV['ICON_INDEXA_DEV']);

    Functions\when('sanitize_text_field')->alias(fn ($s) => trim(strip_tags((string) $s)));
    Functions\when('plugin_basename')->alias(fn ($f) => basename((string) $f));
    Functions\when('plugin_dir_path')->justReturn('/var/www/plugins/icon-indexa/');
    Functions\when('wp_upload_dir')->justReturn(['basedir' => '/var/www/uploads', 'baseurl' => 'https://example.com/uploads']);
    Functions\when('site_url')->justReturn('https://example.com');
    Functions\when('get_admin_url')->justReturn('https://example.com/wp-admin/');
    Functions\when('get_rest_url')->justReturn('https://example.com/wp-json/IconIndexa/v1');
    Functions\when('plugins_url')->justReturn('https://example.com/wp-content/plugins/icon-indexa');
    Functions\when('set_url_scheme')->returnArg(1);
    Functions\when('home_url')->justReturn('https://example.com');
    Functions\when('wp_parse_url')->justReturn(['scheme' => 'https']);
    Functions\when('admin_url')->alias(fn ($p = '') => 'https://example.com/wp-admin/' . $p);
    Functions\when('__')->returnArg(1);
});

afterEach(function () {
    unset($_ENV['ICON_INDEXA_DEV']);
});

describe('Config::get path resolution', function () {
    test('MAIN_FILE resolves to the plugin entry file', function () {
        expect(Config::get('MAIN_FILE'))->toEndWith('icon-indexa.php');
    });

    test('BASENAME is the plugin file basename', function () {
        expect(Config::get('BASENAME'))->toBe('icon-indexa.php');
    });

    test('ROOT_DIR is the plugin directory path', function () {
        expect(Config::get('ROOT_DIR'))->toBe('/var/www/plugins/icon-indexa/');
    });

    test('BASEDIR is the backend directory', function () {
        expect(Config::get('BASEDIR'))->toBe('/var/www/plugins/icon-indexa/backend');
    });

    test('UPLOAD_BASE_URL and UPLOAD_BASE_DIR come from wp_upload_dir', function () {
        expect(Config::get('UPLOAD_BASE_URL'))->toBe('https://example.com/uploads');
        expect(Config::get('UPLOAD_BASE_DIR'))->toBe('/var/www/uploads');
    });

    test('ASSET_URI appends the assets folder to the root uri', function () {
        expect(Config::get('ASSET_URI'))->toEndWith('/assets');
    });
});

describe('Config::get url helpers', function () {
    test('SITE_URL returns the site url', function () {
        expect(Config::get('SITE_URL'))->toBe('https://example.com');
    });

    test('ADMIN_URL strips the site url from the admin url', function () {
        expect(Config::get('ADMIN_URL'))->toBe('/wp-admin/');
    });

    test('API_URL uses the query separator for pretty permalinks', function () {
        global $wp_rewrite;
        $wp_rewrite = new class {
            public $permalink_structure = '/%postname%/';
        };

        expect(Config::get('API_URL')['separator'])->toBe('?');
    });

    test('API_URL uses the ampersand separator for plain permalinks', function () {
        global $wp_rewrite;
        $wp_rewrite = new class {
            public $permalink_structure = '';
        };

        expect(Config::get('API_URL')['separator'])->toBe('&');
    });
});

describe('Config::get REDIRECT_URI', function () {
    test('uses a pagename query for plain permalinks', function () {
        Functions\when('get_option')->justReturn('');

        expect(Config::get('REDIRECT_URI'))->toBe('https://example.com/?pagename=icon-indexa-oauth-callback');
    });

    test('uses a pretty path for pretty permalinks', function () {
        Functions\when('get_option')->justReturn('/%postname%/');

        expect(Config::get('REDIRECT_URI'))->toBe('https://example.com/icon-indexa/oauth-callback/');
    });
});

describe('Config::get BUILD_CODE_NAME', function () {
    test('returns an empty string in dev mode', function () {
        $_ENV['ICON_INDEXA_DEV'] = 'true';

        expect(Config::get('BUILD_CODE_NAME'))->toBe('');
    });

    test('reads the build code name file in production', function () {
        $dir = sys_get_temp_dir() . '/ib_cfg_' . uniqid();
        mkdir($dir . '/assets', 0777, true);
        file_put_contents($dir . '/assets/build-code-name.txt', 'happy-panda');
        Functions\when('plugin_dir_path')->justReturn($dir . '/');

        expect(Config::get('BUILD_CODE_NAME'))->toBe('happy-panda');

        unlink($dir . '/assets/build-code-name.txt');
        rmdir($dir . '/assets');
        rmdir($dir);
    });
});

describe('Config::get composite values', function () {
    test('WP_DB_PREFIX reads the wpdb prefix', function () {
        global $wpdb;
        $wpdb = new class {
            public $prefix = 'wp_';
        };

        expect(Config::get('WP_DB_PREFIX'))->toBe('wp_');
    });

    test('withDBPrefix combines the wpdb prefix and the var prefix', function () {
        global $wpdb;
        $wpdb = new class {
            public $prefix = 'wp_';
        };

        expect(Config::withDBPrefix('icons'))->toBe('wp_ICON_INDEXA_icons');
    });

    test('PLUGIN_PAGE_LINKS returns the plugin action links', function () {
        $links = Config::get('PLUGIN_PAGE_LINKS');

        expect($links)->toHaveCount(2);
        expect($links[0]['title'])->toBe('Settings');
    });

    test('SIDE_BAR_MENU returns the admin sidebar menu', function () {
        expect(Config::get('SIDE_BAR_MENU'))->toHaveKey('Home');
    });

    test('an unknown key returns the provided default', function () {
        expect(Config::get('TOTALLY_UNKNOWN', 'fallback'))->toBe('fallback');
    });
});
