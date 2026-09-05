<?php

use Brain\Monkey\Functions;
use Brain\Monkey\Filters;
use IconIndexa\Views\Layout;

describe('Layout::__construct', function () {
    test('registers the admin header, menu and enqueue actions', function () {
        new Layout();

        expect(has_action('in_admin_header'))->toBeTrue();
        expect(has_action('admin_menu'))->toBeTrue();
        expect(has_action('admin_enqueue_scripts'))->toBeTrue();
    });
});

describe('Layout::sideBarMenuItem', function () {
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
