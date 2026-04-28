import { pgTable, uuid, varchar, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { files } from './files';
import { folders } from './folders';

/**
 * File Pointers Table
 *
 * Represents user-facing file entries that reference physical files.
 * Multiple pointers can reference the same physical file (shortcuts).
 *
 * Design decisions:
 * - UUID primary keys for security
 * - Separate from files table to support shortcuts
 * - name can differ from original (for shortcuts)
 * - isShortcut flag to distinguish originals from aliases
 * - Index on folderId for efficient folder listing
 * - When all pointers to a file are deleted, file is garbage collected
 */
export const filePointers = pgTable(
  'file_pointers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fileId: uuid('file_id')
      .notNull()
      .references(() => files.id, { onDelete: 'cascade' }),
    folderId: uuid('folder_id')
      .notNull()
      .references(() => folders.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    isShortcut: boolean('is_shortcut').notNull().default(false),
    isArchived: boolean('is_archived').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    // Index for efficient folder content listing
    folderIdx: index('file_pointers_folder_idx').on(table.folderId),
  })
);

/**
 * FilePointer Relations
 *
 * A file pointer:
 * - references one physical file
 * - exists within one folder
 */
export const filePointersRelations = relations(filePointers, ({ one }) => ({
  file: one(files, {
    fields: [filePointers.fileId],
    references: [files.id],
  }),
  folder: one(folders, {
    fields: [filePointers.folderId],
    references: [folders.id],
  }),
}));

export type FilePointer = typeof filePointers.$inferSelect;
export type NewFilePointer = typeof filePointers.$inferInsert;
