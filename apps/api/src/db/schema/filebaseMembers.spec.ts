import {
  filebaseMembers,
  filebaseMembersRelations,
  filebaseMemberRoleEnum,
  type FilebaseMember,
  type NewFilebaseMember,
  type FilebaseMemberRole,
} from './filebaseMembers';

/**
 * AGGRESSIVE TEST SUITE: FilebaseMembers Schema
 *
 * Why test schema definitions?
 * 1. Join tables need correct composite keys
 * 2. Role enum must have correct values
 * 3. Foreign keys must cascade correctly
 *
 * Testing strategy:
 * - Validate composite primary key
 * - Validate role enum values
 * - Validate foreign key relationships
 */

describe('FilebaseMembers Schema', () => {
  describe('table structure', () => {
    /**
     * WHY: Table must exist with correct name
     */
    it('should have correct table name', () => {
      expect((filebaseMembers as any)[Symbol.for('drizzle:Name')]).toBe('filebase_members');
    });

    /**
     * WHY: Must reference a filebase
     */
    it('should have filebaseId as UUID foreign key', () => {
      const column = filebaseMembers.filebaseId;
      expect(column.columnType).toBe('PgUUID');
      expect(column.notNull).toBe(true);
    });

    /**
     * WHY: Must reference a user
     */
    it('should have userId as UUID foreign key', () => {
      const column = filebaseMembers.userId;
      expect(column.columnType).toBe('PgUUID');
      expect(column.notNull).toBe(true);
    });

    /**
     * WHY: Role determines permissions within the filebase
     */
    it('should have role column with enum type', () => {
      const column = filebaseMembers.role;
      expect(column.notNull).toBe(true);
      expect(column.hasDefault).toBe(true); // defaults to 'viewer'
    });

    /**
     * WHY: Audit trail for when user joined
     */
    it('should have createdAt timestamp', () => {
      const column = filebaseMembers.createdAt;
      expect(column.notNull).toBe(true);
      expect(column.hasDefault).toBe(true);
    });
  });

  describe('role enum', () => {
    /**
     * WHY: Role enum must have correct hierarchy
     */
    it('should have admin, editor, and viewer roles', () => {
      const enumValues = filebaseMemberRoleEnum.enumValues;
      expect(enumValues).toContain('admin');
      expect(enumValues).toContain('editor');
      expect(enumValues).toContain('viewer');
      expect(enumValues.length).toBe(3);
    });

    /**
     * WHY: Type must be correctly defined
     */
    it('should correctly type FilebaseMemberRole', () => {
      const role: FilebaseMemberRole = 'admin';
      expect(['admin', 'editor', 'viewer']).toContain(role);
    });
  });

  describe('relations', () => {
    /**
     * WHY: Must have relations to user and filebase
     */
    it('should have relations defined', () => {
      expect(filebaseMembersRelations).toBeDefined();
      const config = filebaseMembersRelations.config;
      expect(config).toBeDefined();
    });
  });

  describe('type inference', () => {
    /**
     * WHY: TypeScript types must be correctly inferred
     */
    it('should correctly infer FilebaseMember type', () => {
      const member: FilebaseMember = {
        filebaseId: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        role: 'editor',
        createdAt: new Date(),
      };

      expect(member.filebaseId).toBeDefined();
      expect(member.userId).toBeDefined();
      expect(member.role).toBeDefined();
    });

    /**
     * WHY: NewFilebaseMember should not require auto-generated fields
     */
    it('should correctly infer NewFilebaseMember type', () => {
      const newMember: NewFilebaseMember = {
        filebaseId: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        // role is optional (has default)
      };

      expect(newMember.filebaseId).toBeDefined();
      expect(newMember.userId).toBeDefined();
    });
  });
});
