<?php

namespace IconIndexa\Views;

if (!defined('ABSPATH')) {
    exit;
}

use IconIndexa\Config;
use IconIndexa\Deps\BitApps\WPKit\Hooks\Hooks;
use IconIndexa\Deps\BitApps\WPKit\Utils\Capabilities;

final class Layout
{
    public function __construct()
    {
        Hooks::addAction('in_admin_header', [$this, 'removeAdminNotices']);
        Hooks::addAction('admin_menu', [$this, 'sideBarMenuItem']);
        Hooks::addAction('admin_head', [$this, 'hideHomeSubmenu']);
        Hooks::addAction('admin_enqueue_scripts', [new Head(), 'addHeadScripts'], 0);
        Hooks::addAction('tool_box', [$this, 'renderToolBox']);
    }

    public function sideBarMenuItem()
    {
        $menus = Hooks::applyFilter(Config::withPrefix('admin_sidebar_menu'), Config::get('SIDE_BAR_MENU'));
        global $submenu;

        foreach ($menus as $menu) {
            if (isset($menu['capability']) && Capabilities::check($menu['capability'])) {
                if ($menu['type'] === 'menu') {
                    add_menu_page(
                        $menu['title'],
                        $menu['name'],
                        $menu['capability'],
                        $menu['slug'],
                        $menu['callback'],
                        $menu['icon'],
                        $menu['position']
                    );
                } elseif ($menu['type'] === 'submenu_page') {
                    add_submenu_page(
                        $menu['parent'],
                        $menu['title'],
                        $menu['name'],
                        $menu['capability'],
                        $menu['slug'],
                        $menu['callback']
                    );
                } else {
                    $submenu[$menu['parent']][] = [$menu['name'], $menu['capability'], 'admin.php?page=' . $menu['slug']];
                }
            }
        }
    }

    /**
     * The top-level menu link is routed through a hidden first submenu (see Menu::HomeLink)
     * so clicking "Icon Indexa" lands on the index page. Hide that duplicate row so the
     * plugin name is not listed twice in the sidebar.
     */
    public function hideHomeSubmenu()
    {
        $id = 'toplevel_page_' . Config::SLUG;

        // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped,Generic.PHP.ForbiddenFunctions.FoundWithAlternative -- Static CSS, slug is a constant.
        echo '<style>#' . esc_attr($id) . ' .wp-submenu li:has(> a.wp-first-item){display:none}</style>';
    }

    /**
     * Adds an Icon Indexa card to the Tools page body (the "Available Tools" list),
     * which is driven by the tool_box action, not by the admin submenu.
     */
    public function renderToolBox()
    {
        if (!Capabilities::check('manage_options')) {
            return;
        }

        $html = sprintf(
            '<div class="card"><h2 class="title">%1$s</h2><p>%2$s <a class="button button-primary" href="%3$s" style="margin-left:8px">%4$s</a></p></div>',
            esc_html(Config::TITLE),
            esc_html__('Browse and manage your icon library.', 'icon-indexa'),
            esc_url(admin_url('tools.php?page=' . Config::SLUG)),
            esc_html__('Open Icon Indexa', 'icon-indexa')
        );

        // phpcs:ignore Generic.PHP.ForbiddenFunctions.FoundWithAlternative -- Output is fully escaped above.
        echo $html;
    }

    public function removeAdminNotices()
    {
        global $plugin_page;

        if (empty($plugin_page) || strpos($plugin_page, Config::SLUG) === false) {
            return;
        }

        remove_all_actions('admin_notices');
        remove_all_actions('all_admin_notices');
    }
}
