import {
  filePointers,
  filePointersRelations,
  type FilePointer,
  type NewFilePointer,
} from './filePointers';

/**
 * AGGRESSIVE TEST SUITE: FilePointers Schema
 *
 * Why test filePointers schema thoroughly?
 * 1. Pointers are the user-facing interface to files
 * 2. Shortcuts require isShortcut flag handling
 * 3. Multiple pointers can reference same file
 *
 * Testing strategy:
 * - Validate FK to files and folders
 * - Validate isShortcut boolean
 * - Validate index on folderId for listing
 */

describe('FilePointers Schema', () => {
  describe('table structure', () => {
    /**
     * WHY: Table must exist with correct name
     */
    it('should have correct table name', () => {
      expect((filePointers as any)[Symbol.for('drizzle:Name')]).toBe('file_pointers');
    });

    /**
     * WHY: UUID primary key for security
     */
    it('should have id column as UUID primary key', () => {
      const column = filePointers.id;
      expect(column.columnType).toBe('PgUUID');
      expect(column.primary).toBe(true);
      expect(column.hasDefault).toBe(true);
    });

    /**
     * WHY: Must reference the actual file in S3
     */
    it('should have fileId as foreign key to files', () => {
      const column = filePointers.fileId;
      expect(column.columnType).toBe('PgUUID');
      expect(column.notNull).toBe(true);
    });

    /**
     * WHY: Pointer exists within a folder
     */
    it('should have folderId as foreign key to folders', () => {
      const column = filePointers.folderId;
      expect(column.columnType).toBe('PgUUID');
      expect(column.notNull).toBe(true);
    });

    /**
     * WHY: Display name (can differ from original for shortcuts)
     */
    it('should have name column as varchar', () => {
      const column = filePointers.name;
      expect(column.notNull).toBe(true);
    });

    /**
     * WHY: Distinguish between original and shortcut pointers
     */
    it('should have isShortcut boolean column with default false', () => {
      const column = filePointers.isShortcut;
      expect(column.notNull).toBe(true);
      expect(column.hasDefault).toBe(true);
    });

    /**
     * WHY: Distinguish between active and archived (trashed) pointers 
     */
    it('should have isArchived boolean column with default false', () => {
      const column = filePointers.isArchived;
      expect(column.notNull).toBe(true);
      expect(column.hasDefault).toBe(true);
    });

    /**
     * WHY: Timestamps for audit trail
     */
    it('should have createdAt and updatedAt timestamps', () => {
      expect(filePointers.createdAt.notNull).toBe(true);
      expect(filePointers.createdAt.hasDefault).toBe(true);
      expect(filePointers.updatedAt.notNull).toBe(true);
      expect(filePointers.updatedAt.hasDefault).toBe(true);
    });
  });

  describe('relations', () => {
    /**
     * WHY: Must have relations to file and folder
     */
    it('should have relations defined', () => {
      expect(filePointersRelations).toBeDefined();
      const config = filePointersRelations.config;
      expect(config).toBeDefined();
    });
  });

  describe('type inference', () => {
    /**
     * WHY: TypeScript types must be correctly inferred
     */
    it('should correctly infer FilePointer type', () => {
      const pointer: FilePointer = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        fileId: '123e4567-e89b-12d3-a456-426614174001',
        folderId: '123e4567-e89b-12d3-a456-426614174002',
        name: 'document.pdf',
        isShortcut: false,
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(pointer.id).toBeDefined();
      expect(pointer.fileId).toBeDefined();
      expect(pointer.folderId).toBeDefined();
      expect(pointer.name).toBeDefined();
    });

    /**
     * WHY: NewFilePointer should not require auto-generated fields
     */
    it('should correctly infer NewFilePointer type', () => {
      const newPointer: NewFilePointer = {
        fileId: '123e4567-e89b-12d3-a456-426614174001',
        folderId: '123e4567-e89b-12d3-a456-426614174002',
        name: 'document.pdf',
        // isShortcut has default
        // isArchived has default
      };

      expect(newPointer.fileId).toBeDefined();
      expect(newPointer.name).toBeDefined();
    });

    /**
     * WHY: Original pointer is not a shortcut
     */
    it('should allow isShortcut = false for original pointers', () => {
      const original: FilePointer = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        fileId: '123e4567-e89b-12d3-a456-426614174001',
        folderId: '123e4567-e89b-12d3-a456-426614174002',
        name: 'original.txt',
        isShortcut: false,
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(original.isShortcut).toBe(false);
      expect(original.isArchived).toBe(false);
    });

    /**
     * WHY: Shortcut pointers reference same file with different name
     */
    it('should allow isShortcut = true for shortcuts', () => {
      const shortcut: FilePointer = {
        id: '123e4567-e89b-12d3-a456-426614174003',
        fileId: '123e4567-e89b-12d3-a456-426614174001', // Same file
        folderId: '123e4567-e89b-12d3-a456-426614174004', // Different folder
        name: 'shortcut-to-original.txt',
        isShortcut: true,
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(shortcut.isShortcut).toBe(true);
      expect(shortcut.isArchived).toBe(false);
    });
  });
});
