<?php

use IconBase\Deps\BitApps\WPKit\Http\Router\Route;

if (! defined('ABSPATH')) {
    exit;
}

if (! headers_sent()) {
    header('Access-Control-Allow-Methods: POST, GET, OPTIONS, PUT, DELETE');
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With');
    // Restrict CORS to this site's own origin; never use a wildcard with credentials.
    header('Access-Control-Allow-Origin: ' . esc_url_raw(home_url()));
    header('Vary: Origin');

    if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        status_header(200);

        exit;
    }
}

Route::group(
    function (): void {
        //given wellcome route for testing
        // Route::get('welcome', function () {
        //     return 'Welcome to the AJAX API!';
        // });
    }
)->middleware('nonce', 'isAdmin');
