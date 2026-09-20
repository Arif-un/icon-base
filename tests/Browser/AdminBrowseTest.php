<?php

declare(strict_types=1);

/**
 * Admin SPA icon browser (route #/): search, filters render, results, empty state, pagination.
 * The whole app renders inside a shadow root; Playwright locators pierce it automatically.
 * Selectors are data-testid hooks on our components (see CLAUDE.md testing rules).
 */

it('loads the icon browser with the icon grid populated', function () {
    ii_visit_app('/')
        ->assertPresent('[data-testid="icon-grid-item"]');
});

it('renders the library and type filters', function () {
    ii_visit_app('/')
        ->assertPresent('[data-testid="icon-library-filter"]')
        ->assertPresent('[data-testid="icon-type-filter"]');
});

it('paginates when there are more than one page of icons', function () {
    // The bundled set is ~4,500 icons, so the unfiltered view is paginated.
    ii_visit_app('/')
        ->assertPresent('[data-testid="icon-pagination"]');
});

it('shows matching icons for a search term', function () {
    ii_visit_app('/')
        ->assertPresent('[data-testid="icon-grid-item"]')
        ->type('[data-testid="icon-search"] input', 'arrow')
        ->assertPresent('[data-testid="icon-grid-item"]');
});

it('shows the empty state for a search that matches nothing', function () {
    ii_visit_app('/')
        ->assertPresent('[data-testid="icon-grid-item"]')
        ->type('[data-testid="icon-search"] input', 'zzzznotarealicon')
        ->assertPresent('[data-testid="icon-empty"]');
});
