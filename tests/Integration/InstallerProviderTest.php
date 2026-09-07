<?php

use Brain\Monkey\Functions;
use Brain\Monkey\Actions;
use IconIndexa\Providers\InstallerProvider;

beforeEach(function () {
    Functions\when('register_activation_hook')->justReturn(null);
    Functions\when('register_deactivation_hook')->justReturn(null);
    Functions\when('register_uninstall_hook')->justReturn(null);
    Functions\when('plugin_basename')->alias(fn ($f) => basename((string) $f));
    Functions\when('plugin_dir_path')->justReturn('/var/www/plugins/icon-indexa/');
    Functions\when('get_option')->justReturn('0.0');
});

describe('InstallerProvider::__construct', function () {
    test('wires the activate and deactivate action hooks', function () {
        new InstallerProvider();

        expect(has_action('ICON_INDEXA_activate'))->toBeTrue();
        expect(has_action('ICON_INDEXA_deactivate'))->toBeTrue();
    });
});

describe('InstallerProvider::register', function () {
    test('registers the WPKit installer activate/uninstall hooks', function () {
        (new InstallerProvider())->register();

        expect(has_action('ICON_INDEXA_activate'))->toBeTrue();
        expect(has_action('ICON_INDEXA_uninstall'))->toBeTrue();
    });
});

describe('InstallerProvider lifecycle callbacks', function () {
    test('activate is a no-op that does not throw', function () {
        expect((new InstallerProvider())->activate())->toBeNull();
    });

    test('deactivate flushes rewrite rules', function () {
        Functions\expect('flush_rewrite_rules')->once();

        (new InstallerProvider())->deactivate();
    });

    test('registerActivator fires the activate action', function () {
        Actions\expectDone('ICON_INDEXA_activate')->once();

        (new InstallerProvider())->registerActivator(true);
    });

    test('registerDeactivator fires the deactivate action', function () {
        Actions\expectDone('ICON_INDEXA_deactivate')->once();

        (new InstallerProvider())->registerDeactivator(false);
    });

    test('registerUninstaller fires the uninstall action', function () {
        new InstallerProvider();
        Actions\expectDone('ICON_INDEXA_uninstall')->once();

        InstallerProvider::registerUninstaller(false);
    });
});

describe('InstallerProvider migration definitions', function () {
    test('migration points at the plugin options migration', function () {
        $migration = InstallerProvider::migration();

        expect($migration['migrations'])->toBe(['IconIndexaPluginOptions']);
        expect($migration['path'])->toContain('Migrations');
    });

    test('drop mirrors the migration definition', function () {
        expect(InstallerProvider::drop())->toBe(InstallerProvider::migration());
    });
});
