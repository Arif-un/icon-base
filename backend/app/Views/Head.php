<?php

namespace IconBase\Views;

if (!defined('ABSPATH')) {
    exit;
}

use IconBase\Config;
use IconBase\Deps\BitApps\WPKit\Helpers\DateTimeHelper;

class Head
{
    public function addHeadScripts($currentScreen)
    {
        if (strpos($currentScreen, Config::SLUG) === false) {
            return;
        }

        $version  = Config::VERSION;
        $slug     = Config::SLUG;
        $codeName = Config::get('BUILD_CODE_NAME');

        wp_enqueue_style($slug . '-font', Config::get('ASSET_URI') . '/fonts/inter.css', [], $version);

        if (Config::getEnv('DEV')) {
            // phpcs:ignore WordPress.WP.EnqueuedResourceParameters.MissingVersion -- Dev-only HMR module served by Vite; version query would break the dev server URL.
            wp_enqueue_script($slug . '-vite-client-helper-MODULE', Config::getEnv('DEV_URL') . '/src/config/devHotModule.js', [], null, true);
            // phpcs:ignore WordPress.WP.EnqueuedResourceParameters.MissingVersion -- Dev-only HMR module served by Vite; version query would break the dev server URL.
            wp_enqueue_script($slug . '-vite-client-MODULE', Config::getEnv('DEV_URL') . '/@vite/client', [], null, true);
            // phpcs:ignore WordPress.WP.EnqueuedResourceParameters.MissingVersion -- Dev-only HMR module served by Vite; version query would break the dev server URL.
            wp_enqueue_script($slug . '-index-MODULE', Config::getEnv('DEV_URL') . '/src/main.tsx', [], null, true);
        } else {
            wp_enqueue_script($slug . '-index-MODULE', Config::get('ASSET_URI') . "/main-{$codeName}.js", [], $version, true);
            wp_enqueue_style($slug . '-styles', Config::get('ASSET_URI') . "/main-{$slug}-ba-assets-{$codeName}.css", null, $version, 'screen');
        }

        wp_localize_script(Config::SLUG . '-index-MODULE', Config::VAR_PREFIX, self::createConfigVariable());

        if (!wp_script_is('media-upload')) {
            wp_enqueue_media();
        }
    }

    public static function createConfigVariable()
    {
        $frontendVars = apply_filters(
            // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.DynamicHooknameFound -- Hook name is prefixed at runtime via Config::withPrefix() (ICON_BASE_).
            Config::withPrefix('localized_script'),
            [
                'nonce'          => wp_create_nonce(Config::withPrefix('nonce')),
                'restNonce'      => wp_create_nonce('wp_rest'),
                'rootURL'        => Config::get('ROOT_URI'),
                'siteURL'        => Config::get('SITE_URL'),
                'siteBaseURL'    => is_multisite() ? network_site_url() : site_url(),
                'assetsURL'      => Config::get('ASSET_URI'),
                'pluginAdminURL' => get_admin_url(null, 'admin.php?page=' . Config::SLUG . '#'),
                'redirectUri'    => Config::get('REDIRECT_URI'),
                'ajaxURL'        => admin_url('admin-ajax.php'),
                'apiURL'         => Config::get('API_URL'),
                'routePrefix'    => Config::VAR_PREFIX,
                'settings'       => Config::getOption('settings'),
                'dateFormat'     => Config::getOption('date_format', false, true),
                'timeFormat'     => Config::getOption('time_format', false, true),
                'timeZone'       => DateTimeHelper::wp_timezone_string(),
                'pluginSlug'     => Config::SLUG,
                'uploadBaseUrl'  => Config::get('UPLOAD_BASE_URL'),
                'version'        => Config::VERSION,
                'lang'           => get_locale(),
            ]
        );

        if (get_locale() !== 'en_US' && file_exists(Config::get('ROOT_DIR') . '/languages/frontend-extracted-strings.php')) {
            $frontendVars['translations'] = include Config::get('ROOT_DIR') . '/languages/frontend-extracted-strings.php';
        }

        return $frontendVars;
    }
}
