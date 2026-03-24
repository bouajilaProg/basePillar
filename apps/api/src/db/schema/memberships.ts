import { pgTable, uuid, timestamp, pgEnum, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { organizations } from './organizations';

/**
 * Membership Role Enum
 *
 * Defines the role hierarchy within an organization.
 * - admin: Full access, can manage members and settings
 * - member: Standard access, can view and collaborate
 */
export const membershipRoleEnum = pgEnum('membership_role', ['admin', 'member']);

/**
 * Memberships Table (Join Table)
 *
 * Links users to organizations with a role.
 * Implements many-to-many relationship with additional attributes.
 *
 * Design decisions:
 * - Composite primary key (userId + orgId) prevents duplicates
 * - Role determines permissions within the organization
 * - CreatedAt for audit trail (when did user join?)
 */
export const memberships = pgTable(
  'memberships',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    role: membershipRoleEnum('role').notNull().default('member'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.organizationId] }),
  })
);

/**
 * Membership Relations
 *
 * Links back to user and organization.
 */
export const membershipsRelations = relations(memberships, ({ one }) => ({
  user: one(users, {
    fields: [memberships.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [memberships.organizationId],
    references: [organizations.id],
  }),
}));

export type Membership = typeof memberships.$inferSelect;
export type NewMembership = typeof memberships.$inferInsert;
export type MembershipRole = 'admin' | 'member';
