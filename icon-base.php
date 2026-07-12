<?php

/**
 * Plugin Name:       Icon Base
 * Plugin URI:        https://github.com/Arif-un/icon-base
 * Description:       Add 4,500+ self-hosted SVG icons to WordPress with instant full-text search and a powerful Gutenberg icon block.
 * Version:           0.1.0
 * Author:            Arif Uddin
 * Author URI:        https://github.com/Arif-un
 * Text Domain:       icon-base
 * Domain Path:       /languages
 * Requires at least: 5.9
 * Requires PHP:      7.4
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 */

if (!defined('ABSPATH')) {
    exit;
}

require_once plugin_dir_path(__FILE__) . 'backend/bootstrap.php';
