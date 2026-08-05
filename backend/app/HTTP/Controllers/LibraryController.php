<?php

namespace IconIndexa\HTTP\Controllers;

if (!defined('ABSPATH')) {
    exit;
}

use IconIndexa\Deps\BitApps\WPKit\Http\Response;
use IconIndexa\Models\Library;

class LibraryController
{
    public function index()
    {
        return Response::success(Library::getAll());
    }
}
