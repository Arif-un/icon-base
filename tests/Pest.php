<?php

use Tests\TestCase;
use Tests\WordPressTestCase;

pest()->extend(TestCase::class)
    ->in('Unit');

pest()->extend(WordPressTestCase::class)
    ->in('Integration');
