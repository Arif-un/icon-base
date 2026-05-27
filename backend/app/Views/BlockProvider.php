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
    }

    public function registerBlocks()
    {
        $blockDir = Config::get('ROOT_DIR') . Config::ASSETS_FOLDER . '/blocks/demo';

        if (!file_exists($blockDir . '/block.json')) {
            return;
        }

        register_block_type($blockDir);
    }
}
