this is a wordpress plugin for icon called icon-indexa.

- always follow wordpress security best practise
- flag any security related issu as critical whenever found


- icon dataset: backend/data/ib.json is the tracked source of truth (commit it, never gitignore).
  The SQLite ib.db is GENERATED at runtime from that JSON into wp-content/uploads/icon-indexa/ (writable),
  version-gated by Config::DATA_VERSION vs the data_version option. Never commit or ship a binary .db,
  and never write to the plugin dir at runtime. Regenerate JSON with `pnpm db:export`; bump
  Config::DATA_VERSION whenever ib.json changes so installed sites rebuild.

## Builds
- .env is gitignored, so it is ABSENT on CI and fresh clones. Production builds must
  NOT depend on .env values. In vite.config.ts, PLUGIN_SLUG and SERVER_VARIABLES default
  to the plugin's PHP constants (Config::SLUG = icon-indexa, Config::VAR_PREFIX = ICON_INDEXA_)
  when unset. These MUST stay in sync with Head.php, which enqueues
  main-{slug}-ba-assets-{codeName}.css and localizes under VAR_PREFIX. If they diverge the CSS
  404s (shipped as main-undefined-...) and the localized window var is undefined.

## REST
- restRequest (frontend/src/common/helpers/restRequest.ts) joins an endpoint's own query string with
  API_URL.separator from Config::get('API_URL') ('?' pretty permalinks, '&' plain, where base is already
  `?rest_route=...`). Keep that field localized: without it, plain-permalink sites build `iconsundefinedpage=1`
  and every paginated/search request 404s (rest_no_route).

## Coding
- always prefer small reusable utils in separate file
- write highly reusable functions, classes, and components: single responsibility, generic inputs via params/props, no hardcoded page/feature-specific values inside shared code.
- REUSE FIRST: before writing new code, search the codebase (frontend/src/common/helpers, frontend/src/components, backend/app/Services, backend/app/Models, etc.) for an existing util/class/component and reuse or extend it. Never duplicate logic that already exists elsewhere.
- when similar logic appears in 2+ places, extract it into a shared util/class/component and update all callers to use it.
- match existing coding style of the surrounding code (naming, file layout, idioms, lint rules). Run lint before finishing.

## Architecture docs
- keep this CLAUDE.md in sync with the architecture. Whenever an architectural change happens, update this file in the same change.
- counts as architectural: new/removed/renamed module, service, model, route, REST endpoint, block, or shared util/component; data storage or schema changes (ib.json, ib.db, options); build/tooling/CI changes; new dependencies; changed data flow between frontend and backend; new conventions or constraints.
- document the what and the why (constraints, gotchas, must-stay-in-sync pairs), not code that is obvious from reading the files.

## Testing
- Test cases encode intentional decisions for features and bug fixes.
- If a test fails after a feature is modified, DO NOT auto-update the test to match the new behavior.
- Instead, ask whether the user wants to change the feature's behavior (then update the test) or whether it is a real bug being introduced (then fix the code).
- make sure everytime 95%+ test coverage also add critical and edge case tests
- coverage is PER FILE, not just the global total: every source file you add or touch must reach 95%+ lines, branches, functions, and statements. A high global average does not excuse an under-covered file.
- verify with `pnpm test:ts` (frontend, vitest v8) and `composer test:coverage` (PHP, --min=95) and check the per-file report for any touched file below 95% before finishing.
- only exclude a file from coverage if it is truly untestable (generated code, bootstrap/entry shells, dev-only tooling), and add a comment in the coverage config explaining why.
- target branch coverage (every if/else both ways), not just line coverage; aim for full path coverage on non-trivial logic (branches, loops, parsers, security/data paths)
- add test on bug fix and feature add
- add test case for everytime any function logic updates, all possible inputs/outputs
- mutation testing (`composer test:mutation`, mutates backend/app/Services and backend/app/Models): mark every
  `$dir . DIRECTORY_SEPARATOR . 'file'` path that gets WRITTEN to disk with `// @pest-mutate-ignore` on the line
  above (see SQLiteDB::prepareDir / rebuildLocked). A concat mutant drops the dir operand, so the run writes the
  bare filename into its CWD (the plugin root, served by wp-env); a stray deny-all .htaccess there 403s every
  plugin asset. The root .gitignore entries for those files are only a backstop.

### Browser/e2e selectors (Pest browser suite, tests/Browser)
- target OUR components via `data-testid`, never raw CSS classes, antd/wp.components internals, or visible text. Refactor-safe and pierces the shadow DOM.
- add the `data-testid` to the source component when a test needs a hook; do not couple tests to styling classes.
- exceptions (do NOT add data-testid, use the native selector):
  - WP-core DOM: block inserter, `iframe[name="editor-canvas"]`, wp-login, etc. Not ours to change; targeted by core selectors.
  - Frontend block output (static-save public HTML in FrontendRenderTest/SanitizerTest): this is shipped post content. NEVER inject test attrs there. Assert its real class/attribute contract (`.wp-block-icon-shelf-icon`, `svg[role="img"]`, `viewBox`, sanitizer output) instead.


## APP
- using wp-env docker wp app run on http://localhost:8888/wp-admin/admin.php?page=icon-indexa#/
- user: admin, password: admin