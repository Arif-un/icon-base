<?php

namespace IconIndexa;

use IconIndexa\src\Menu;
use IconIndexa\Views\Body;
use IconIndexa\Views\PluginPageActions;

if (! defined('ABSPATH')) {
    exit;
}

class Config
{
    public const SLUG = 'icon-indexa';

    public const REST_NAMESPACE = 'IconIndexa';

    public const TITLE = 'Icon Indexa';

    public const VAR_PREFIX = 'ICON_INDEXA_';

    public const VERSION = '1.0.0';

    public const DB_VERSION = '1.0.0';

    // Bundled icon dataset version. Bump whenever backend/data/ib.json changes so installed
    // sites rebuild their generated SQLite db from the shipped JSON. See RUNTIME_DB_PATH.
    public const DATA_VERSION = '1.0.0';

    // Onboarding/welcome-wizard revision. Bump to re-show the wizard and guides to every user
    // after a release that adds features worth re-introducing. Deliberately independent of
    // self::VERSION, which is not bumped by scripts/release.mjs and has drifted from the header.
    public const ONBOARDING_VERSION = 1;

    public const REQUIRED_PHP_VERSION = '7.4';

    public const REQUIRED_WP_VERSION = '5.0';

    public const API_VERSION = '1.0';

    public const APP_BASE = '../../' . self::SLUG . '.php';

    public const CLASS_PREFIX = 'IconIndexa';

    public const ASSETS_FOLDER = 'assets';

    public static function get($type, $default = null)
    {
        switch ($type) {
            case 'MAIN_FILE':
                return realpath(__DIR__ . DIRECTORY_SEPARATOR . self::APP_BASE);

            case 'BASENAME':
                return plugin_basename(trim(self::get('MAIN_FILE')));

            case 'ROOT_DIR':
                return plugin_dir_path(self::get('MAIN_FILE'));

            case 'BASEDIR':
                return self::get('ROOT_DIR') . 'backend';

            case 'DATA_SOURCE':
                return self::get('BASEDIR') . DIRECTORY_SEPARATOR . 'data' . DIRECTORY_SEPARATOR . 'ib.json';

            case 'RUNTIME_DB_DIR':
                // Writable location for the generated SQLite db. Never write inside the plugin dir.
                return self::get('UPLOAD_BASE_DIR') . DIRECTORY_SEPARATOR . self::SLUG;

            case 'RUNTIME_DB_PATH':
                return self::get('RUNTIME_DB_DIR') . DIRECTORY_SEPARATOR . 'ib.db';

            case 'UPLOAD_BASE_URL':
                return wp_upload_dir()['baseurl'];

            case 'UPLOAD_BASE_DIR':
                return wp_upload_dir()['basedir'];

            case 'SITE_URL':
                return site_url();

            case 'ADMIN_URL':
                return str_replace(self::get('SITE_URL'), '', get_admin_url());

            case 'API_URL':
                global $wp_rewrite;

                return [
                    'base'      => get_rest_url(null, self::REST_NAMESPACE . '/v1'),
                    'separator' => $wp_rewrite->permalink_structure ? '?' : '&',
                ];

            case 'ROOT_URI':
                return set_url_scheme(plugins_url('', self::get('MAIN_FILE')), wp_parse_url(home_url())['scheme']);

            case 'ASSET_URI':
                return self::get('ROOT_URI') . '/' . self::ASSETS_FOLDER;

            case 'PLUGIN_PAGE_LINKS':
                return (new PluginPageActions())->getActionLinks();

            case 'SIDE_BAR_MENU':
                return Menu::getSideBarMenu(new Body());

            case 'BUILD_CODE_NAME':
                if (self::isDevMode()) {
                    return '';
                }

                $codeNameFile = self::get('ROOT_DIR') . self::ASSETS_FOLDER . '/build-code-name.txt';

                // Guard + trim: a missing file makes file_get_contents return false (asset URLs
                // become main-.js/404) and a trailing newline would corrupt the enqueued URL.
                // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- local plugin file read, not a remote URL.
                return is_readable($codeNameFile) ? trim((string) file_get_contents($codeNameFile)) : '';

            case 'WP_DB_PREFIX':
                global $wpdb;

                return $wpdb->prefix;

            case 'REDIRECT_URI':
                $isPlainPermalink = get_option('permalink_structure') === '';

                if ($isPlainPermalink) {
                    return self::get('SITE_URL') . '/?pagename=' . self::SLUG . '-oauth-callback';
                }

                return self::get('SITE_URL') . '/' . Config::SLUG . '/oauth-callback/';

            default:
                return $default;
        }
    }

    public static function withPrefix($option)
    {
        return self::VAR_PREFIX . $option;
    }

    public static function withDBPrefix($table)
    {
        return self::get('WP_DB_PREFIX') . self::withPrefix($table);
    }

    public static function getOption($option, $default = false, $wp = false)
    {
        if ($wp) {
            return get_option($option, $default);
        }

        return get_option(self::withPrefix($option), $default);
    }

    public static function addOption($option, $value, $autoload = false)
    {
        return add_option(self::withPrefix($option), $value, '', $autoload ? 'yes' : 'no');
    }

    public static function updateOption($option, $value, $autoload = null)
    {
        return update_option(self::withPrefix($option), $value, \is_null($autoload) ? null : 'yes');
    }

    public static function deleteOption($option)
    {
        return delete_option(self::withPrefix($option));
    }

    public static function getUserMeta($key, $userId = 0, $default = [])
    {
        $userId = $userId ?: get_current_user_id();

        if (!$userId) {
            return $default;
        }

        $value = get_user_meta($userId, self::withPrefix($key), true);

        return $value === '' ? $default : $value;
    }

    public static function updateUserMeta($key, $value, $userId = 0)
    {
        $userId = $userId ?: get_current_user_id();

        if (!$userId) {
            return false;
        }

        return update_user_meta($userId, self::withPrefix($key), $value);
    }

    public static function getEnv($keyName)
    {
        return isset($_ENV[Config::VAR_PREFIX . $keyName]) ? sanitize_text_field($_ENV[Config::VAR_PREFIX . $keyName]) : false;
    }

    /**
     * Dev mode (Vite HMR from a remote DEV_URL, see Head.php) is honored only on a non-production
     * environment, so a stray or attacker-written .env on a live site can't flip the plugin into
     * loading scripts from an attacker-controlled origin. wp_get_environment_type() is WP 5.5+; on
     * an older floor (or if missing) we fail safe to production and dev mode stays off.
     */
    public static function isDevMode(): bool
    {
        return (bool) self::getEnv('DEV')
            && function_exists('wp_get_environment_type')
            && wp_get_environment_type() !== 'production';
    }
}
