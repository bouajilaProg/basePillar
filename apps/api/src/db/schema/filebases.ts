import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

/**
 * Filebases Table
 *
 * Represents a user's personal file storage space.
 * Each user can have at most ONE filebase (enforced by unique ownerId).
 *
 * Design decisions:
 * - UUID primary keys for security (not guessable sequence)
 * - ownerId is unique - one filebase per user maximum
 * - Creating a filebase is optional (users can be "workers" without one)
 * - A root folder is auto-created when filebase is created (via trigger)
 */
export const filebases = pgTable('filebases', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Filebase Relations
 *
 * A filebase belongs to one owner (user).
 * A filebase has many members, folders, and user groups (defined in their respective schemas).
 */
export const filebasesRelations = relations(filebases, ({ one }) => ({
  owner: one(users, {
    fields: [filebases.ownerId],
    references: [users.id],
  }),
}));

export type Filebase = typeof filebases.$inferSelect;
export type NewFilebase = typeof filebases.$inferInsert;
