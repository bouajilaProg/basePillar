import { pgTable, uuid, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { filebases } from './filebases';
import { folders } from './folders';
import { users } from './users';

/**
 * Stars Table
 *
 * Stores per-user starred folders inside a filebase.
 * Each user has an independent star list for each filebase.
 */
export const stars = pgTable(
  'stars',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    filebaseId: uuid('filebase_id')
      .notNull()
      .references(() => filebases.id, { onDelete: 'cascade' }),
    folderId: uuid('folder_id')
      .notNull()
      .references(() => folders.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userListIdx: index('stars_user_list_idx').on(table.filebaseId, table.userId, table.createdAt),
    uniqueStarIdx: uniqueIndex('stars_unique_user_folder_idx').on(
      table.filebaseId,
      table.folderId,
      table.userId
    ),
  })
);

export const starsRelations = relations(stars, ({ one }) => ({
  filebase: one(filebases, {
    fields: [stars.filebaseId],
    references: [filebases.id],
  }),
  folder: one(folders, {
    fields: [stars.folderId],
    references: [folders.id],
  }),
  user: one(users, {
    fields: [stars.userId],
    references: [users.id],
  }),
}));

export type Star = typeof stars.$inferSelect;
export type NewStar = typeof stars.$inferInsert;
