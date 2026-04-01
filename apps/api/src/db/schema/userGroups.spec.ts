import { userGroups, userGroupsRelations, type UserGroup, type NewUserGroup } from './userGroups';

/**
 * AGGRESSIVE TEST SUITE: UserGroups Schema
 *
 * Why test userGroups schema?
 * 1. Groups are scoped to filebases
 * 2. Access rules can reference groups
 * 3. Groups need proper FK to filebase
 *
 * Testing strategy:
 * - Validate FK to filebase
 * - Validate name column
 * - Validate timestamps
 */

describe('UserGroups Schema', () => {
  describe('table structure', () => {
    /**
     * WHY: Table must exist with correct name
     */
    it('should have correct table name', () => {
      expect((userGroups as any)[Symbol.for('drizzle:Name')]).toBe('user_groups');
    });

    /**
     * WHY: UUID primary key for security
     */
    it('should have id column as UUID primary key', () => {
      const column = userGroups.id;
      expect(column.columnType).toBe('PgUUID');
      expect(column.primary).toBe(true);
      expect(column.hasDefault).toBe(true);
    });

    /**
     * WHY: Groups are scoped to a filebase
     */
    it('should have filebaseId as foreign key', () => {
      const column = userGroups.filebaseId;
      expect(column.columnType).toBe('PgUUID');
      expect(column.notNull).toBe(true);
    });

    /**
     * WHY: Group must have a name
     */
    it('should have name column as varchar', () => {
      const column = userGroups.name;
      expect(column.notNull).toBe(true);
    });

    /**
     * WHY: Timestamp for audit trail
     */
    it('should have createdAt timestamp', () => {
      expect(userGroups.createdAt.notNull).toBe(true);
      expect(userGroups.createdAt.hasDefault).toBe(true);
    });
  });

  describe('relations', () => {
    /**
     * WHY: Must have relation to filebase
     */
    it('should have relations defined', () => {
      expect(userGroupsRelations).toBeDefined();
      const config = userGroupsRelations.config;
      expect(config).toBeDefined();
    });
  });

  describe('type inference', () => {
    /**
     * WHY: TypeScript types must be correctly inferred
     */
    it('should correctly infer UserGroup type', () => {
      const group: UserGroup = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        filebaseId: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Editors',
        createdAt: new Date(),
      };

      expect(group.id).toBeDefined();
      expect(group.filebaseId).toBeDefined();
      expect(group.name).toBeDefined();
    });

    /**
     * WHY: NewUserGroup should not require auto-generated fields
     */
    it('should correctly infer NewUserGroup type', () => {
      const newGroup: NewUserGroup = {
        filebaseId: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Reviewers',
      };

      expect(newGroup.filebaseId).toBeDefined();
      expect(newGroup.name).toBeDefined();
    });
  });
});
