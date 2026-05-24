<?php

// use IconBase\IconBase as DB;
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
        $pluginOptions = [
            Config::withPrefix('db_version'),
            Config::withPrefix('installed'),
            Config::withPrefix('version'),
        ];

        DB::query(
            DB::prepare(
                'DELETE FROM `' . DB::wpPrefix() . 'options` WHERE option_name in ('
                . implode(
                    ',',
                    array_map(
                        function () {
                            return '%s';
                        },
                        $pluginOptions
                    )
                ) . ')',
                $pluginOptions
            )
        );
    }
}
