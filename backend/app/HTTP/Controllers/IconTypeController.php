<?php

namespace IconBase\HTTP\Controllers;

if (!\defined('ABSPATH')) {
    exit;
}

use IconBase\Deps\BitApps\WPKit\Http\Response;
use IconBase\Models\IconType;

class IconTypeController
{
    public function index()
    {
        return Response::success(IconType::getAll());
    }
}
