<?php

if (!defined('ABSPATH')) {
    exit;
}

use IconIndexa\Deps\BitApps\WPKit\Http\Router\Route;
use IconIndexa\HTTP\Controllers\IconController;
use IconIndexa\HTTP\Controllers\IconTypeController;
use IconIndexa\HTTP\Controllers\LibraryController;

Route::group(
    static function (): void {
        Route::get('icons', [IconController::class, 'index']);

        Route::get('libraries', [LibraryController::class, 'index']);
        Route::get('icon-types', [IconTypeController::class, 'index']);
    }
)->middleware('nonce', 'isAdmin');
