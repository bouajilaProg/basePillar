import { pgTable, uuid, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { userGroups } from './userGroups';

/**
 * User Group Members Table (Join Table)
 *
 * Links users to groups they belong to.
 * Implements many-to-many relationship between users and groups.
 *
 * Design decisions:
 * - Composite primary key (groupId + userId) prevents duplicates
 * - Cascade delete when group or user is deleted
 * - Users can belong to multiple groups across different filebases
 */
export const userGroupMembers = pgTable(
  'user_group_members',
  {
    groupId: uuid('group_id')
      .notNull()
      .references(() => userGroups.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.groupId, table.userId] }),
  })
);

/**
 * UserGroupMember Relations
 *
 * Links back to user and group.
 */
export const userGroupMembersRelations = relations(userGroupMembers, ({ one }) => ({
  user: one(users, {
    fields: [userGroupMembers.userId],
    references: [users.id],
  }),
  group: one(userGroups, {
    fields: [userGroupMembers.groupId],
    references: [userGroups.id],
  }),
}));

export type UserGroupMember = typeof userGroupMembers.$inferSelect;
export type NewUserGroupMember = typeof userGroupMembers.$inferInsert;
