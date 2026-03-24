import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { memberships } from './memberships';

/**
 * Users Table
 *
 * Stores user authentication and profile data.
 * Password is stored as bcrypt hash - NEVER store plaintext passwords.
 *
 * Design decisions:
 * - UUID primary keys for security (not guessable sequence)
 * - Email as unique identifier for login
 * - Timestamps for audit trail
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * User Relations
 *
 * A user can have multiple memberships (belong to multiple organizations).
 */
export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(memberships),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
