WordPress icon plugin: icon-indexa.

- Always follow WordPress security best practice
- Flag any security issue as critical when found


- Icon dataset: backend/data/ib.json = tracked source of truth (commit, never gitignore).
  SQLite ib.db GENERATED at runtime from JSON into wp-content/uploads/icon-indexa/ (writable),
  version-gated by Config::DATA_VERSION vs data_version option. Never commit/ship binary .db,
  never write to plugin dir at runtime. Regenerate JSON with `pnpm db:export`; bump
  Config::DATA_VERSION whenever ib.json changes so installed sites rebuild.

## Builds
- .env gitignored → ABSENT on CI + fresh clones. Production builds must
  NOT depend on .env values. In vite.config.ts, PLUGIN_SLUG and SERVER_VARIABLES default
  to plugin PHP constants (Config::SLUG = icon-indexa, Config::VAR_PREFIX = ICON_INDEXA_)
  when unset. MUST stay in sync with Head.php, which enqueues
  main-{slug}-ba-assets-{codeName}.css and localizes under VAR_PREFIX. Diverge → CSS
  404s (shipped as main-undefined-...) and localized window var undefined.

## REST
- restRequest (frontend/src/common/helpers/restRequest.ts) joins endpoint's own query string with
  API_URL.separator from Config::get('API_URL') ('?' pretty permalinks, '&' plain, where base already
  `?rest_route=...`). Keep field localized: without it, plain-permalink sites build `iconsundefinedpage=1`
  and every paginated/search request 404s (rest_no_route).

## Coding
- Prefer small reusable utils in separate file
- Highly reusable functions, classes, components: single responsibility, generic inputs via params/props, no hardcoded page/feature-specific values in shared code.
- REUSE FIRST: before new code, search codebase (frontend/src/common/helpers, frontend/src/components, backend/app/Services, backend/app/Models, etc.) for existing util/class/component; reuse or extend. Never duplicate existing logic.
- Similar logic in 2+ places → extract to shared util/class/component, update all callers.
- Match surrounding code style (naming, file layout, idioms, lint rules). Run lint before finishing.

## Architecture docs
- Keep this CLAUDE.md in sync with architecture. Architectural change → update this file in same change.
- Counts as architectural: new/removed/renamed module, service, model, route, REST endpoint, block, or shared util/component; data storage or schema changes (ib.json, ib.db, options); build/tooling/CI changes; new dependencies; changed frontend↔backend data flow; new conventions or constraints.
- Document what + why (constraints, gotchas, must-stay-in-sync pairs), not code obvious from files.

## Testing
- Tests encode intentional decisions for features + bug fixes.
- Test fails after feature modified → DO NOT auto-update test to match new behavior.
- Instead ask user: change feature behavior (then update test) or real bug introduced (then fix code)?
- Always 95%+ coverage; add critical + edge case tests
- Coverage PER FILE, not just global total: every source file added/touched must reach 95%+ lines, branches, functions, statements. High global average no excuse for under-covered file.
- Verify with `pnpm test:ts` (frontend, vitest v8) and `composer test:coverage` (PHP, --min=95); check per-file report for touched files below 95% before finishing.
- Exclude file from coverage only if truly untestable (generated code, bootstrap/entry shells, dev-only tooling); add comment in coverage config explaining why.
- Target branch coverage (every if/else both ways), not just line; aim full path coverage on non-trivial logic (branches, loops, parsers, security/data paths)
- Add test on bug fix + feature add
- Add test case every time function logic updates, all possible inputs/outputs
- Mutation testing (`composer test:mutation`, mutates backend/app/Services and backend/app/Models): mark every
  `$dir . DIRECTORY_SEPARATOR . 'file'` path WRITTEN to disk with `// @pest-mutate-ignore` on line
  above (see SQLiteDB::prepareDir / rebuildLocked). Concat mutant drops dir operand → run writes
  bare filename into CWD (plugin root, served by wp-env); stray deny-all .htaccess there 403s every
  plugin asset. Root .gitignore entries for those files only backstop.

### Browser/e2e selectors (Pest browser suite, tests/Browser)
- Target OUR components via `data-testid`, never raw CSS classes, antd/wp.components internals, or visible text. Refactor-safe, pierces shadow DOM.
- Add `data-testid` to source component when test needs hook; don't couple tests to styling classes.
- Exceptions (NO data-testid, use native selector):
  - WP-core DOM: block inserter, `iframe[name="editor-canvas"]`, wp-login, etc. Not ours; target by core selectors.
  - Frontend block output (static-save public HTML in FrontendRenderTest/SanitizerTest): shipped post content. NEVER inject test attrs there. Assert real class/attribute contract (`.wp-block-icon-shelf-icon`, `svg[role="img"]`, `viewBox`, sanitizer output) instead.


## APP
- wp-env docker WP app at http://localhost:8888/wp-admin/admin.php?page=icon-indexa#/
- user: admin, password: admin