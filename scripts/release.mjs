#!/usr/bin/env node
// Release driver for the Icon Indexa WordPress plugin.
//
// Detects whether the changes since the last git tag are an ASSETS-ONLY update
// (wp-assets/** and/or readme.txt) or a CODE release, then:
//   code   -> bump version files, insert changelog, commit, tag vX.Y.Z, push,
//             create a GitHub release (fires the full WP.org deploy workflow).
//   assets -> commit + push, then trigger the asset-update workflow via
//             `gh workflow run` (no version bump, no phantom WP.org release).
//
// Usage:
//   node scripts/release.mjs                                  # interactive
//   node scripts/release.mjs --type patch|minor|major        # code release
//   node scripts/release.mjs --type assets                   # force assets-only
//   node scripts/release.mjs --type minor --changelog "..." --yes
//
// ponytail: asset-vs-code detection is a plain path-prefix match on the diff
// since the last tag; if the shippable-path map grows, lift it into a shared list.

import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline/promises'
import process, { exit, stdin, stdout } from 'node:process'

const WORKFLOW = 'deploy.yml'
const ASSET_PATHS = ['wp-assets/'] // dir prefixes that count as assets-only
const ASSET_FILES = ['readme.txt'] // exact files that count as assets-only

function sh(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], ...opts }).trim()
}
function run(cmd) {
  console.log(`$ ${cmd}`)
  execSync(cmd, { stdio: 'inherit' })
}
function die(msg) {
  console.error(`\n⛔ ${msg}`)
  exit(1)
}

function parseArgs(argv) {
  const args = { yes: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--yes' || a === '-y') args.yes = true
    else if (a === '--type') args.type = argv[++i]
    else if (a === '--changelog') args.changelog = argv[++i]
    else if (a === '--message') args.message = argv[++i]
    else die(`Unknown argument: ${a}`)
  }
  return args
}

function bump(version, type) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(version)
  if (!m) die(`Current version "${version}" is not X.Y.Z`)
  let [maj, min, pat] = m.slice(1).map(Number)
  if (type === 'major') { maj++; min = 0; pat = 0 }
  else if (type === 'minor') { min++; pat = 0 }
  else if (type === 'patch') { pat++ }
  else die(`Unknown bump type: ${type}`)
  return `${maj}.${min}.${pat}`
}

function isAssetOnly(files) {
  if (files.length === 0) return false
  return files.every(
    (f) => ASSET_FILES.includes(f) || ASSET_PATHS.some((p) => f.startsWith(p)),
  )
}

function changedSinceTag(tag) {
  const tracked = sh(`git diff --name-only ${tag} --`).split('\n').filter(Boolean)
  const untracked = sh('git ls-files --others --exclude-standard').split('\n').filter(Boolean)
  return [...new Set([...tracked, ...untracked])].sort()
}

// --- version-file edits (regex, formatting-preserving) ---
function editFile(path, replacer) {
  const before = readFileSync(path, 'utf8')
  const after = replacer(before)
  if (after === before) die(`No change applied to ${path} (pattern not found?)`)
  writeFileSync(path, after)
}

function bumpVersionFiles(newVersion, changelog) {
  editFile('icon-indexa.php', (s) =>
    s.replace(/(\*\s*Version:\s*)\d+\.\d+\.\d+/, `$1${newVersion}`))
  editFile('readme.txt', (s) =>
    s.replace(/(Stable tag:\s*)\d+\.\d+\.\d+/, `$1${newVersion}`))
  editFile('package.json', (s) =>
    s.replace(/("version":\s*")\d+\.\d+\.\d+(")/, `$1${newVersion}$2`))
  insertChangelog(newVersion, changelog)
}

