<?php

use Brain\Monkey\Functions;
use IconIndexa\src\Menu;
use IconIndexa\Views\Body;

describe('Menu::getSideBarMenu', function () {
    test('shows the top-level menu, its Settings submenu, and the Tools entry when the toggle is on', function () {
        Functions\when('get_option')->justReturn(['showSidebarMenu' => true]);

        $menu = Menu::getSideBarMenu(new Body());

        expect($menu)->toHaveKeys(['Home', 'HomeLink', 'Settings', 'Tools']);
        expect($menu['Home']['type'])->toBe('menu');
        expect($menu['Settings']['slug'])->toBe('icon-indexa#/settings');
    });

    test('registers a hash-less Home submenu before Settings so the top-level link lands on the index page', function () {
        Functions\when('get_option')->justReturn(['showSidebarMenu' => true]);

        $menu = Menu::getSideBarMenu(new Body());

        // WP uses the first submenu's URL for the top-level link (menu-header.php).
        $submenuSlugs = array_column(
            array_filter($menu, fn ($m) => ($m['type'] ?? '') === 'submenu' && ($m['parent'] ?? '') === 'icon-indexa'),
            'slug'
        );
        expect($submenuSlugs[0])->toBe('icon-indexa');
        expect($menu['HomeLink']['slug'])->toBe('icon-indexa');
        expect(strpos($menu['HomeLink']['slug'], '#'))->toBeFalse();
    });

    test('hides the top-level menu and its submenu but always keeps the Tools entry when the toggle is off', function () {
        Functions\when('get_option')->justReturn(['showSidebarMenu' => false]);

        $menu = Menu::getSideBarMenu(new Body());

        expect($menu)->toHaveKey('Tools');
        expect($menu)->not->toHaveKey('Home');
        expect($menu)->not->toHaveKey('Settings');
    });

    test('the Tools entry registers the plugin page under tools.php', function () {
        Functions\when('get_option')->justReturn(false);

        $tools = Menu::getSideBarMenu(new Body())['Tools'];

        expect($tools['type'])->toBe('submenu_page');
        expect($tools['parent'])->toBe('tools.php');
        expect($tools['slug'])->toBe('icon-indexa');
    });
});
