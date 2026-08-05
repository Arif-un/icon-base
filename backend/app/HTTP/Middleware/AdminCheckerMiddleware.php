<?php

namespace IconIndexa\HTTP\Middleware;

if (!defined('ABSPATH')) {
    exit;
}

use IconIndexa\Deps\BitApps\WPKit\Http\Response;
use IconIndexa\Deps\BitApps\WPKit\Utils\Capabilities;

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
