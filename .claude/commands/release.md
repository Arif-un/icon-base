---
description: Cut a WordPress.org release (auto-detects code vs assets-only) for Icon Indexa
---

Drive a release of the Icon Indexa plugin. The heavy lifting lives in
`scripts/release.mjs`; your job is to gather the human decisions and invoke it
non-interactively.

Steps:

1. Sanity: confirm we're on `main` and the tree is the intended release content.
   Run `git fetch --tags` then `git describe --tags --abbrev=0` to get the last tag.

2. Detect the changes since the last tag:
   - `git diff --name-only <lastTag> --` plus `git ls-files --others --exclude-standard`
   - Classify as **ASSETS-ONLY** if every changed path is under `wp-assets/` or is
     `readme.txt`; otherwise it's a **CODE** release.

3. Show me the changed file list and the detected type.

4. Branch:
   - **ASSETS-ONLY**: confirm with me, then run:
     `node scripts/release.mjs --type assets --message "<short desc>" --yes`
   - **CODE**: ask me (use the question picker) for the bump type
     (patch = small fix / minor = feature / major) and a one-line changelog, then run:
     `node scripts/release.mjs --type <patch|minor|major> --changelog "<line>" --yes`

5. Report what happened: the new version/tag (code) or the dispatched asset update,
   and that the GitHub Actions `Deploy to WordPress.org` workflow was triggered.

Notes:
- Code releases bump `icon-indexa.php`, `readme.txt` (Stable tag + changelog), and
  `package.json`, commit `release: vX.Y.Z`, tag, push, and create a GitHub release.
- Assets-only updates do NOT bump the version (no phantom WP.org release); they push
  `wp-assets/` + `readme.txt` and dispatch the asset-update workflow.
- Never edit tests to match changed behavior without asking (project rule).
