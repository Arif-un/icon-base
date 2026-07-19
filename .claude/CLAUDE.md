this is a wordpress plugin for icon called icon-base.

- always follow wordpress security best practise
- flag any security related issu as critical whenever found


- icon dataset: backend/data/ib.json is the tracked source of truth (commit it, never gitignore).
  The SQLite ib.db is GENERATED at runtime from that JSON into wp-content/uploads/icon-base/ (writable),
  version-gated by Config::DATA_VERSION vs the data_version option. Never commit or ship a binary .db,
  and never write to the plugin dir at runtime. Regenerate JSON with `pnpm db:export`; bump
  Config::DATA_VERSION whenever ib.json changes so installed sites rebuild.

## Testing
- Test cases encode intentional decisions for features and bug fixes.
- If a test fails after a feature is modified, DO NOT auto-update the test to match the new behavior.
- Instead, ask whether the user wants to change the feature's behavior (then update the test) or whether it is a real bug being introduced (then fix the code).