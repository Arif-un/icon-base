<?php

use Brain\Monkey\Functions;
use IconIndexa\HTTP\Controllers\SettingsController;
use IconIndexa\Deps\BitApps\WPKit\Http\Request\Request;

describe('SettingsController::current', function () {
    test('defaults showSidebarMenu to true when the option is missing', function () {
        Functions\when('get_option')->justReturn(false);

        expect(SettingsController::current()['showSidebarMenu'])->toBeTrue();
    });

    test('defaults showSidebarMenu to true when the key is absent from stored settings', function () {
        Functions\when('get_option')->justReturn(['somethingElse' => 1]);

        expect(SettingsController::current()['showSidebarMenu'])->toBeTrue();
    });

    test('normalizes a stored falsy value to a real boolean false', function () {
        Functions\when('get_option')->justReturn(['showSidebarMenu' => 0]);

        expect(SettingsController::current()['showSidebarMenu'])->toBeFalse();
    });

    test('normalizes a stored truthy value to a real boolean true', function () {
        Functions\when('get_option')->justReturn(['showSidebarMenu' => 1]);

        expect(SettingsController::current()['showSidebarMenu'])->toBeTrue();
    });
});

describe('SettingsController::update', function () {
    test('persists the toggle as a boolean under the prefixed option', function () {
        Functions\when('get_option')->justReturn(false);

        // The frontend serializes the boolean via JSON, so the request value is the string "false".
        $request = Mockery::mock(Request::class);
        $request->shouldReceive('has')->with('showSidebarMenu')->andReturn(true);
        $request->shouldReceive('get')->with('showSidebarMenu')->andReturn('false');

        Functions\expect('update_option')
            ->once()
            ->with('ICON_INDEXA_settings', ['showSidebarMenu' => false], null)
            ->andReturn(true);

        (new SettingsController())->update($request);
    });

    test('preserves the current value when the key is absent from the request', function () {
        // Stored false; a request that omits the key must not silently flip it back to the default.
        Functions\when('get_option')->justReturn(['showSidebarMenu' => 0]);

        $request = Mockery::mock(Request::class);
        $request->shouldReceive('has')->with('showSidebarMenu')->andReturn(false);

        Functions\expect('update_option')
            ->once()
            ->with('ICON_INDEXA_settings', ['showSidebarMenu' => false], null)
            ->andReturn(true);

        (new SettingsController())->update($request);
    });
});