function insertChangelog(newVersion, changelog) {
  const bullets = changelog
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => (/^[*-]/.test(l) ? l.replace(/^-/, '*') : `* ${l}`))
    .join('\n')
  const block = `= ${newVersion} =\n\n${bullets}\n\n`
  editFile('readme.txt', (s) => {
    const marker = '== Changelog ==\n\n'
    const idx = s.indexOf(marker)
    if (idx === -1) die('readme.txt has no "== Changelog ==" section')
    const at = idx + marker.length
    return s.slice(0, at) + block + s.slice(at)
  })
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  // Preconditions.
  try { sh('git rev-parse --is-inside-work-tree') } catch { die('Not a git repository') }
  try { sh('gh --version') } catch { die('GitHub CLI (gh) is required') }
  const branch = sh('git rev-parse --abbrev-ref HEAD')
  if (branch !== 'main' && !args.yes) die(`On branch "${branch}", not main. Use --yes to override.`)

  let lastTag
  try { lastTag = sh('git describe --tags --abbrev=0') }
  catch { die('No git tags found. Create the baseline tag first (e.g. v1.0.0).') }

  const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
  const current = pkg.version
  const changed = changedSinceTag(lastTag)
  if (changed.length === 0) die(`No changes since ${lastTag}. Nothing to release.`)

  const detectedAssets = isAssetOnly(changed)
  const forced = args.type === 'assets' ? 'assets' : args.type ? 'code' : null

  console.log(`\nLast tag:        ${lastTag}`)
  console.log(`Current version: ${current}`)
  console.log(`Changed files (${changed.length}):`)
  changed.forEach((f) => console.log(`  ${f}`))
  console.log(`\nDetected: ${detectedAssets ? 'ASSETS-ONLY' : 'CODE'} release`)

  const rl = args.yes ? null : createInterface({ input: stdin, output: stdout })
  const ask = async (q) => (rl ? (await rl.question(q)).trim() : '')

  // Resolve mode.
  let assetsOnly = detectedAssets
  if (forced) assetsOnly = forced === 'assets'
  if (forced && detectedAssets !== assetsOnly) {
    console.log(`⚠️  Forced --type=${args.type} overrides auto-detection.`)
  }

  if (assetsOnly) {
    const msg = args.message || args.changelog
      || (rl ? await ask('Commit message for assets update: ') : 'Update WordPress.org assets')
    if (!args.yes) {
      const ok = await ask('\nProceed with ASSETS-ONLY update to WordPress.org? [y/N] ')
      if (!/^y/i.test(ok)) { rl?.close(); die('Aborted.') }
    }
    rl?.close()
    run('git add -A')
    run(`git commit -m ${JSON.stringify(`assets: ${msg}`)}`)
    run('git push origin HEAD')
    run(`gh workflow run ${WORKFLOW} -f mode=assets`)
    console.log('\n✅ Assets pushed. Asset-update workflow dispatched (no version bump).')
    return
  }

  // Code release.
  let type = forced ? args.type : ''
  while (!['patch', 'minor', 'major'].includes(type)) {
    if (args.yes) die('Code release requires --type patch|minor|major with --yes')
    type = (await ask('\nBump type — patch (small fix) / minor (feature) / major: ')).toLowerCase()
  }
  const newVersion = bump(current, type)

  let changelog = args.changelog || ''
  while (!changelog) {
    if (args.yes) die('Code release requires --changelog "..." with --yes')
    changelog = await ask(`Changelog for ${newVersion} (one line): `)
  }

  console.log(`\n→ Release: ${current} → ${newVersion} (${type})`)
  console.log(`→ Changelog:\n${changelog}`)
  if (!args.yes) {
    const ok = await ask(`\nBump, tag v${newVersion}, push and create GitHub release? [y/N] `)
    if (!/^y/i.test(ok)) { rl?.close(); die('Aborted.') }
  }
  rl?.close()

  bumpVersionFiles(newVersion, changelog)
  run('git add -A')
  run(`git commit -m ${JSON.stringify(`release: v${newVersion}`)}`)
  run(`git tag v${newVersion}`)
  run('git push origin HEAD --follow-tags')
  run(`gh release create v${newVersion} --title ${JSON.stringify(newVersion)} --notes ${JSON.stringify(changelog)}`)
  console.log(`\n✅ Released v${newVersion}. Full WP.org deploy workflow triggered by the GitHub release.`)
}

main().catch((e) => die(e.message || String(e)))
