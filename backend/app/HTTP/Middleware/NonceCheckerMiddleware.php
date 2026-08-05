<?php

namespace IconIndexa\HTTP\Middleware;

if (!defined('ABSPATH')) {
    exit;
}

use IconIndexa\Config;
use IconIndexa\Deps\BitApps\WPKit\Http\Request\Request;
use IconIndexa\Deps\BitApps\WPKit\Http\Response;

class NonceCheckerMiddleware
{
    public function handle(Request $request)
    {
        $nonce = isset($_SERVER['HTTP_X_ICON_INDEXA_NONCE'])
            ? sanitize_text_field(wp_unslash($_SERVER['HTTP_X_ICON_INDEXA_NONCE']))
            : sanitize_text_field((string) $request->get('_nonce'));

        if (!wp_verify_nonce($nonce, Config::withPrefix('nonce'))) {
            return Response::error('Nonce verification failed.');
        }

        return true;
    }
}
