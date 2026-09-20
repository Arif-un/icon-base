<?php

declare(strict_types=1);

/**
 * Full Gutenberg editor flow for the Icon Indexa block (icon-shelf/icon).
 *
 * The editor canvas is an iframe; the block's placeholder/preview render inside it, while
 * Gutenberg popovers/modals (the icon picker, the custom-SVG modal) portal into the main
 * document. Our components carry data-testid hooks; the block inserter / canvas iframe are WP
 * core DOM and are targeted by their core selectors (see CLAUDE.md testing rules). These tests
 * depend on the block editor script being served (built assets, no plugin-dir .htaccess). See
 * tests/Browser/README.md.
 *
 * ponytail: the WP-core inserter selectors (.editor-block-list-item-*, canvas-iframe) shift
 * between WP versions; if these break after a core upgrade, re-probe those two. Frontend
 * rendering is covered independently in FrontendRenderTest.
 */

/**
 * Open a fresh post editor and insert the Icon Indexa block via the inserter.
 */
function ii_insert_icon_block(): Pest\Browser\Api\AwaitableWebpage
{
    ii_suppress_onboarding();

    $page = ii_login()->navigate(ii_url('wp-admin/post-new.php?post_type=post'));

    return $page->wait(3)
        ->click('button[aria-label="Block Inserter"]')
        ->type('.block-editor-inserter__search input', 'Icon Indexa')
        ->wait(1)
        ->click('.editor-block-list-item-icon-shelf-icon');
}

it('inserts the icon block and shows its placeholder in the editor', function () {
    ii_insert_icon_block()
        ->withinFrame('iframe[name="editor-canvas"]', function ($frame) {
            $frame->assertPresent('[data-testid="block-placeholder"]')
                ->assertPresent('[data-testid="block-browse-icon"]')
                ->assertPresent('[data-testid="block-insert-custom-svg"]');
        });
});

it('picks an icon from the library and previews it in the editor', function () {
    $page = ii_insert_icon_block();

    // The "Browse Icon" button lives in the canvas iframe; clicking it opens the picker popover
    // in the main document.
    $page->withinFrame('iframe[name="editor-canvas"]', function ($frame) {
        $frame->click('[data-testid="block-browse-icon"]');
    });

    $page->wait(1)
        ->type('[data-testid="icon-picker-search"] input', 'arrow')
        ->wait(1);

    // The grid renders ~100 matching icons; click the first one (JS click avoids a strict-mode
    // multi-match, and the popover is portaled into the main document).
    $page->script("document.querySelector('[data-testid=\"icon-picker-item\"]').click()");

    $page->wait(1)->click('[data-testid="icon-picker-select"]');

    // The chosen icon renders as an editor-only preview svg inside the canvas.
    $page->withinFrame('iframe[name="editor-canvas"]', function ($frame) {
        $frame->assertPresent('[data-testid="block-icon-preview"]');
    });
});

it('inserts a custom SVG via the modal and previews it in the editor', function () {
    $page = ii_insert_icon_block();

    $page->withinFrame('iframe[name="editor-canvas"]', function ($frame) {
        $frame->click('[data-testid="block-insert-custom-svg"]');
    });

    $page->wait(1)
        ->type('[data-testid="custom-svg-input"]', '<svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/></svg>')
        ->wait(1)
        ->click('[data-testid="custom-svg-insert"]');

    $page->withinFrame('iframe[name="editor-canvas"]', function ($frame) {
        $frame->assertPresent('[data-testid="block-icon-preview"]');
    });
});
