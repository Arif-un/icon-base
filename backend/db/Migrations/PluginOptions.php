<?php

use IconBase\Config;
use IconBase\Deps\BitApps\WPKit\Migration\Migration;

if (! defined('ABSPATH')) {
    exit;
}

final class PluginOptions extends Migration
{
    public function up(): void
    {
        Config::updateOption('db_version', Config::DB_VERSION, true);
        Config::updateOption('installed', time(), true);
        Config::updateOption('version', Config::VERSION, true);
    }

    public function down(): void
    {
        Config::deleteOption('db_version');
        Config::deleteOption('installed');
        Config::deleteOption('version');
    }
}
