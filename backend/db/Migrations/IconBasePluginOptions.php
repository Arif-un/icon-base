<?php

use IconBase\Config;
use IconBase\Deps\BitApps\WPKit\Migration\Migration;

if (! defined('ABSPATH')) {
    exit;
}

final class IconBasePluginOptions extends Migration
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
        Config::deleteOption('data_version');
        Config::deleteOption('installed');
        Config::deleteOption('version');

        self::removeRuntimeDb();
    }

    /**
     * Delete the generated SQLite db and its uploads sub-directory for the current site.
     * Runs per-site during uninstall (the Installer switches blogs on multisite).
     */
    private static function removeRuntimeDb(): void
    {
        global $wp_filesystem;

        $dir = Config::get('RUNTIME_DB_DIR');

        if (empty($wp_filesystem)) {
            include_once ABSPATH . 'wp-admin/includes/file.php';
            WP_Filesystem();
        }

        if ($wp_filesystem && $wp_filesystem->is_dir($dir)) {
            $wp_filesystem->rmdir($dir, true);
        }
    }
}
