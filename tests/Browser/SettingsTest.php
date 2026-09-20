<?php

declare(strict_types=1);

/**
 * Settings route (#/settings): the single "Show dedicated menu in sidebar" toggle autosaves,
 * shows a confirmation notice, and persists across a reload (WP option ICON_INDEXA_settings).
 * Selectors are data-testid hooks on our components (see CLAUDE.md testing rules).
 */

it('toggles the sidebar-menu setting, confirms the save, and persists it across reload', function () {
    $page = ii_visit_app('/settings')
        ->assertPresent('[data-testid="settings-page"]');

    // Toggle (autosave). The "Reload" action only appears in the success notice after a
    // successful POST, so awaiting it also guarantees the write finished before we reload.
    $page->click('[data-testid="settings-sidebar-toggle"]')
        ->assertPresent('[data-testid="settings-saved-reload"]');

    $toggled = $page->attribute('[data-testid="settings-sidebar-toggle"]', 'aria-checked');

    // Reload the route: the switch must reflect the persisted server value, not a fresh default.
    $page->navigate(ii_admin_app_url('/settings'))
        ->assertPresent('[data-testid="settings-page"]');

    expect($page->attribute('[data-testid="settings-sidebar-toggle"]', 'aria-checked'))
        ->toBe($toggled);

    // Restore original state so the test is idempotent.
    $page->click('[data-testid="settings-sidebar-toggle"]')
        ->assertPresent('[data-testid="settings-saved-reload"]');
});
