<?php

declare(strict_types=1);

/**
 * Shared helpers for the Pest browser (end-to-end) suite.
 *
 * These tests drive a REAL running wp-env instance (default http://localhost:8888) with the
 * plugin built and active. They do not mock WordPress. See tests/Browser/README.md for setup.
 */

use Pest\Browser\Api\AwaitableWebpage;

/**
 * Base URL of the wp-env instance under test. Override with ICON_INDEXA_TEST_URL.
 */
function ii_base_url(): string
{
    return rtrim((string) (getenv('ICON_INDEXA_TEST_URL') ?: 'http://localhost:8888'), '/');
}

function ii_url(string $path = ''): string
{
    return ii_base_url() . '/' . ltrim($path, '/');
}

function ii_admin_app_url(string $hash = '/'): string
{
    return ii_url('wp-admin/admin.php?page=icon-indexa#' . $hash);
}

/**
 * Run a WP-CLI command inside wp-env (via the package.json "wp-cli" script) and return trimmed stdout.
 * Used for deterministic test data setup that the UI cannot (or should not) create.
 */
function ii_wp(string $args, ?string $stdinFile = null): string
{
    $cmd = 'pnpm --silent wp-cli ' . $args;

    if ($stdinFile !== null) {
        $cmd .= ' < ' . escapeshellarg($stdinFile);
    }

    return trim((string) shell_exec($cmd . ' 2>/dev/null'));
}

/**
 * Fail fast with an actionable message if the environment is not ready, so a wall of
 * Playwright timeouts does not hide the real cause (env down / plugin inactive / no data).
 * Runs its checks once per process.
 */
function ii_precheck(): void
{
    static $checked = false;
    if ($checked) {
        return;
    }
    $checked = true;

    $status = @file_get_contents(ii_url('wp-login.php'));
    if ($status === false) {
        throw new RuntimeException(
            'wp-env is not reachable at ' . ii_base_url() . '. Run `pnpm env:start` first '
            . '(or set ICON_INDEXA_TEST_URL). See tests/Browser/README.md.'
        );
    }

    $active = ii_wp('plugin list --status=active --field=name');
    if (!str_contains($active, 'icon-indexa')) {
        throw new RuntimeException(
            'The icon-indexa plugin is not active in wp-env. Run `pnpm build` then activate it. '
            . 'See tests/Browser/README.md.'
        );
    }

    $dataVersion = ii_wp('option get ' . ii_var('data_version'));
    if ($dataVersion === '') {
        throw new RuntimeException(
            'Icon dataset has not been generated (no ' . ii_var('data_version') . ' option). '
            . 'Load the admin page once, or reactivate the plugin, so ib.db is built.'
        );
    }
}

/**
 * Prefix a key with Config::VAR_PREFIX (kept in sync with backend/app/Config.php).
 */
function ii_var(string $key): string
{
    return 'ICON_INDEXA_' . $key;
}

/**
 * Suppress the onboarding wizard + tour for the admin user so overlays do not block other
 * assertions. Writes the per-user onboarding meta directly (matches Services\Onboarding shape).
 * Runs once per process.
 */
function ii_suppress_onboarding(): void
{
    static $done = false;
    if ($done) {
        return;
    }
    $done = true;

    $state = json_encode([
        'version'     => 1, // Config::ONBOARDING_VERSION
        'wizard'      => true,
        'adminTour'   => true,
        'editorGuide' => true,
    ]);

    ii_wp('user meta update admin ' . escapeshellarg(ii_var('onboarding')) . ' ' . escapeshellarg((string) $state) . ' --format=json');
}

/**
 * Log in to wp-admin as admin/admin and return the resulting page.
 */
function ii_login(): AwaitableWebpage
{
    ii_precheck();

    return visit(ii_url('wp-login.php'))
        ->fill('#user_login', 'admin')
        ->fill('#user_pass', 'admin')
        ->click('#wp-submit')
        ->assertPathContains('/wp-admin');
}

/**
 * Log in and open the admin SPA at the given hash route, onboarding suppressed.
 */
function ii_visit_app(string $hash = '/'): AwaitableWebpage
{
    ii_suppress_onboarding();

    $page = ii_login()->navigate(ii_admin_app_url($hash));

    // The admin app mounts into an open shadow root. If it never attaches, the app assets did
    // not load. Turn the resulting wall of element-not-found timeouts into one actionable error.
    $page->wait(1);
    $mounted = $page->script(
        "!!(document.querySelector('#wp-starter-kit-root') && document.querySelector('#wp-starter-kit-root').shadowRoot)"
    );

    if ($mounted !== true) {
        $devNotice = $page->script(
            "document.body.innerText.includes('Dev server not running')"
        );

        throw new RuntimeException(
            $devNotice === true
                ? 'Admin app is in DEV mode but the Vite dev server is unreachable from WordPress. '
                    . 'Either run `pnpm dev`, or set DEV=false in .env and run `pnpm build`.'
                : 'Admin app did not mount (assets not served). Run `pnpm build`, and ensure no '
                    . 'plugin-dir .htaccess blocks /assets (a repo-root .htaccess is mounted into the '
                    . 'plugin dir by wp-env). See tests/Browser/README.md.'
        );
    }

    return $page;
}

/**
 * Publish a post with the given raw content (block markup) via WP-CLI and return its ID.
 * Content is passed over STDIN to avoid shell-quoting the HTML.
 */
function ii_seed_post(string $content, string $title = 'II Browser Test'): int
{
    ii_precheck();

    $tmp = tempnam(sys_get_temp_dir(), 'ii-post-');
    file_put_contents($tmp, $content);

    $id = ii_wp(
        'post create - --post_type=post --post_status=publish --post_title=' . escapeshellarg($title) . ' --porcelain',
        $tmp
    );

    unlink($tmp);

    return (int) $id;
}

function ii_delete_post(int $id): void
{
    if ($id > 0) {
        ii_wp('post delete ' . $id . ' --force');
    }
}

function ii_post_url(int $id): string
{
    return ii_url('?p=' . $id);
}

/**
 * Build serialized icon-block markup (static save output) for seeding frontend-render tests.
 * We control the exact HTML so we can assert both correct rendering and server-side sanitization.
 */
function ii_icon_block(string $innerSvg, string $wrapperClass = '', string $svgAttrs = 'aria-hidden="true"', string $container = 'div', string $containerAttrs = ''): string
{
    $wrapper = trim('wp-block-icon-shelf-icon ' . $wrapperClass);
    $open    = $container === 'a' ? '<a class="icon-container" ' . $containerAttrs . '>' : '<div class="icon-container">';
    $close   = $container === 'a' ? '</a>' : '</div>';

    $html = '<div class="' . $wrapper . '" style="display:flex;align-items:center;line-height:0">'
        . $open
        . '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48px" fill="currentColor" role="img" ' . $svgAttrs . '>'
        . $innerSvg
        . '</svg>'
        . $close
        . '</div>';

    return "<!-- wp:icon-shelf/icon -->\n" . $html . "\n<!-- /wp:icon-shelf/icon -->";
}
