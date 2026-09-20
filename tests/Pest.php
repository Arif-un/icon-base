<?php

use Tests\TestCase;
use Tests\WordPressTestCase;

pest()->extend(TestCase::class)
    ->in('Unit');

pest()->extend(WordPressTestCase::class)
    ->in('Integration');

// Browser (e2e) tests drive a live wp-env; they use the global visit() API, no TestCase extend.
require_once __DIR__ . '/Browser/helpers.php';
