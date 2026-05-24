<?php

namespace IconBase\Views;

if (!\defined('ABSPATH')) {
    exit;
}

use IconBase\Config;

class Body
{
    public function render()
    {
        echo '<div id="wp-starter-kit-root"></div>';
    }
}
