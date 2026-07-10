<?php

if (!defined('ABSPATH')) {
    exit;
}

// Deny direct access
http_response_code(403);
exit;
