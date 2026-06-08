<?php

use IconBase\Config;
use Brain\Monkey\Functions;

test('slug constant is icon-base', function () {
    expect(Config::SLUG)->toBe('icon-base');
});

test('version constant is set', function () {
    expect(Config::VERSION)->not->toBeEmpty();
});

test('withPrefix prepends var prefix', function () {
    expect(Config::withPrefix('test'))->toBe('ICON_BASE_test');
});

test('rest namespace is IconBase', function () {
    expect(Config::REST_NAMESPACE)->toBe('IconBase');
});

test('db version is semver format', function () {
    expect(Config::DB_VERSION)->toMatch('/^\d+\.\d+\.\d+$/');
});

test('withDBPrefix includes wpdb prefix', function () {
    Functions\expect('get_option')->andReturn(false);
    $result = Config::withPrefix('icons');

    expect($result)->toBe('ICON_BASE_icons');
});
