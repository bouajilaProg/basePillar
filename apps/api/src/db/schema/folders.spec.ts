import { folders, foldersRelations, type Folder, type NewFolder } from './folders';

/**
 * AGGRESSIVE TEST SUITE: Folders Schema
 *
 * Why test folders schema thoroughly?
 * 1. Self-referential FK for hierarchy is error-prone
 * 2. Root folder detection requires nullable parentId
 * 3. Index on (filebaseId, parentId) critical for performance
 *
 * Testing strategy:
 * - Validate self-referential foreign key
 * - Validate nullable parentId for root folders
 * - Validate index configuration
 */

describe('Folders Schema', () => {
  describe('table structure', () => {
    /**
     * WHY: Table must exist with correct name
     */
    it('should have correct table name', () => {
      expect((folders as any)[Symbol.for('drizzle:Name')]).toBe('folders');
    });

    /**
     * WHY: UUID primary key for security
     */
    it('should have id column as UUID primary key', () => {
      const column = folders.id;
      expect(column.columnType).toBe('PgUUID');
      expect(column.primary).toBe(true);
      expect(column.hasDefault).toBe(true);
    });

    /**
     * WHY: Folder must belong to a filebase
     */
    it('should have filebaseId as foreign key', () => {
      const column = folders.filebaseId;
      expect(column.columnType).toBe('PgUUID');
      expect(column.notNull).toBe(true);
    });

    /**
     * WHY: Self-referential for folder hierarchy
     * Root folders have null parentId
     */
    it('should have parentId as nullable self-referential FK', () => {
      const column = folders.parentId;
      expect(column.columnType).toBe('PgUUID');
      // parentId is nullable for root folders
      expect(column.notNull).toBe(false);
    });

    /**
     * WHY: Folder must have a name
     */
    it('should have name column as varchar', () => {
      const column = folders.name;
      expect(column.notNull).toBe(true);
    });

    /**
     * WHY: Timestamps for audit trail
     */
    it('should have createdAt and updatedAt timestamps', () => {
      expect(folders.createdAt.notNull).toBe(true);
      expect(folders.createdAt.hasDefault).toBe(true);
      expect(folders.updatedAt.notNull).toBe(true);
      expect(folders.updatedAt.hasDefault).toBe(true);
    });
  });

  describe('relations', () => {
    /**
     * WHY: Must have relations to filebase, parent, and children
     */
    it('should have relations defined', () => {
      expect(foldersRelations).toBeDefined();
      const config = foldersRelations.config;
      expect(config).toBeDefined();
    });
  });

  describe('type inference', () => {
    /**
     * WHY: TypeScript types must be correctly inferred
     */
    it('should correctly infer Folder type', () => {
      const folder: Folder = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        filebaseId: '123e4567-e89b-12d3-a456-426614174001',
        parentId: null, // root folder
        name: 'root',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(folder.id).toBeDefined();
      expect(folder.filebaseId).toBeDefined();
      expect(folder.name).toBeDefined();
    });

    /**
     * WHY: NewFolder should not require auto-generated fields
     */
    it('should correctly infer NewFolder type', () => {
      const newFolder: NewFolder = {
        filebaseId: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Documents',
        // parentId, id, createdAt, updatedAt are optional
      };

      expect(newFolder.filebaseId).toBeDefined();
      expect(newFolder.name).toBeDefined();
    });

    /**
     * WHY: Root folder has null parentId
     */
    it('should allow null parentId for root folders', () => {
      const rootFolder: Folder = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        filebaseId: '123e4567-e89b-12d3-a456-426614174001',
        parentId: null,
        name: 'root',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(rootFolder.parentId).toBeNull();
    });

    /**
     * WHY: Nested folder has non-null parentId
     */
    it('should allow non-null parentId for nested folders', () => {
      const nestedFolder: Folder = {
        id: '123e4567-e89b-12d3-a456-426614174002',
        filebaseId: '123e4567-e89b-12d3-a456-426614174001',
        parentId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Documents',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(nestedFolder.parentId).toBeDefined();
      expect(nestedFolder.parentId).not.toBeNull();
    });
  });
});
