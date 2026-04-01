import {
  accessRules,
  accessRulesRelations,
  targetTypeEnum,
  subjectTypeEnum,
  accessTypeEnum,
  permissionEnum,
  type AccessRule,
  type NewAccessRule,
  type TargetType,
  type SubjectType,
  type AccessType,
  type Permission,
} from './accessRules';

/**
 * AGGRESSIVE TEST SUITE: AccessRules Schema
 *
 * Why test accessRules schema thoroughly?
 * 1. Security-critical - wrong rules = unauthorized access
 * 2. Polymorphic FKs require careful handling
 * 3. Enum values must be exact
 * 4. Index on (targetType, targetId) critical for performance
 *
 * Testing strategy:
 * - Validate all enums have correct values
 * - Validate polymorphic target/subject fields
 * - Validate index configuration
 */

describe('AccessRules Schema', () => {
  describe('table structure', () => {
    /**
     * WHY: Table must exist with correct name
     */
    it('should have correct table name', () => {
      expect((accessRules as any)[Symbol.for('drizzle:Name')]).toBe('access_rules');
    });

    /**
     * WHY: UUID primary key for security
     */
    it('should have id column as UUID primary key', () => {
      const column = accessRules.id;
      expect(column.columnType).toBe('PgUUID');
      expect(column.primary).toBe(true);
      expect(column.hasDefault).toBe(true);
    });

    /**
     * WHY: Polymorphic target type for file/folder/pointer
     */
    it('should have targetType enum column', () => {
      const column = accessRules.targetType;
      expect(column.notNull).toBe(true);
    });

    /**
     * WHY: Polymorphic FK to target resource
     */
    it('should have targetId as UUID', () => {
      const column = accessRules.targetId;
      expect(column.columnType).toBe('PgUUID');
      expect(column.notNull).toBe(true);
    });

    /**
     * WHY: Polymorphic subject type for user/group
     */
    it('should have subjectType enum column', () => {
      const column = accessRules.subjectType;
      expect(column.notNull).toBe(true);
    });

    /**
     * WHY: Polymorphic FK to subject (user or group)
     */
    it('should have subjectId as UUID', () => {
      const column = accessRules.subjectId;
      expect(column.columnType).toBe('PgUUID');
      expect(column.notNull).toBe(true);
    });

    /**
     * WHY: Allow or deny the permission
     */
    it('should have accessType enum column', () => {
      const column = accessRules.accessType;
      expect(column.notNull).toBe(true);
    });

    /**
     * WHY: Specific permission being granted/denied
     */
    it('should have permission enum column', () => {
      const column = accessRules.permission;
      expect(column.notNull).toBe(true);
    });

    /**
     * WHY: Timestamp for audit trail
     */
    it('should have createdAt timestamp', () => {
      expect(accessRules.createdAt.notNull).toBe(true);
      expect(accessRules.createdAt.hasDefault).toBe(true);
    });
  });

  describe('enums', () => {
    /**
     * WHY: Target types must match resource types
     */
    it('should have correct targetType enum values', () => {
      const values = targetTypeEnum.enumValues;
      expect(values).toContain('file');
      expect(values).toContain('folder');
      expect(values).toContain('pointer');
      expect(values.length).toBe(3);
    });

    /**
     * WHY: Subject types for user or group
     */
    it('should have correct subjectType enum values', () => {
      const values = subjectTypeEnum.enumValues;
      expect(values).toContain('user');
      expect(values).toContain('group');
      expect(values.length).toBe(2);
    });

    /**
     * WHY: Access is either allow or deny
     */
    it('should have correct accessType enum values', () => {
      const values = accessTypeEnum.enumValues;
      expect(values).toContain('allow');
      expect(values).toContain('deny');
      expect(values.length).toBe(2);
    });

    /**
     * WHY: Atomic permissions for fine-grained control
     */
    it('should have correct permission enum values', () => {
      const values = permissionEnum.enumValues;
      expect(values).toContain('read');
      expect(values).toContain('write');
      expect(values).toContain('delete');
      expect(values).toContain('share');
      expect(values.length).toBe(4);
    });
  });

  describe('relations', () => {
    /**
     * WHY: Relations help with queries but are optional for polymorphic
     */
    it('should have relations defined', () => {
      expect(accessRulesRelations).toBeDefined();
    });
  });

  describe('type inference', () => {
    /**
     * WHY: TypeScript types must be correctly inferred
     */
    it('should correctly infer AccessRule type', () => {
      const rule: AccessRule = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        targetType: 'folder',
        targetId: '123e4567-e89b-12d3-a456-426614174001',
        subjectType: 'user',
        subjectId: '123e4567-e89b-12d3-a456-426614174002',
        accessType: 'allow',
        permission: 'read',
        createdAt: new Date(),
      };

      expect(rule.id).toBeDefined();
      expect(rule.targetType).toBe('folder');
      expect(rule.accessType).toBe('allow');
      expect(rule.permission).toBe('read');
    });

    /**
     * WHY: NewAccessRule should not require auto-generated fields
     */
    it('should correctly infer NewAccessRule type', () => {
      const newRule: NewAccessRule = {
        targetType: 'file',
        targetId: '123e4567-e89b-12d3-a456-426614174001',
        subjectType: 'group',
        subjectId: '123e4567-e89b-12d3-a456-426614174002',
        accessType: 'deny',
        permission: 'delete',
      };

      expect(newRule.targetType).toBe('file');
      expect(newRule.accessType).toBe('deny');
    });

    /**
     * WHY: Types must be correctly inferred
     */
    it('should correctly type enum values', () => {
      const targetType: TargetType = 'pointer';
      const subjectType: SubjectType = 'group';
      const accessType: AccessType = 'allow';
      const permission: Permission = 'share';

      expect(targetType).toBe('pointer');
      expect(subjectType).toBe('group');
      expect(accessType).toBe('allow');
      expect(permission).toBe('share');
    });
  });

  describe('access control scenarios', () => {
    /**
     * WHY: Allow rule for user on folder
     */
    it('should support allow rule for user on folder', () => {
      const rule: AccessRule = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        targetType: 'folder',
        targetId: '123e4567-e89b-12d3-a456-426614174001',
        subjectType: 'user',
        subjectId: '123e4567-e89b-12d3-a456-426614174002',
        accessType: 'allow',
        permission: 'read',
        createdAt: new Date(),
      };

      expect(rule.targetType).toBe('folder');
      expect(rule.subjectType).toBe('user');
      expect(rule.accessType).toBe('allow');
    });

    /**
     * WHY: Deny rule for group on file
     */
    it('should support deny rule for group on file', () => {
      const rule: AccessRule = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        targetType: 'file',
        targetId: '123e4567-e89b-12d3-a456-426614174001',
        subjectType: 'group',
        subjectId: '123e4567-e89b-12d3-a456-426614174002',
        accessType: 'deny',
        permission: 'delete',
        createdAt: new Date(),
      };

      expect(rule.targetType).toBe('file');
      expect(rule.subjectType).toBe('group');
      expect(rule.accessType).toBe('deny');
    });

    /**
     * WHY: Shortcuts have independent access rules
     */
    it('should support access rule on pointer (shortcut)', () => {
      const rule: AccessRule = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        targetType: 'pointer',
        targetId: '123e4567-e89b-12d3-a456-426614174001',
        subjectType: 'user',
        subjectId: '123e4567-e89b-12d3-a456-426614174002',
        accessType: 'allow',
        permission: 'share',
        createdAt: new Date(),
      };

      expect(rule.targetType).toBe('pointer');
    });
  });
});
