<?php

namespace IconIndexa\Views;

if (!defined('ABSPATH')) {
    exit;
}

use IconIndexa\Config;
use IconIndexa\Deps\BitApps\WPKit\Hooks\Hooks;
use IconIndexa\Deps\BitApps\WPKit\Utils\Capabilities;
use IconIndexa\Services\SQLiteDB;

// The whole plugin reads from a runtime-generated SQLite db via PDO. WordPress core only requires
// mysqli, so on hosts without pdo_sqlite every icon request fails. Warn admins up front instead of
// leaving them with an empty, silently-broken UI. Rendered on in_admin_header (not admin_notices)
// so it survives Layout::removeAdminNotices() on the plugin's own page.
final class SqliteNotice
{
    public function __construct()
    {
        Hooks::addAction('in_admin_header', [$this, 'render']);
    }

    public function render()
    {
        if (SQLiteDB::isSupported() || !Capabilities::check('manage_options')) {
            return;
        }

        // Scope to the plugin's own admin pages: in_admin_header fires on every wp-admin screen, but
        // this pdo_sqlite warning is only actionable where icons are managed. Mirrors the plugin-page
        // detection in Layout::removeAdminNotices ($plugin_page holds the current page slug here).
        global $plugin_page;
        if (empty($plugin_page) || strpos($plugin_page, Config::SLUG) === false) {
            return;
        }

        $message = sprintf(
            /* translators: %s: plugin name */
            esc_html__(
                '%s needs the PHP SQLite extension (pdo_sqlite), which is not enabled on this server. Icons will not load until it is enabled. Please ask your hosting provider to enable pdo_sqlite.',
                'icon-indexa'
            ),
            esc_html(Config::TITLE)
        );

        // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped,Generic.PHP.ForbiddenFunctions.FoundWithAlternative -- Message is fully escaped above.
        echo '<div class="notice notice-error"><p>' . $message . '</p></div>';
    }
}
