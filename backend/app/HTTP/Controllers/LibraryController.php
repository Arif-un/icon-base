<?php

namespace IconIndexa\HTTP\Controllers;

if (!defined('ABSPATH')) {
    exit;
}

use IconIndexa\Models\Library;

class LibraryController
{
    public function index()
    {
        return DbResponse::guard(static fn () => Library::getAll());
    }
}
