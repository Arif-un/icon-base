<?php

use Brain\Monkey\Functions;
use Tests\Helpers\WpStubs;
use IconIndexa\Views\BlockProvider;

describe('BlockProvider::__construct', function () {
    test('registers the init and block editor asset actions', function () {
        new BlockProvider();

        expect(has_action('init'))->toBeTrue();
        expect(has_action('enqueue_block_editor_assets'))->toBeTrue();
    });
});

describe('BlockProvider::registerBlocks', function () {
    afterEach(function () {
        Functions\when('plugin_dir_path')->justReturn('/no/such/dir/');
    });

    test('does not register a block when block.json is missing', function () {
        Functions\when('plugin_dir_path')->justReturn('/no/such/dir/');
        Functions\expect('register_block_type')->never();

        (new BlockProvider())->registerBlocks();
    });

    test('registers the block when block.json is present', function () {
        $dir = sys_get_temp_dir() . '/ib_block_' . uniqid();
        $blockDir = $dir . '/assets/blocks/icon';
        mkdir($blockDir, 0777, true);
        file_put_contents($blockDir . '/block.json', '{}');
        Functions\when('plugin_dir_path')->justReturn($dir . '/');

        Functions\expect('register_block_type')->once()->with($blockDir);

        (new BlockProvider())->registerBlocks();

        unlink($blockDir . '/block.json');
        rmdir($blockDir);
        rmdir($dir . '/assets/blocks');
        rmdir($dir . '/assets');
        rmdir($dir);
    });
});

describe('BlockProvider::enqueueBlockEditorData', function () {
    beforeEach(function () {
        WpStubs::config();
    });

    test('returns early when the editor script is not registered', function () {
        Functions\when('wp_script_is')->justReturn(false);
        Functions\expect('wp_add_inline_script')->never();

        (new BlockProvider())->enqueueBlockEditorData();
    });

    test('injects the config as an inline script when the editor script is registered', function () {
        Functions\when('wp_script_is')->justReturn(true);
        Functions\when('wp_enqueue_media')->justReturn(true);
        Functions\when('wp_json_encode')->alias(fn ($data) => json_encode($data));

        Functions\expect('wp_add_inline_script')
            ->once()
            ->with('icon-shelf-icon-editor-script', Mockery::type('string'), 'before');

        (new BlockProvider())->enqueueBlockEditorData();
    });
});
