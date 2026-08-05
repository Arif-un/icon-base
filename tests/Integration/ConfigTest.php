<?php

use IconIndexa\Config;
use Brain\Monkey\Functions;

test('slug constant is icon-indexa', function () {
    expect(Config::SLUG)->toBe('icon-indexa');
});

test('version constant is set', function () {
    expect(Config::VERSION)->not->toBeEmpty();
});

test('withPrefix prepends var prefix', function () {
    expect(Config::withPrefix('test'))->toBe('ICON_INDEXA_test');
});

test('rest namespace is IconIndexa', function () {
    expect(Config::REST_NAMESPACE)->toBe('IconIndexa');
});

test('db version is semver format', function () {
    expect(Config::DB_VERSION)->toMatch('/^\d+\.\d+\.\d+$/');
});

test('data version is semver format', function () {
    expect(Config::DATA_VERSION)->toMatch('/^\d+\.\d+\.\d+$/');
});

test('DATA_SOURCE points at the bundled ib.json inside the plugin', function () {
    Functions\when('plugin_dir_path')->justReturn('/var/www/plugins/icon-indexa/');

    expect(Config::get('DATA_SOURCE'))
        ->toBe('/var/www/plugins/icon-indexa/backend' . DIRECTORY_SEPARATOR . 'data' . DIRECTORY_SEPARATOR . 'ib.json');
});

test('RUNTIME_DB_DIR lives under the writable uploads dir, not the plugin dir', function () {
    Functions\when('wp_upload_dir')->justReturn(['basedir' => '/var/www/uploads', 'baseurl' => 'https://example.com/uploads']);

    expect(Config::get('RUNTIME_DB_DIR'))
        ->toBe('/var/www/uploads' . DIRECTORY_SEPARATOR . 'icon-indexa');
});

test('RUNTIME_DB_PATH is ib.db inside RUNTIME_DB_DIR', function () {
    Functions\when('wp_upload_dir')->justReturn(['basedir' => '/var/www/uploads', 'baseurl' => 'https://example.com/uploads']);

    expect(Config::get('RUNTIME_DB_PATH'))
        ->toBe('/var/www/uploads' . DIRECTORY_SEPARATOR . 'icon-indexa' . DIRECTORY_SEPARATOR . 'ib.db');
});

test('withDBPrefix includes wpdb prefix', function () {
    Functions\expect('get_option')->andReturn(false);
    $result = Config::withPrefix('icons');

    expect($result)->toBe('ICON_INDEXA_icons');
});
