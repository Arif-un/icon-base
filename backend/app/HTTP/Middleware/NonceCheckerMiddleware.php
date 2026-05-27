<?php

namespace IconBase\HTTP\Middleware;

if (!\defined('ABSPATH')) {
    exit;
}

use IconBase\Config;
use IconBase\Deps\BitApps\WPKit\Http\Response;

class NonceCheckerMiddleware
{
    public function handle($request, $next)
    {
        $nonce = isset($_SERVER['HTTP_X_ICON_BASE_NONCE'])
            ? sanitize_text_field(wp_unslash($_SERVER['HTTP_X_ICON_BASE_NONCE']))
            : sanitize_text_field($request->get('_nonce'));

        if (!wp_verify_nonce($nonce, Config::withPrefix('nonce'))) {
            return Response::error('Nonce verification failed.');
        }

        return $next($request);
    }
}
