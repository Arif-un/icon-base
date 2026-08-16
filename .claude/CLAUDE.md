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

## Testing
- Test cases encode intentional decisions for features and bug fixes.
- If a test fails after a feature is modified, DO NOT auto-update the test to match the new behavior.
- Instead, ask whether the user wants to change the feature's behavior (then update the test) or whether it is a real bug being introduced (then fix the code).