<?php

namespace Tests;

use Brain\Monkey;
use Mockery\Adapter\Phpunit\MockeryPHPUnitIntegration;
use PHPUnit\Framework\TestCase as BaseTestCase;

abstract class WordPressTestCase extends BaseTestCase
{
    use MockeryPHPUnitIntegration;

    protected function setUp(): void
    {
        parent::setUp();
        Monkey\setUp();

        // Pass-through stubs for esc_html/esc_attr/esc_url/etc. so production code can keep
        // WordPress output-escaping (required for WP.org security compliance) under test.
        Monkey\Functions\stubEscapeFunctions();

        if (! \defined('ABSPATH')) {
            \define('ABSPATH', '/tmp/wordpress/');
        }
    }

    protected function tearDown(): void
    {
        Monkey\tearDown();
        parent::tearDown();
    }
}
