import { pgTable, uuid, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * Target Type Enum
 *
 * Defines what resource type the access rule applies to.
 * - file: Physical file in S3
 * - folder: Directory
 * - pointer: File pointer (including shortcuts)
 */
export const targetTypeEnum = pgEnum('access_rule_target_type', ['file', 'folder', 'pointer']);

/**
 * Subject Type Enum
 *
 * Defines who the access rule applies to.
 * - user: Individual user
 * - group: User group
 */
export const subjectTypeEnum = pgEnum('access_rule_subject_type', ['user', 'group']);

/**
 * Access Type Enum
 *
 * Defines whether the rule allows or denies access.
 * - allow: Grant permission (whitelist)
 * - deny: Revoke permission (blacklist)
 */
export const accessTypeEnum = pgEnum('access_rule_access_type', ['allow', 'deny']);

/**
 * Permission Enum
 *
 * Defines atomic permissions that can be granted or denied.
 * - read: View file contents
 * - write: Modify file contents
 * - delete: Remove file/folder
 * - share: Create shortcuts or share with others
 */
export const permissionEnum = pgEnum('access_rule_permission', [
  'read',
  'write',
  'delete',
  'share',
]);

/**
 * Access Rules Table
 *
 * Defines fine-grained access control for resources.
 * Uses polymorphic references for flexibility.
 *
 * Design decisions:
 * - Polymorphic target (file/folder/pointer) via targetType + targetId
 * - Polymorphic subject (user/group) via subjectType + subjectId
 * - Atomic permissions for fine-grained control
 * - Index on (targetType, targetId) for efficient rule lookup
 *
 * Access logic:
 * 1. If ANY allow rule exists for resource → whitelist mode (must have explicit allow)
 * 2. Else → open access (denied only if explicit deny rule exists)
 * 3. Rules inherit up the folder hierarchy
 */
export const accessRules = pgTable(
  'access_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    targetType: targetTypeEnum('target_type').notNull(),
    targetId: uuid('target_id').notNull(),
    subjectType: subjectTypeEnum('subject_type').notNull(),
    subjectId: uuid('subject_id').notNull(),
    accessType: accessTypeEnum('access_type').notNull(),
    permission: permissionEnum('permission').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    // Index for efficient rule lookup by target
    targetIdx: index('access_rules_target_idx').on(table.targetType, table.targetId),
  })
);

/**
 * AccessRule Relations
 *
 * Note: Due to polymorphic nature, we don't define FK relations here.
 * Lookups are done via service layer with targetType + targetId.
 */
export const accessRulesRelations = relations(accessRules, () => ({}));

export type AccessRule = typeof accessRules.$inferSelect;
export type NewAccessRule = typeof accessRules.$inferInsert;
export type TargetType = 'file' | 'folder' | 'pointer';
export type SubjectType = 'user' | 'group';
export type AccessType = 'allow' | 'deny';
export type Permission = 'read' | 'write' | 'delete' | 'share';
