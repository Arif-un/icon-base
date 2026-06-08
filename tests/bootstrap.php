<?php

if (! \defined('ABSPATH')) {
    \define('ABSPATH', '/tmp/wordpress/');
}

require_once __DIR__ . '/../vendor/autoload.php';

if (!\function_exists('absint')) {
    function absint($maybeint)
    {
        return abs((int) $maybeint);
    }
}

