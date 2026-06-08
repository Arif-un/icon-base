<?php

use Brain\Monkey\Functions;
use Brain\Monkey\Actions;
use Brain\Monkey\Filters;
use IconBase\Config;

test('getOption calls get_option with prefix', function () {
    Functions\expect('get_option')
        ->once()
        ->with('ICON_BASE_db_version', false)
        ->andReturn('0.1.0');

    $result = Config::getOption('db_version');

    expect($result)->toBe('0.1.0');
});

test('getOption with wp flag skips prefix', function () {
    Functions\expect('get_option')
        ->once()
        ->with('siteurl', '')
        ->andReturn('https://example.com');

    $result = Config::getOption('siteurl', '', true);

    expect($result)->toBe('https://example.com');
});

test('addOption calls add_option with prefix', function () {
    Functions\expect('add_option')
        ->once()
        ->with('ICON_BASE_my_option', 'my_value', '', 'no')
        ->andReturn(true);

    $result = Config::addOption('my_option', 'my_value');

    expect($result)->toBeTrue();
});

test('updateOption calls update_option with prefix', function () {
    Functions\expect('update_option')
        ->once()
        ->with('ICON_BASE_my_option', 'new_value', null)
        ->andReturn(true);

    $result = Config::updateOption('my_option', 'new_value');

    expect($result)->toBeTrue();
});

test('deleteOption calls delete_option with prefix', function () {
    Functions\expect('delete_option')
        ->once()
        ->with('ICON_BASE_my_option')
        ->andReturn(true);

    $result = Config::deleteOption('my_option');

    expect($result)->toBeTrue();
});

test('getEnv returns sanitized env value', function () {
    $_ENV['ICON_BASE_DEV'] = 'true';

    Functions\expect('sanitize_text_field')
        ->once()
        ->with('true')
        ->andReturn('true');

    $result = Config::getEnv('DEV');

    expect($result)->toBe('true');

    unset($_ENV['ICON_BASE_DEV']);
});

test('getEnv returns false when env not set', function () {
    $result = Config::getEnv('NONEXISTENT');

    expect($result)->toBeFalse();
});
