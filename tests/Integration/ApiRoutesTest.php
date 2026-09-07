<?php

/**
 * Guards how backend/hooks/api.php wires capabilities onto route groups.
 *
 * Asserted against the source rather than by executing the file: the Route facade needs a
 * booted plugin and a live REST request, which is far more machinery than this needs. What
 * matters here is which group each route is declared in, and that is visible statically.
 */
function apiRouteGroups(): array
{
    $source = file_get_contents(\dirname(__DIR__, 2) . '/backend/hooks/api.php');

    $groups = [];

    // Each group is "Route::group(...)->middleware('a', 'b');" — pair the body with its
    // middleware list by walking the chunks between group openings.
    foreach (array_slice(explode('Route::group(', $source), 1) as $chunk) {
        if (preg_match('/->middleware\(([^)]*)\)/', $chunk, $matches) !== 1) {
            continue;
        }

        $middleware = array_map(
            static fn ($name) => trim($name, " \t\n'\""),
            explode(',', $matches[1])
        );

        $groups[] = [
            'body'       => substr($chunk, 0, strpos($chunk, '->middleware(')),
            'middleware' => $middleware,
        ];
    }

    return $groups;
}

describe('backend/hooks/api.php', function () {
    /**
     * The Icon block is registered for anyone who can edit posts, so everything the picker
     * fetches must be reachable at edit_posts. Behind manage_options an Author or Editor
     * gets a 400 and cannot place an icon at all. Onboarding is here for the same reason:
     * the welcome guide would otherwise reopen for them every session.
     */
    test('gates the block editor routes on edit_posts, not manage_options', function () {
        $editor = null;

        foreach (apiRouteGroups() as $group) {
            if (\in_array('isEditor', $group['middleware'], true)) {
                $editor = $group;
            }
        }

        expect($editor)->not->toBeNull();
        expect($editor['middleware'])->toContain('nonce');
        expect($editor['middleware'])->not->toContain('isAdmin');

        foreach (["Route::get('icons'", "Route::get('libraries'", "Route::get('icon-types'", "Route::post('onboarding'"] as $route) {
            expect($editor['body'])->toContain($route);
        }
    });

    /**
     * SettingsController writes plugin options that affect every user on the site, which is
     * a different boundary from reading the shipped icon catalogue.
     */
    test('keeps the settings routes on manage_options', function () {
        $admin = null;

        foreach (apiRouteGroups() as $group) {
            if (\in_array('isAdmin', $group['middleware'], true)) {
                $admin = $group;
            }
        }

        expect($admin)->not->toBeNull();
        expect($admin['middleware'])->toContain('nonce');
        expect($admin['body'])->toContain("Route::get('settings'");
        expect($admin['body'])->toContain("Route::post('settings'");
    });

    test('exposes no write route beyond onboarding outside the admin group', function () {
        foreach (apiRouteGroups() as $group) {
            if (\in_array('isAdmin', $group['middleware'], true)) {
                continue;
            }

            preg_match_all("/Route::post\\('([^']+)'/", $group['body'], $matches);
            expect($matches[1])->toBe(['onboarding']);
        }
    });

    test('leaves no route ungated', function () {
        foreach (apiRouteGroups() as $group) {
            expect($group['middleware'])->toContain('nonce');
            expect(array_intersect(['isAdmin', 'isEditor'], $group['middleware']))->not->toBeEmpty();
        }
    });
});
