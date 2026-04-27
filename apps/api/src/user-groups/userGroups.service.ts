import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DB_CONNECTION, type Database } from '../db/db.module';
import * as schema from '../db/schema';

/**
 * UserGroupsService
 *
 * Manages user groups within filebases.
 * Groups enable bulk permission management through access rules.
 *
 * Design:
 * - Groups are scoped to a filebase
 * - Names must be unique within a filebase
 * - Users can belong to multiple groups
 * - Used by AccessRulesService for permission checks
 */

export interface CreateGroupDto {
  filebaseId: string;
  name: string;
}

@Injectable()
export class UserGroupsService {
  constructor(
    @Inject(DB_CONNECTION)
    private readonly db: Database
  ) {}

  /**
   * Create a new user group
   *
   * @param dto - Group creation parameters
   * @returns Created group
   * @throws ConflictException if name already exists in filebase
   */
  async create(dto: CreateGroupDto): Promise<schema.UserGroup> {
    const { filebaseId, name } = dto;

    // Check for duplicate name in filebase
    const [existing] = await this.db
      .select()
      .from(schema.userGroups)
      .where(and(eq(schema.userGroups.filebaseId, filebaseId), eq(schema.userGroups.name, name)));

    if (existing) {
      throw new ConflictException('Group with this name already exists in filebase');
    }

    // Create group
    const [group] = await this.db
      .insert(schema.userGroups)
      .values({ filebaseId, name })
      .returning();

    return group;
  }

  /**
   * Find a group by ID
   *
   * @param id - Group ID
   * @returns Group
   * @throws NotFoundException if not found
   */
  async findById(id: string): Promise<schema.UserGroup> {
    const [group] = await this.db
      .select()
      .from(schema.userGroups)
      .where(eq(schema.userGroups.id, id));

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    return group;
  }

  /**
   * Find all groups in a filebase
   *
   * @param filebaseId - Filebase ID
   * @returns Array of groups
   */
  async findByFilebaseId(filebaseId: string): Promise<schema.UserGroup[]> {
    const groups = await this.db
      .select()
      .from(schema.userGroups)
      .where(eq(schema.userGroups.filebaseId, filebaseId));

    return groups;
  }

  /**
   * Rename a group
   *
   * @param id - Group ID
   * @param newName - New name
   * @returns Updated group
   * @throws NotFoundException if group not found
   * @throws ConflictException if new name already exists
   */
  async rename(id: string, newName: string): Promise<schema.UserGroup> {
    // Get group
    const [group] = await this.db
      .select()
      .from(schema.userGroups)
      .where(eq(schema.userGroups.id, id));

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // Check for name conflict
    const [existing] = await this.db
      .select()
      .from(schema.userGroups)
      .where(
        and(eq(schema.userGroups.filebaseId, group.filebaseId), eq(schema.userGroups.name, newName))
      );

    if (existing && existing.id !== id) {
      throw new ConflictException('Group with this name already exists in filebase');
    }

    // Update
    const [updated] = await this.db
      .update(schema.userGroups)
      .set({ name: newName })
      .where(eq(schema.userGroups.id, id))
      .returning();

    return updated;
  }

  /**
   * Delete a group
   *
   * @param id - Group ID
   * @throws NotFoundException if group not found
   */
  async delete(id: string): Promise<void> {
    // Check group exists
    const [group] = await this.db
      .select()
      .from(schema.userGroups)
      .where(eq(schema.userGroups.id, id));

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // Delete (cascade deletes members and access rules)
    await this.db.delete(schema.userGroups).where(eq(schema.userGroups.id, id));
  }

  /**
   * Add a user to a group
   *
   * @param groupId - Group ID
   * @param userId - User ID
   * @returns Created membership
   * @throws NotFoundException if group not found
   * @throws ConflictException if user already in group
   */
  async addMember(groupId: string, userId: string): Promise<schema.UserGroupMember> {
    // Check group exists
    const [group] = await this.db
      .select()
      .from(schema.userGroups)
      .where(eq(schema.userGroups.id, groupId));

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // Check for existing membership
    const [existing] = await this.db
      .select()
      .from(schema.userGroupMembers)
      .where(
        and(
          eq(schema.userGroupMembers.groupId, groupId),
          eq(schema.userGroupMembers.userId, userId)
        )
      );

    if (existing) {
      throw new ConflictException('User is already a member of this group');
    }

    // Add member
    const [member] = await this.db
      .insert(schema.userGroupMembers)
      .values({ groupId, userId })
      .returning();

    return member;
  }

  /**
   * Remove a user from a group
   *
   * @param groupId - Group ID
   * @param userId - User ID
   * @throws NotFoundException if membership not found
   */
  async removeMember(groupId: string, userId: string): Promise<void> {
    // Check membership exists
    const [membership] = await this.db
      .select()
      .from(schema.userGroupMembers)
      .where(
        and(
          eq(schema.userGroupMembers.groupId, groupId),
          eq(schema.userGroupMembers.userId, userId)
        )
      );

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    // Remove
    await this.db
      .delete(schema.userGroupMembers)
      .where(
        and(
          eq(schema.userGroupMembers.groupId, groupId),
          eq(schema.userGroupMembers.userId, userId)
        )
      );
  }

  /**
   * Get all members of a group
   *
   * @param groupId - Group ID
   * @returns Array of memberships
   */
  async getMembers(groupId: string): Promise<schema.UserGroupMember[]> {
    const members = await this.db
      .select()
      .from(schema.userGroupMembers)
      .where(eq(schema.userGroupMembers.groupId, groupId));

    return members;
  }

  /**
   * Get all groups a user belongs to in a filebase
   *
   * @param userId - User ID
   * @param filebaseId - Filebase ID
   * @returns Array of memberships with group info
   */
  async getUserGroups(userId: string, filebaseId: string): Promise<schema.UserGroupMember[]> {
    const memberships = await this.db
      .select({
        groupId: schema.userGroupMembers.groupId,
        userId: schema.userGroupMembers.userId,
      })
      .from(schema.userGroupMembers)
      .innerJoin(schema.userGroups, eq(schema.userGroupMembers.groupId, schema.userGroups.id))
      .where(
        and(
          eq(schema.userGroupMembers.userId, userId),
          eq(schema.userGroups.filebaseId, filebaseId)
        )
      );

    return memberships;
  }

  /**
   * Get array of group IDs for a user in a filebase
   *
   * Used by AccessRulesService for permission checks.
   *
   * @param userId - User ID
   * @param filebaseId - Filebase ID
   * @returns Array of group IDs
   */
  async getUserGroupIds(userId: string, filebaseId: string): Promise<string[]> {
    const memberships = await this.getUserGroups(userId, filebaseId);
    return memberships.map((m) => m.groupId);
  }

  /**
   * Check if a user is in a specific group
   *
   * @param groupId - Group ID
   * @param userId - User ID
   * @returns True if user is in group
   */
  async isUserInGroup(groupId: string, userId: string): Promise<boolean> {
    const [membership] = await this.db
      .select()
      .from(schema.userGroupMembers)
      .where(
        and(
          eq(schema.userGroupMembers.groupId, groupId),
          eq(schema.userGroupMembers.userId, userId)
        )
      );

    return !!membership;
  }
}
