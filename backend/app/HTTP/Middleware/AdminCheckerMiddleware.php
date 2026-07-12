<?php

namespace IconBase\HTTP\Middleware;

if (!\defined('ABSPATH')) {
    exit;
}

use IconBase\Deps\BitApps\WPKit\Http\Response;
use IconBase\Deps\BitApps\WPKit\Utils\Capabilities;

class AdminCheckerMiddleware
{
    public function handle()
    {
        if (!Capabilities::check('manage_options')) {
            return Response::error('You do not have permission to perform this action.');
        }

        return true;
    }
}
