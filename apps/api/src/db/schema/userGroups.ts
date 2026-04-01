import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { filebases } from './filebases';

/**
 * User Groups Table
 *
 * Represents groups of users within a filebase.
 * Groups are used for bulk access control rules.
 *
 * Design decisions:
 * - UUID primary keys for security
 * - Groups are scoped to a filebase (not global)
 * - Group members are tracked in userGroupMembers table
 * - Access rules can target groups for bulk permissions
 */
export const userGroups = pgTable('user_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  filebaseId: uuid('filebase_id')
    .notNull()
    .references(() => filebases.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * UserGroup Relations
 *
 * A user group:
 * - belongs to one filebase
 * - has many members (via userGroupMembers)
 */
export const userGroupsRelations = relations(userGroups, ({ one }) => ({
  filebase: one(filebases, {
    fields: [userGroups.filebaseId],
    references: [filebases.id],
  }),
}));

export type UserGroup = typeof userGroups.$inferSelect;
export type NewUserGroup = typeof userGroups.$inferInsert;
