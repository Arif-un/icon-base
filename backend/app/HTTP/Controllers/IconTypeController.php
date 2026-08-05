<?php

namespace IconIndexa\HTTP\Controllers;

if (!defined('ABSPATH')) {
    exit;
}

use IconIndexa\Deps\BitApps\WPKit\Http\Response;
use IconIndexa\Models\IconType;

class IconTypeController
{
    public function index()
    {
        return Response::success(IconType::getAll());
    }
}
