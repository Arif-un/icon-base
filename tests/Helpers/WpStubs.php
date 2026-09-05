<?php

namespace Tests\Helpers;

use Brain\Monkey\Functions;

/**
 * Shared Brain Monkey stubs for the WordPress functions that Config::get() and
 * Head::createConfigVariable() reach for. Call from a test's beforeEach so the
 * value-assembling view code can run without a live WordPress.
 */
class WpStubs
{
    public static function config(): void
    {
        Functions\when('sanitize_text_field')->alias(fn ($str) => trim(strip_tags((string) $str)));
        Functions\when('plugins_url')->justReturn('https://example.com/wp-content/plugins/icon-indexa');
        Functions\when('set_url_scheme')->returnArg(1);
        Functions\when('home_url')->justReturn('https://example.com');
        Functions\when('wp_parse_url')->justReturn(['scheme' => 'https']);
        Functions\when('site_url')->justReturn('https://example.com');
        Functions\when('network_site_url')->justReturn('https://example.com');
        Functions\when('get_admin_url')->justReturn('https://example.com/wp-admin/');
        Functions\when('admin_url')->alias(fn ($p = '') => 'https://example.com/wp-admin/' . $p);
        Functions\when('get_rest_url')->justReturn('https://example.com/wp-json/IconIndexa/v1');
        Functions\when('wp_upload_dir')->justReturn(['basedir' => '/var/www/uploads', 'baseurl' => 'https://example.com/uploads']);
        Functions\when('is_multisite')->justReturn(false);
        Functions\when('get_locale')->justReturn('en_US');
        Functions\when('wp_timezone_string')->justReturn('UTC');
        Functions\when('wp_create_nonce')->justReturn('nonce-abc');
        Functions\when('get_option')->justReturn('');

        global $wp_rewrite;
        $wp_rewrite = new class {
            public $permalink_structure = '/%postname%/';
        };
    }
}
