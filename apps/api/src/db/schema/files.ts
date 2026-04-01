import { pgTable, uuid, varchar, timestamp, bigint } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

/**
 * Files Table
 *
 * Represents physical files stored in S3/Garage.
 * This is the actual binary content - referenced by filePointers.
 *
 * Design decisions:
 * - UUID primary keys for security
 * - s3Key format: "{filebaseId}/{uuid}" for organized storage
 * - bigint for size to support files > 2GB
 * - Files can have multiple pointers (shortcuts)
 * - When all pointers are deleted, file is garbage collected
 */
export const files = pgTable('files', {
  id: uuid('id').primaryKey().defaultRandom(),
  s3Key: varchar('s3_key', { length: 512 }).notNull(),
  mimeType: varchar('mime_type', { length: 255 }).notNull(),
  size: bigint('size', { mode: 'bigint' }).notNull(),
  uploadedBy: uuid('uploaded_by')
    .notNull()
    .references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * File Relations
 *
 * A file:
 * - was uploaded by one user
 * - can have many file pointers (including shortcuts)
 */
export const filesRelations = relations(files, ({ one }) => ({
  uploader: one(users, {
    fields: [files.uploadedBy],
    references: [users.id],
  }),
}));

export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;
