import { pgTable, uuid, timestamp, pgEnum, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { filebases } from './filebases';

/**
 * Filebase Member Role Enum
 *
 * Defines the role hierarchy within a filebase.
 * - admin: Full access, can manage members and settings
 * - editor: Can read, write, and delete files/folders
 * - viewer: Can only read files/folders
 */
export const filebaseMemberRoleEnum = pgEnum('filebase_member_role', ['admin', 'editor', 'viewer']);

/**
 * Filebase Members Table (Join Table)
 *
 * Links users to filebases they have access to (not as owner).
 * Implements many-to-many relationship with additional attributes.
 *
 * Design decisions:
 * - Composite primary key (filebaseId + userId) prevents duplicates
 * - Role determines permissions within the filebase
 * - CreatedAt for audit trail (when did user join?)
 * - Default role is 'viewer' (most restrictive)
 */
export const filebaseMembers = pgTable(
  'filebase_members',
  {
    filebaseId: uuid('filebase_id')
      .notNull()
      .references(() => filebases.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: filebaseMemberRoleEnum('role').notNull().default('viewer'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.filebaseId, table.userId] }),
  })
);

/**
 * FilebaseMember Relations
 *
 * Links back to user and filebase.
 */
export const filebaseMembersRelations = relations(filebaseMembers, ({ one }) => ({
  user: one(users, {
    fields: [filebaseMembers.userId],
    references: [users.id],
  }),
  filebase: one(filebases, {
    fields: [filebaseMembers.filebaseId],
    references: [filebases.id],
  }),
}));

export type FilebaseMember = typeof filebaseMembers.$inferSelect;
export type NewFilebaseMember = typeof filebaseMembers.$inferInsert;
export type FilebaseMemberRole = 'admin' | 'editor' | 'viewer';
