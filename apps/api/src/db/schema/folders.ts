import { pgTable, uuid, varchar, timestamp, index, AnyPgColumn } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { filebases } from './filebases';

/**
 * Folders Table
 *
 * Represents directories in the file system hierarchy.
 * Each folder belongs to a filebase and can have a parent folder.
 *
 * Design decisions:
 * - UUID primary keys for security
 * - Self-referential FK for folder hierarchy
 * - parentId is nullable for root folders (only "root" folder has null)
 * - Index on (filebaseId, parentId) for efficient listing
 * - Root folder is auto-created with name "root" when filebase is created
 */
export const folders = pgTable(
  'folders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    filebaseId: uuid('filebase_id')
      .notNull()
      .references(() => filebases.id, { onDelete: 'cascade' }),
    // Self-referential FK - use AnyPgColumn to avoid circular type reference
    parentId: uuid('parent_id').references((): AnyPgColumn => folders.id, {
      onDelete: 'cascade',
    }),
    name: varchar('name', { length: 255 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    // Index for efficient folder listing within a filebase
    filebaseParentIdx: index('folders_filebase_parent_idx').on(table.filebaseId, table.parentId),
  })
);

/**
 * Folder Relations
 *
 * A folder:
 * - belongs to one filebase
 * - optionally has one parent folder
 * - can have many children folders
 * - can have many file pointers
 */
export const foldersRelations = relations(folders, ({ one, many }) => ({
  filebase: one(filebases, {
    fields: [folders.filebaseId],
    references: [filebases.id],
  }),
  parent: one(folders, {
    fields: [folders.parentId],
    references: [folders.id],
    relationName: 'parentChild',
  }),
  children: many(folders, {
    relationName: 'parentChild',
  }),
}));

export type Folder = typeof folders.$inferSelect;
export type NewFolder = typeof folders.$inferInsert;
