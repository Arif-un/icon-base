<?php

declare(strict_types=1);

use PhpCsFixer\Config;
use PhpCsFixer\Finder;

return (new Config())
    ->setRiskyAllowed(false)
    ->setRules([
        '@PSR12' => true,
        'array_syntax' => ['syntax' => 'short'],
        'no_unused_imports' => true,
        'single_quote' => true,
        'trailing_comma_in_multiline' => true,
        'no_whitespace_in_blank_line' => true,
        'no_trailing_whitespace' => true,
    ])
    ->setFinder(
        (new Finder())
            ->in(__DIR__ . '/backend')
            ->exclude(['vendor'])
    )
;
