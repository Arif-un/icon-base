#!/usr/bin/env node
import { execSync } from 'node:child_process'
import path from 'node:path'
import process, { exit } from 'node:process'

import fse from 'fs-extra'

const SLUG = 'icon-base' 
const OUT_DIR = 'build'
const PLUGIN_DIR = `${OUT_DIR}/${SLUG}`
const ZIP_FILE = `${OUT_DIR}/${SLUG}.zip`

const FILES = [
  'assets',
  'backend',
  'icons',
  'languages',
  `${SLUG}.php`,
  'readme.txt',
  'LICENSE',
  'composer.json',
]

// Files/patterns that must never ship in the distributed plugin.
const EXCLUDE = /(?:^|[\\/])(?:\.DS_Store|Thumbs\.db|\.git.*|robots\.txt)$/

function commandExistsSync(cmd) {
  try {
    execSync(cmd, { stdio: 'pipe' })

    return true
  }
  catch {
    console.log(`${cmd} not found`)

    return false
  }
}

async function copyFiles(files, dest) {
  await Promise.all(
    files.map(async (item) => {
      console.log(`➡️  Copying ${item}`)

      return fse.copy(item, path.join(dest, path.basename(item)), {
        overwrite: true,
        filter: (src) => !EXCLUDE.test(src),
      })
    }),
  )
}

if (process.platform === 'win32') {
  console.error('⛔ Run from Linux/macOS/WSL')
  exit(1)
}

if (!commandExistsSync('composer --version') || !commandExistsSync('zip --version')) {
  exit(1)
}

console.log('🔨 Building frontend...')
execSync('pnpm prod', { stdio: 'inherit' })

console.log('\n📦 Preparing output directory...')
await Promise.all([fse.emptyDir(PLUGIN_DIR), fse.remove(ZIP_FILE)])
  .catch((err) => { console.error(err); exit(1) })

await copyFiles(FILES, PLUGIN_DIR)

console.log('\n🎼 Installing composer dependencies...')
execSync('composer install --no-dev', { cwd: PLUGIN_DIR, stdio: 'inherit' })
execSync('composer dump-autoload -o', { cwd: PLUGIN_DIR, stdio: 'inherit' })
fse.removeSync(`${PLUGIN_DIR}/composer.lock`)

console.log('\n🗜️  Creating zip...')
execSync(`zip -r ${SLUG}.zip ${SLUG} -x "*.DS_Store" "*/Thumbs.db" "*/robots.txt"`, { cwd: OUT_DIR, stdio: 'inherit' })

console.log(`\n✅ Done → ${ZIP_FILE} + ${PLUGIN_DIR}/`)
