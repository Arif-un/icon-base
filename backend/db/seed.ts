import { createClient } from '@libsql/client'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/libsql'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { iconType, icons } from './schema.js'

const jsonPath = process.argv[2]
const libraryId = Number(process.argv[3])

if (!jsonPath || !libraryId) {
  console.error('Usage: pnpm db:seed <path-to-json> <library_id>')
  process.exit(1)
}

interface IconEntry {
  name: string
  fileName: string
  type?: string
  tags?: string
}

const data: IconEntry[] = JSON.parse(readFileSync(resolve(jsonPath), 'utf-8'))

const client = createClient({ url: `file:${resolve(import.meta.dirname, '../data/ib.db')}` })
const db = drizzle(client)

const typeCache = new Map<string, number>()

for (const entry of data) {
  let typeId: number | undefined

  if (entry.type) {
    if (!typeCache.has(entry.type)) {
      const [row] = await db
        .select({ id: iconType.id })
        .from(iconType)
        .where(eq(iconType.type, entry.type))

      if (!row) {
        console.error(`Type "${entry.type}" not found in icon_type table. Skipping ${entry.fileName}`)
        continue
      }
      typeCache.set(entry.type, row.id)
    }
    typeId = typeCache.get(entry.type)
  }

  await db
    .insert(icons)
    .values({
      name: entry.name,
      filename: entry.fileName,
      typeId,
      tags: entry.tags,
      libraryId,
    })
    .onConflictDoNothing()

  console.log(`+ ${entry.fileName}`)
}

console.log(`\nDone. Processed ${data.length} icons.`)
client.close()
