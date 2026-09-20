# Browser (end-to-end) tests

Pest browser tests that drive a **real running wp-env** with Chromium (via
`pestphp/pest-plugin-browser`, which wraps Playwright). They cover the admin SPA, settings,
the Gutenberg block editor flow, and frontend rendering + the security sanitizer.

Unlike the Unit/Integration suites, these do **not** mock WordPress and are **not** part of the
default `composer test` / `pnpm test:php` run (they need a live server and contribute no PHP
coverage). Run them explicitly.

## Run

```bash
composer test:browser
# or a single file/test:
./vendor/bin/pest --testsuite=Browser --filter="renders a published icon block"
```

## Prerequisites (env must be up and serving)

1. **wp-env running** at `http://localhost:8888` (`pnpm env:start`). Override with
   `ICON_INDEXA_TEST_URL` if different.
2. **Plugin built and active**: `pnpm build` then activate `icon-indexa`. The build produces the
   admin app + block assets the tests load.
3. **Icon dataset generated** (`ib.db`): load the admin page once, or (re)activate the plugin, so
   the `ICON_INDEXA_data_version` option is set and search/picker return icons.
4. **Chromium for Playwright**: `node_modules/.bin/playwright install chromium` (one-time).

The suite runs a fast precheck and fails with an actionable message if any of the above is
missing, instead of a wall of Playwright timeouts.

## Two gotchas specific to this plugin

- **Admin app dev mode.** With `DEV=true` in `.env`, the admin SPA loads its assets from the Vite
  dev server (`:3000`). WordPress (in the wp-env container) probes that server **from inside
  Docker**, where `localhost:3000` is not the host, so it renders a "Dev server not running"
  notice and the app never mounts. For these tests either run `pnpm dev` **and** make the dev URL
  reachable from the container, or simply set `DEV=false` in `.env` and `pnpm build` to serve the
  built assets (this is also what CI / a fresh clone do, since `.env` is absent there).
- **A repo-root `.htaccess` blocks plugin assets.** `.wp-env.json` mounts the repo root (`.`) as
  the plugin directory. If a `Require all denied` `.htaccess` (or a bare `index.php`) exists at the
  repo root, every request to `/wp-content/plugins/icon-indexa/assets/*` returns **403**, so the
  admin app and block editor script fail to load (frontend block rendering still works, because it
  is server-rendered PHP). Remove such a file from the repo root before running the admin/editor
  tests. These files are untracked, so they do not affect CI.

## What is covered

- `AdminBrowseTest` — icon grid loads, filters render, pagination, search results + empty state.
- `SettingsTest` — the sidebar-menu toggle autosaves, shows the confirmation, and persists across
  reload (WP option `ICON_INDEXA_settings`).
- `EditorBlockTest` — inserts the block in the real editor; picks a library icon; inserts a custom
  SVG; asserts the editor preview each time.
- `FrontendRenderTest` — published block renders the expected SVG DOM, alignment class, accessible
  label, and linked-anchor variant (`rel`/`aria-hidden`).
- `SanitizerTest` (security-critical) — `<script>`, `on*` handlers and `javascript:` URLs are
  stripped from rendered block output and never execute.

Onboarding (wizard + tour) is deterministically suppressed via user meta, not asserted.

## Notes

- Test data (posts) is created/removed via WP-CLI (`pnpm wp-cli`) through wp-env. Seeded posts are
  deleted in a `finally` block per test.
- Failure screenshots land in `tests/Browser/Screenshots/` (gitignored).
