<?php

namespace IconIndexa\HTTP\Controllers;

if (!defined('ABSPATH')) {
    exit;
}

use IconIndexa\Models\IconType;

class IconTypeController
{
    public function index()
    {
        return DbResponse::guard(static fn () => IconType::getAll());
    }
}
