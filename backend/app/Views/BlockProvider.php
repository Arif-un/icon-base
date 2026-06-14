<?php

namespace IconBase\Views;

if (!\defined('ABSPATH')) {
    exit;
}

use IconBase\Config;
use IconBase\Deps\BitApps\WPKit\Hooks\Hooks;

final class BlockProvider
{
    public function __construct()
    {
        Hooks::addAction('init', [$this, 'registerBlocks']);
        Hooks::addAction('enqueue_block_editor_assets', [$this, 'enqueueBlockEditorData']);
    }

    public function registerBlocks()
    {
        $blockDir = Config::get('ROOT_DIR') . Config::ASSETS_FOLDER . '/blocks/icon';

        if (!file_exists($blockDir . '/block.json')) {
            return;
        }

        register_block_type($blockDir);
    }

    public function enqueueBlockEditorData()
    {
        $scriptHandle = 'icon-base-icon-editor-script';

        if (!wp_script_is($scriptHandle, 'registered')) {
            return;
        }

        wp_enqueue_media();

        $configData = Head::createConfigVariable();

        wp_add_inline_script(
            $scriptHandle,
            'window.' . Config::VAR_PREFIX . ' = ' . wp_json_encode($configData) . ';',
            'before'
        );
    }
}
