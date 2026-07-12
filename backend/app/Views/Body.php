<?php

namespace IconBase\Views;

if (!defined('ABSPATH')) {
    exit;
}


class Body
{
    public function render()
    {
        // phpcs:ignore Generic.PHP.ForbiddenFunctions.FoundWithAlternative
        echo '<div id="wp-starter-kit-root"></div>';
    }
}
