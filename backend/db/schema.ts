import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const iconType = sqliteTable('icon_type', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type').notNull().unique(),
})

export const library = sqliteTable('library', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').unique().notNull(),
  name: text('name').notNull(),
  meta: text('meta', { mode: 'json' }),
})

export const icons = sqliteTable('icons', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  typeId: integer('type_id').references(() => iconType.id),
  tags: text('tags'),
  libraryId: integer('library_id')
    .notNull()
    .references(() => library.id),
  filename: text('filename').notNull().unique(),
})
