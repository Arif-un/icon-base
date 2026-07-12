<?php

namespace IconBase\HTTP\Controllers;

if (!defined('ABSPATH')) {
    exit;
}

use IconBase\Deps\BitApps\WPKit\Http\Response;
use IconBase\Models\Library;

class LibraryController
{
    public function index()
    {
        return Response::success(Library::getAll());
    }
}
