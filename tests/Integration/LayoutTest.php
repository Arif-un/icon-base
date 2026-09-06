<?php

use Brain\Monkey\Functions;
use Brain\Monkey\Filters;
use IconIndexa\Views\Layout;

describe('Layout::__construct', function () {
    test('registers the admin header, menu and enqueue actions', function () {
        new Layout();

        expect(has_action('in_admin_header'))->toBeTrue();
        expect(has_action('admin_menu'))->toBeTrue();
        expect(has_action('admin_head'))->toBeTrue();
        expect(has_action('admin_enqueue_scripts'))->toBeTrue();
    });
});

describe('Layout::hideHomeSubmenu', function () {
    test('outputs CSS hiding the duplicate first submenu row of the plugin menu', function () {
        Functions\when('esc_attr')->returnArg();

        ob_start();
        (new Layout())->hideHomeSubmenu();
        $css = ob_get_clean();

        expect($css)->toContain('#toplevel_page_icon-indexa');
        expect($css)->toContain('a.wp-first-item');
        expect($css)->toContain('display:none');
    });

    test('wraps the rule in a style tag and scopes it to the submenu so the top-level link stays visible', function () {
        Functions\when('esc_attr')->returnArg();

        ob_start();
        (new Layout())->hideHomeSubmenu();
        $css = ob_get_clean();

        expect($css)->toStartWith('<style>');
        expect($css)->toEndWith('</style>');
        // Only the submenu row is hidden; the top-level anchor is outside .wp-submenu.
        expect($css)->toContain('.wp-submenu li');
    });
});

describe('Layout::sideBarMenuItem', function () {
    beforeEach(function () {
        // Menu reads the settings option and, with the sidebar shown, registers Settings + Tools submenus.
        Functions\when('get_option')->justReturn(false);
        Functions\when('add_submenu_page')->justReturn(null);
    });

    test('registers a top-level menu page when the user is capable', function () {
        Functions\when('current_user_can')->justReturn(true);

        Functions\expect('add_menu_page')
            ->once()
            ->with('Icon Indexa', 'Icon Indexa', 'manage_options', 'icon-indexa', Mockery::type('array'), Mockery::type('string'), '20');

        (new Layout())->sideBarMenuItem();
    });

    test('appends a submenu entry for a submenu-type item', function () {
        Functions\when('current_user_can')->justReturn(true);
        Filters\expectApplied('ICON_INDEXA_admin_sidebar_menu')->andReturn([
            [
                'type'       => 'submenu',
                'parent'     => 'icon-indexa',
                'name'       => 'Sub',
                'capability' => 'manage_options',
                'slug'       => 'icon-indexa-sub',
            ],
        ]);

        global $submenu;
        $submenu = [];

        (new Layout())->sideBarMenuItem();

        expect($submenu['icon-indexa'][0])->toBe(['Sub', 'manage_options', 'admin.php?page=icon-indexa-sub']);
    });

    test('skips menus the user is not capable of', function () {
        Functions\when('current_user_can')->justReturn(false);
        Functions\expect('add_menu_page')->never();

        (new Layout())->sideBarMenuItem();
    });
});

describe('Layout::renderToolBox', function () {
    test('outputs an Icon Indexa card linking to the plugin page for capable users', function () {
        Functions\when('current_user_can')->justReturn(true);
        Functions\when('admin_url')->alias(fn ($p) => 'http://example.test/wp-admin/' . $p);
        Functions\when('esc_html__')->returnArg();

        ob_start();
        (new Layout())->renderToolBox();
        $html = ob_get_clean();

        expect($html)->toContain('class="card"');
        expect($html)->toContain('href="http://example.test/wp-admin/tools.php?page=icon-indexa"');
        expect($html)->toContain('Icon Indexa');
    });

    test('renders nothing for users without manage_options', function () {
        Functions\when('current_user_can')->justReturn(false);

        ob_start();
        (new Layout())->renderToolBox();

        expect(ob_get_clean())->toBe('');
    });
});

describe('Layout::removeAdminNotices', function () {
    afterEach(function () {
        unset($GLOBALS['plugin_page']);
    });

    test('does nothing when not on a plugin page', function () {
        $GLOBALS['plugin_page'] = 'edit.php';
        Functions\expect('remove_all_actions')->never();

        (new Layout())->removeAdminNotices();
    });

    test('removes admin notices on a plugin page', function () {
        $GLOBALS['plugin_page'] = 'toplevel_page_icon-indexa';
        Functions\expect('remove_all_actions')->twice();

        (new Layout())->removeAdminNotices();
    });
});
