import { Injectable, Inject } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DB_CONNECTION, type Database } from '../db/db.module';
import * as schema from '../db/schema';
import { FoldersService } from './folders.service';

/**
 * AccessRulesService
 *
 * Manages fine-grained access control for resources.
 *
 * Access Logic:
 * 1. If ANY allow rule exists for the resource → whitelist mode
 *    - User must have an explicit allow rule (direct or via group)
 * 2. Else → open access mode
 *    - Access granted unless explicit deny rule exists
 * 3. Deny always takes precedence over allow
 * 4. Rules inherit up the folder hierarchy
 */

export type TargetType = 'file' | 'folder' | 'pointer';
export type SubjectType = 'user' | 'group';
export type AccessType = 'allow' | 'deny';
export type Permission = 'read' | 'write' | 'delete' | 'share';

export interface CreateAccessRuleDto {
  targetType: TargetType;
  targetId: string;
  subjectType: SubjectType;
  subjectId: string;
  accessType: AccessType;
  permission: Permission;
}

export interface CheckAccessParams {
  userId: string;
  targetType: TargetType;
  targetId: string;
  permission: Permission;
  checkInheritance?: boolean;
}

@Injectable()
export class AccessRulesService {
  constructor(
    @Inject(DB_CONNECTION)
    private readonly db: Database,
    private readonly foldersService: FoldersService
  ) {}

  /**
   * Create a new access rule
   *
   * @param dto - Rule creation parameters
   * @returns Created rule
   */
  async createRule(dto: CreateAccessRuleDto): Promise<schema.AccessRule> {
    const [rule] = await this.db.insert(schema.accessRules).values(dto).returning();

    return rule;
  }

  /**
   * Find all rules for a target resource
   *
   * @param targetType - Type of target (file/folder/pointer)
   * @param targetId - ID of the target resource
   * @returns Array of access rules
   */
  async findRulesForTarget(targetType: TargetType, targetId: string): Promise<schema.AccessRule[]> {
    const rules = await this.db
      .select()
      .from(schema.accessRules)
      .where(
        and(
          eq(schema.accessRules.targetType, targetType),
          eq(schema.accessRules.targetId, targetId)
        )
      );

    return rules;
  }

  /**
   * Delete an access rule
   *
   * @param ruleId - ID of the rule to delete
   */
  async deleteRule(ruleId: string): Promise<void> {
    await this.db.delete(schema.accessRules).where(eq(schema.accessRules.id, ruleId));
  }

  /**
   * Delete all rules for a target
   *
   * @param targetType - Type of target
   * @param targetId - ID of the target
   */
  async deleteRulesForTarget(targetType: TargetType, targetId: string): Promise<void> {
    await this.db
      .delete(schema.accessRules)
      .where(
        and(
          eq(schema.accessRules.targetType, targetType),
          eq(schema.accessRules.targetId, targetId)
        )
      );
  }

  /**
   * Check if a user has access to a resource
   *
   * @param params - Access check parameters
   * @returns true if access is granted, false otherwise
   */
  async checkAccess(params: CheckAccessParams): Promise<boolean> {
    const { userId, targetType, targetId, permission, checkInheritance = true } = params;

    // Get user's group memberships
    const userGroups = await this.getUserGroupIds(userId);

    // Check access on the target itself
    const directAccess = await this.checkAccessOnTarget(
      userId,
      userGroups,
      targetType,
      targetId,
      permission
    );

    // If we got a definitive answer (not null), return it
    if (directAccess !== null) {
      return directAccess;
    }

    // If inheritance is enabled and target is a folder, check parent folders
    if (checkInheritance && targetType === 'folder') {
      return this.checkAccessWithInheritance(userId, userGroups, targetId, permission);
    }

    // No rules found - open access mode, grant access
    return true;
  }

  /**
   * Check access on a specific target (no inheritance)
   *
   * @returns true/false if definitive, null if no rules apply
   */
  private async checkAccessOnTarget(
    userId: string,
    userGroups: string[],
    targetType: TargetType,
    targetId: string,
    permission: Permission
  ): Promise<boolean | null> {
    // Get all rules for this target
    const rules = await this.findRulesForTarget(targetType, targetId);

    if (rules.length === 0) {
      // No rules - need to check inheritance or default to open access
      return null;
    }

    // Filter rules for this permission
    const relevantRules = rules.filter((r) => r.permission === permission);

    if (relevantRules.length === 0) {
      return null;
    }

    // Check for explicit deny first (deny takes precedence)
    const hasDeny = relevantRules.some(
      (r) => r.accessType === 'deny' && this.ruleAppliesToUser(r, userId, userGroups)
    );

    if (hasDeny) {
      return false;
    }

    // Check if we're in whitelist mode (any allow rules exist)
    const hasAnyAllowRules = relevantRules.some((r) => r.accessType === 'allow');

    if (hasAnyAllowRules) {
      // Whitelist mode - check if user has explicit allow
      const hasAllow = relevantRules.some(
        (r) => r.accessType === 'allow' && this.ruleAppliesToUser(r, userId, userGroups)
      );
      return hasAllow;
    }

    // No allow rules - open access mode
    return null;
  }

  /**
   * Check access with folder inheritance
   */
  private async checkAccessWithInheritance(
    userId: string,
    userGroups: string[],
    folderId: string,
    permission: Permission
  ): Promise<boolean> {
    // Get folder path from root to current folder
    const path = await this.foldersService.getPath(folderId);

    // Check each folder in the path, from current to root
    for (let i = path.length - 1; i >= 0; i--) {
      const folder = path[i];
      const access = await this.checkAccessOnTarget(
        userId,
        userGroups,
        'folder',
        folder.id,
        permission
      );

      if (access !== null) {
        return access;
      }
    }

    // No rules found anywhere - open access
    return true;
  }

  /**
   * Check if a rule applies to a user (directly or via group)
   */
  private ruleAppliesToUser(
    rule: schema.AccessRule,
    userId: string,
    userGroups: string[]
  ): boolean {
    if (rule.subjectType === 'user') {
      return rule.subjectId === userId;
    }

    if (rule.subjectType === 'group') {
      return userGroups.includes(rule.subjectId);
    }

    return false;
  }

  /**
   * Get all group IDs that a user belongs to
   */
  private async getUserGroupIds(userId: string): Promise<string[]> {
    const memberships = await this.db
      .select({ groupId: schema.userGroupMembers.groupId })
      .from(schema.userGroupMembers)
      .where(eq(schema.userGroupMembers.userId, userId));

    return memberships.map((m) => m.groupId);
  }
}
