<?php

declare(strict_types=1);

/**
 * Frontend render of a published icon block. The block uses a static save, so its stored HTML
 * is echoed on the frontend after passing through the server-side sanitizer (render_block filter).
 * We seed posts with exact block markup so we can assert the rendered DOM precisely.
 */

it('renders a published icon block on the frontend', function () {
    $id = ii_seed_post(ii_icon_block('<path d="M4 4h16v16H4z"/>'));

    try {
        visit(ii_post_url($id))
            ->assertPresent('div.wp-block-icon-shelf-icon .icon-container svg[role="img"]')
            ->assertAttribute('div.wp-block-icon-shelf-icon svg', 'fill', 'currentColor')
            ->assertAttribute('div.wp-block-icon-shelf-icon svg', 'viewBox', '0 0 24 24')
            ->assertPresent('div.wp-block-icon-shelf-icon svg path');
    } finally {
        ii_delete_post($id);
    }
});

it('applies the alignment class from the block wrapper', function () {
    $id = ii_seed_post(ii_icon_block('<path d="M4 4h16v16H4z"/>', 'items-justified-center'));

    try {
        visit(ii_post_url($id))
            ->assertPresent('.wp-block-icon-shelf-icon.items-justified-center');
    } finally {
        ii_delete_post($id);
    }
});

it('exposes the accessible label on a standalone icon', function () {
    $id = ii_seed_post(ii_icon_block('<path d="M4 4h16v16H4z"/>', '', 'aria-label="My square icon"'));

    try {
        visit(ii_post_url($id))
            ->assertAttribute('.wp-block-icon-shelf-icon svg', 'aria-label', 'My square icon');
    } finally {
        ii_delete_post($id);
    }
});

it('renders a linked icon as an anchor and hides the inner svg from AT', function () {
    $id = ii_seed_post(ii_icon_block(
        '<path d="M4 4h16v16H4z"/>',
        '',
        'aria-hidden="true"',
        'a',
        'href="https://example.com" target="_blank" rel="noreferrer noopener"'
    ));

    try {
        visit(ii_post_url($id))
            ->assertPresent('a.icon-container[href="https://example.com"][target="_blank"]')
            ->assertAttributeContains('a.icon-container', 'rel', 'noopener')
            ->assertAttribute('a.icon-container svg', 'aria-hidden', 'true');
    } finally {
        ii_delete_post($id);
    }
});
