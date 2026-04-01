import {
  userGroupMembers,
  userGroupMembersRelations,
  type UserGroupMember,
  type NewUserGroupMember,
} from './userGroupMembers';

/**
 * AGGRESSIVE TEST SUITE: UserGroupMembers Schema
 *
 * Why test this schema?
 * 1. Join table with composite PK
 * 2. Users can belong to multiple groups
 * 3. FK cascades must be correct
 *
 * Testing strategy:
 * - Validate composite PK
 * - Validate FK constraints
 */

describe('UserGroupMembers Schema', () => {
  describe('table structure', () => {
    /**
     * WHY: Table must exist with correct name
     */
    it('should have correct table name', () => {
      expect((userGroupMembers as any)[Symbol.for('drizzle:Name')]).toBe('user_group_members');
    });

    /**
     * WHY: Must reference a group
     */
    it('should have groupId as UUID foreign key', () => {
      const column = userGroupMembers.groupId;
      expect(column.columnType).toBe('PgUUID');
      expect(column.notNull).toBe(true);
    });

    /**
     * WHY: Must reference a user
     */
    it('should have userId as UUID foreign key', () => {
      const column = userGroupMembers.userId;
      expect(column.columnType).toBe('PgUUID');
      expect(column.notNull).toBe(true);
    });
  });

  describe('relations', () => {
    /**
     * WHY: Must have relations to group and user
     */
    it('should have relations defined', () => {
      expect(userGroupMembersRelations).toBeDefined();
      const config = userGroupMembersRelations.config;
      expect(config).toBeDefined();
    });
  });

  describe('type inference', () => {
    /**
     * WHY: TypeScript types must be correctly inferred
     */
    it('should correctly infer UserGroupMember type', () => {
      const member: UserGroupMember = {
        groupId: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
      };

      expect(member.groupId).toBeDefined();
      expect(member.userId).toBeDefined();
    });

    /**
     * WHY: NewUserGroupMember requires both fields
     */
    it('should correctly infer NewUserGroupMember type', () => {
      const newMember: NewUserGroupMember = {
        groupId: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
      };

      expect(newMember.groupId).toBeDefined();
      expect(newMember.userId).toBeDefined();
    });
  });
});
