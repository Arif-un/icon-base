<?php

if (!defined('ABSPATH')) {
    exit;
}

use IconIndexa\Deps\BitApps\WPKit\Http\Router\Route;
use IconIndexa\HTTP\Controllers\IconController;
use IconIndexa\HTTP\Controllers\IconTypeController;
use IconIndexa\HTTP\Controllers\LibraryController;
use IconIndexa\HTTP\Controllers\OnboardingController;
use IconIndexa\HTTP\Controllers\SettingsController;

/**
 * Everything the Icon block needs at edit time.
 *
 * The block is registered for anyone who can edit posts, so the data behind it has to be
 * reachable at the same capability — under manage_options an Author or Editor gets a 400
 * from the picker and cannot place an icon at all. These are read-only queries over the
 * dataset shipped with the plugin: no site configuration, no user data, no write verbs,
 * and still behind the user-bound nonce.
 *
 * Onboarding belongs here for the same reason, and only ever writes the caller's own meta.
 */
Route::group(
    static function (): void {
        Route::get('icons', [IconController::class, 'index']);

        Route::get('libraries', [LibraryController::class, 'index']);
        Route::get('icon-types', [IconTypeController::class, 'index']);

        Route::post('onboarding', [OnboardingController::class, 'update']);
    }
)->middleware('nonce', 'isEditor');

/**
 * Site-wide configuration stays on manage_options: SettingsController writes plugin options
 * that affect every user, which is a different boundary from reading the icon catalogue.
 */
Route::group(
    static function (): void {
        Route::get('settings', [SettingsController::class, 'index']);
        Route::post('settings', [SettingsController::class, 'update']);
    }
)->middleware('nonce', 'isAdmin');
