import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * Organizations Table
 *
 * Represents a team/company/workspace that users belong to.
 *
 * Design decisions:
 * - Name is unique to prevent confusion
 * - Slug is URL-friendly identifier for routing
 * - One organization is created per user registration (personal workspace)
 */
export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Organization Relations
 *
 * An organization has multiple memberships (members).
 */
export const organizationsRelations = relations(organizations, () => ({}));

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
