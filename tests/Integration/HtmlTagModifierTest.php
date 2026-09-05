<?php

use Brain\Monkey\Functions;
use Brain\Monkey\Filters;
use IconIndexa\Views\HtmlTagModifier;

beforeEach(function () {
    unset($_ENV['ICON_INDEXA_DEV']);

    Functions\when('sanitize_text_field')->alias(fn ($str) => trim(strip_tags((string) $str)));
});

afterEach(function () {
    unset($_ENV['ICON_INDEXA_DEV']);
});

describe('HtmlTagModifier::__construct', function () {
    test('registers the three loader filters', function () {
        new HtmlTagModifier();

        expect(has_filter('style_loader_tag'))->toBeTrue();
        expect(has_filter('script_loader_tag'))->toBeTrue();
        expect(has_filter('script_loader_src'))->toBeTrue();
    });
});

describe('HtmlTagModifier::updateScriptAttributes', function () {
    test('adds type="module" to the production index script tag', function () {
        $modifier = new HtmlTagModifier();
        $html = '<script src="x.js" id="icon-indexa-index-MODULE-js"></script>';

        $result = $modifier->updateScriptAttributes($html);

        expect($result)->toContain('id="icon-indexa-index-MODULE-js" type="module"');
    });

    test('leaves an unrelated script tag untouched in production', function () {
        $modifier = new HtmlTagModifier();
        $html = '<script src="x.js" id="jquery-js"></script>';

        expect($modifier->updateScriptAttributes($html))->toBe($html);
    });

    test('adds type="module" to every dev module handle in dev mode', function () {
        $_ENV['ICON_INDEXA_DEV'] = 'true';
        $modifier = new HtmlTagModifier();
        $html = '<script id="icon-indexa-vite-client-helper-MODULE-js"></script>'
              . '<script id="icon-indexa-vite-client-MODULE-js"></script>'
              . '<script id="icon-indexa-index-MODULE-js"></script>';

        $result = $modifier->updateScriptAttributes($html);

        expect(substr_count($result, 'type="module"'))->toBe(3);
    });
});

describe('HtmlTagModifier::updateLinkAttributes', function () {
    test('returns the html unchanged for a handle without the plugin slug', function () {
        $modifier = new HtmlTagModifier();
        $html = "<link rel='stylesheet' href='x.css'>";

        expect($modifier->updateLinkAttributes($html, 'other-css'))->toBe($html);
    });

    test('rewrites stylesheet to preconnect for a PRECONNECT handle', function () {
        $modifier = new HtmlTagModifier();
        $html = "<link rel='stylesheet' href='x.css'>";

        $result = $modifier->updateLinkAttributes($html, 'icon-indexa-PRECONNECT');

        expect($result)->toContain('rel="preconnect"');
    });

    test('rewrites stylesheet to preload for a PRELOAD handle', function () {
        $modifier = new HtmlTagModifier();
        $html = "<link rel='stylesheet' href='x.css'>";

        $result = $modifier->updateLinkAttributes($html, 'icon-indexa-PRELOAD');

        expect($result)->toContain('rel="preload"');
    });

    test('adds crossorigin for a CROSSORIGIN handle', function () {
        $modifier = new HtmlTagModifier();
        $handle = 'icon-indexa-CROSSORIGIN';
        $html = "<link id='{$handle}-css' rel='stylesheet' href='x.css'>";

        $result = $modifier->updateLinkAttributes($html, $handle);

        expect($result)->toContain("id='{$handle}-css' crossorigin");
    });
});

describe('HtmlTagModifier::removeQueryParam', function () {
    test('strips the query string from the index module src', function () {
        $modifier = new HtmlTagModifier();

        $result = $modifier->removeQueryParam('https://x/main.js?ver=1', 'icon-indexa-index-MODULE');

        expect($result)->toBe('https://x/main.js');
    });

    test('leaves other handles src untouched', function () {
        $modifier = new HtmlTagModifier();
        $src = 'https://x/other.js?ver=1';

        expect($modifier->removeQueryParam($src, 'other-handle'))->toBe($src);
    });
});
