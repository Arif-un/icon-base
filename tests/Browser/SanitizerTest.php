<?php

declare(strict_types=1);

/**
 * SECURITY (critical): the server-side SvgSanitizer (render_block_icon-shelf/icon filter) must
 * strip <script>, on* event handlers and javascript: URLs from block output before it reaches
 * the browser, even when malicious markup was inserted via the Code Editor / REST by an
 * unfiltered_html user. This is the last line of defense against stored XSS in icon blocks.
 */

it('strips scripts, event handlers and javascript: urls from rendered block output', function () {
    $malicious = '<path d="M4 4h16v16H4z" onload="window.__pwn=1"/>'
        . '<script>window.__pwn2=1</script>';

    $id = ii_seed_post(ii_icon_block(
        $malicious,
        '',
        'aria-hidden="true"',
        'a',
        'href="javascript:alert(1)"'
    ), 'II Sanitizer XSS');

    try {
        $page = visit(ii_post_url($id))->assertPresent('.wp-block-icon-shelf-icon');

        $html = (string) $page->script(
            "document.querySelector('.wp-block-icon-shelf-icon').outerHTML"
        );

        expect($html)
            ->not->toContain('<script')
            ->not->toContain('onload')
            ->not->toContain('javascript:')
            ->toContain('<path'); // the benign shape must survive sanitization

        // The injected scripts must never have executed.
        expect($page->script('window.__pwn ?? null'))->toBeNull();
        expect($page->script('window.__pwn2 ?? null'))->toBeNull();
    } finally {
        ii_delete_post($id);
    }
});
