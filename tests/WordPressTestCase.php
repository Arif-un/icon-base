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

        // Default no-op user stubs so any test reaching Config::getUserMeta() incidentally
        // (e.g. Head/BlockProvider localizing onboarding state) works without restating them.
        // Tests asserting user-specific behaviour override these with Functions\when() in their
        // own beforeEach, which redefines the stub and wins.
        Monkey\Functions\when('get_current_user_id')->justReturn(0);
        Monkey\Functions\when('get_user_meta')->justReturn('');

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
