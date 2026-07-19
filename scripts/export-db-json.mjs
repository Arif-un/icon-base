#!/usr/bin/env node
// Export the authoring SQLite db (backend/data/ib.db) to the tracked source-of-truth
// backend/data/ib.json. The plugin ships ib.json and regenerates ib.db at runtime.
// FTS tables (icons_fts*) are derived and intentionally NOT exported.
//
// Usage: pnpm db:export
// After running, bump Config::DATA_VERSION so installed sites rebuild their db.
import { createClient } from '@libsql/client'
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DB_PATH = path.join(ROOT, 'backend/data/ib.db')
const OUT_PATH = path.join(ROOT, 'backend/data/ib.json')

const DATA_VERSION = process.argv[2] || '1.0.0'

const client = createClient({ url: `file:${DB_PATH}` })

async function rows(sql) {
  const res = await client.execute(sql)

  return res.rows.map((r) => ({ ...r }))
}

const data = {
  version: DATA_VERSION,
  icon_type: await rows('SELECT id, type FROM icon_type ORDER BY id ASC'),
  library: await rows('SELECT id, slug, name, meta FROM library ORDER BY id ASC'),
  icons: await rows(
    'SELECT id, name, type_id, tags, library_id, filename FROM icons ORDER BY id ASC',
  ),
}

writeFileSync(OUT_PATH, JSON.stringify(data), 'utf-8')

console.log(
  `✅ Wrote ${OUT_PATH}\n   version=${data.version} types=${data.icon_type.length} `
    + `libraries=${data.library.length} icons=${data.icons.length}`,
)

client.close()
