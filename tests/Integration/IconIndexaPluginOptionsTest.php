<?php

use Brain\Monkey\Functions;
use IconIndexa\Config;

// The migration class has no namespace, so it isn't PSR-4 autoloaded; require it explicitly.
require_once dirname(__DIR__, 2) . '/backend/db/Migrations/IconIndexaPluginOptions.php';

/*
 * Covers IconIndexaPluginOptions::down() (uninstall): it must delete the plugin options — including
 * the new data_version option — and remove the generated SQLite db from the uploads dir via
 * WP_Filesystem (never touching the plugin dir).
 */

beforeEach(function () {
    Functions\when('wp_upload_dir')->justReturn(['basedir' => '/var/www/uploads', 'baseurl' => 'https://example.com/u']);
});

afterEach(function () {
    unset($GLOBALS['wp_filesystem']);
});

test('deletes every plugin option, including data_version', function () {
    $deleted = [];
    Functions\when('delete_option')->alias(function ($name) use (&$deleted) {
        $deleted[] = $name;

        return true;
    });

    // A directory-less filesystem so removeRuntimeDb() short-circuits.
    $fs = Mockery::mock();
    $fs->shouldReceive('is_dir')->andReturn(false);
    $GLOBALS['wp_filesystem'] = $fs;

    (new IconIndexaPluginOptions())->down();

    expect($deleted)->toContain(
        'ICON_INDEXA_db_version',
        'ICON_INDEXA_data_version',
        'ICON_INDEXA_installed',
        'ICON_INDEXA_version'
    );
});

test('removes the generated db directory when it exists', function () {
    Functions\when('delete_option')->justReturn(true);

    $fs = Mockery::mock();
    $fs->shouldReceive('is_dir')->with('/var/www/uploads' . DIRECTORY_SEPARATOR . 'icon-indexa')->andReturn(true);
    $fs->shouldReceive('rmdir')
        ->once()
        ->with('/var/www/uploads' . DIRECTORY_SEPARATOR . 'icon-indexa', true)
        ->andReturn(true);
    $GLOBALS['wp_filesystem'] = $fs;

    (new IconIndexaPluginOptions())->down();

    // Mockery's ->once() expectation is verified on teardown.
    expect(true)->toBeTrue();
});

test('does not attempt removal when the db directory is absent', function () {
    Functions\when('delete_option')->justReturn(true);

    $fs = Mockery::mock();
    $fs->shouldReceive('is_dir')->andReturn(false);
    $fs->shouldNotReceive('rmdir');
    $GLOBALS['wp_filesystem'] = $fs;

    (new IconIndexaPluginOptions())->down();

    expect(true)->toBeTrue();
});
