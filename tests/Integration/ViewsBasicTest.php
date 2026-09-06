<?php

use Brain\Monkey\Functions;
use IconIndexa\src\Menu;
use IconIndexa\Views\Body;
use IconIndexa\Views\PluginPageActions;

describe('Body::render', function () {
    test('echoes the react root container', function () {
        ob_start();
        (new Body())->render();
        $html = ob_get_clean();

        expect($html)->toBe('<div id="wp-starter-kit-root"></div>');
    });
});

describe('Menu::getSideBarMenu', function () {
    beforeEach(function () {
        // Menu now reads the settings option; unset defaults to the sidebar being shown.
        Functions\when('get_option')->justReturn(false);
    });

    test('returns a Home menu wired to the Body render callback', function () {
        $body = new Body();

        $menu = Menu::getSideBarMenu($body);

        expect($menu)->toHaveKey('Home');
        expect($menu['Home']['type'])->toBe('menu');
        expect($menu['Home']['slug'])->toBe('icon-indexa');
        expect($menu['Home']['capability'])->toBe('manage_options');
        expect($menu['Home']['callback'])->toBe([$body, 'render']);
    });

    test('embeds the menu icon as a base64 svg data uri', function () {
        $icon = Menu::getSideBarMenu(new Body())['Home']['icon'];

        expect($icon)->toStartWith('data:image/svg+xml;base64,');

        $decoded = base64_decode(substr($icon, \strlen('data:image/svg+xml;base64,')));
        expect($decoded)->toContain('<svg');
    });
});

describe('PluginPageActions', function () {
    beforeEach(function () {
        Functions\when('admin_url')->alias(fn ($path = '') => 'https://example.com/wp-admin/' . $path);
        Functions\when('__')->returnArg(1);
    });

    test('getActionLinks returns Settings and Support links', function () {
        $links = (new PluginPageActions())->getActionLinks();

        expect($links)->toHaveCount(2);
        expect($links[0]['title'])->toBe('Settings');
        expect($links[0]['url'])->toContain('page=icon-indexa');
        expect($links[1]['title'])->toBe('Support');
        expect($links[1]['url'])->toContain('github.com');
    });

    test('renderActionLinks prepends escaped anchor markup to existing links', function () {
        $existing = ['<a href="#">Deactivate</a>'];

        $result = (new PluginPageActions())->renderActionLinks($existing);

        expect($result)->toHaveCount(3);
        expect($result[0])->toContain('<a href="https://example.com/wp-admin/admin.php?page=icon-indexa">Settings</a>');
        expect($result[1])->toContain('Support');
        // Original links are preserved at the end.
        expect($result[2])->toBe('<a href="#">Deactivate</a>');
    });
});
