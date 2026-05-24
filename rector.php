<?php

declare(strict_types=1);

use RectorWPStarterKit\WPStarterKitCodeQualityWPStarterKit\WPStarterKitRectorWPStarterKit\WPStarterKitClassMethodWPStarterKit\WPStarterKitExplicitReturnNullRector;
use RectorWPStarterKit\WPStarterKitCodeQualityWPStarterKit\WPStarterKitRectorWPStarterKit\WPStarterKitFuncCallWPStarterKit\WPStarterKitCompactToVariablesRector;
use RectorWPStarterKit\WPStarterKitConfigWPStarterKit\WPStarterKitRectorConfig;
use RectorWPStarterKit\WPStarterKitDeadCodeWPStarterKit\WPStarterKitRectorWPStarterKit\WPStarterKitIf_WPStarterKit\WPStarterKitUnwrapFutureCompatibleIfPhpVersionRector;
use RectorWPStarterKit\WPStarterKitSetWPStarterKit\WPStarterKitValueObjectWPStarterKit\WPStarterKitSetList;
use RectorWPStarterKit\WPStarterKitValueObjectWPStarterKit\WPStarterKitPhpVersion;

return RectorConfig::configure()
    ->withPaths([
        __DIR__ . '/backend/app',
        __DIR__ . '/backend/hooks',
        __DIR__ . '/pro/backend/app',
        __DIR__ . '/pro/backend/hooks',
    ])
    ->withRules([
        CompactToVariablesRector::class,
    ])
    ->withPhpVersion(PhpVersion::PHP_74)
    ->withSkip([
        UnwrapFutureCompatibleIfPhpVersionRector::class,
        ExplicitReturnNullRector::class

    ])
    ->withPreparedSets(
        deadCode: true,
        codeQuality: true,
        // typeDeclarations: true,
        privatization: true,
        earlyReturn: true,
        // strictBooleans: true,
        // naming: true,
    )
    ->withSets([SetList::PHP_74]);
