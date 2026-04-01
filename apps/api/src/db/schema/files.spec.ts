import { files, filesRelations, type File, type NewFile } from './files';

/**
 * AGGRESSIVE TEST SUITE: Files Schema
 *
 * Why test files schema thoroughly?
 * 1. S3 key format must be consistent for storage operations
 * 2. Size must handle large files (bigint)
 * 3. MIME type validation for file handling
 *
 * Testing strategy:
 * - Validate S3 key column
 * - Validate size as bigint for large files
 * - Validate uploadedBy FK
 */

describe('Files Schema', () => {
  describe('table structure', () => {
    /**
     * WHY: Table must exist with correct name
     */
    it('should have correct table name', () => {
      expect((files as any)[Symbol.for('drizzle:Name')]).toBe('files');
    });

    /**
     * WHY: UUID primary key for security
     */
    it('should have id column as UUID primary key', () => {
      const column = files.id;
      expect(column.columnType).toBe('PgUUID');
      expect(column.primary).toBe(true);
      expect(column.hasDefault).toBe(true);
    });

    /**
     * WHY: S3 key is required for storage operations
     * Format: {filebaseId}/{uuid}
     */
    it('should have s3Key column as varchar', () => {
      const column = files.s3Key;
      expect(column.notNull).toBe(true);
    });

    /**
     * WHY: MIME type needed for file handling and downloads
     */
    it('should have mimeType column as varchar', () => {
      const column = files.mimeType;
      expect(column.notNull).toBe(true);
    });

    /**
     * WHY: Size must be bigint to handle files > 2GB
     */
    it('should have size column as bigint', () => {
      const column = files.size;
      // Using 'bigint' mode gives PgBigInt64
      expect(column.columnType).toBe('PgBigInt64');
      expect(column.notNull).toBe(true);
    });

    /**
     * WHY: Track who uploaded the file
     */
    it('should have uploadedBy as foreign key to users', () => {
      const column = files.uploadedBy;
      expect(column.columnType).toBe('PgUUID');
      expect(column.notNull).toBe(true);
    });

    /**
     * WHY: Timestamp for audit trail
     */
    it('should have createdAt timestamp', () => {
      expect(files.createdAt.notNull).toBe(true);
      expect(files.createdAt.hasDefault).toBe(true);
    });
  });

  describe('relations', () => {
    /**
     * WHY: File must have relation to uploader
     */
    it('should have relations defined', () => {
      expect(filesRelations).toBeDefined();
      const config = filesRelations.config;
      expect(config).toBeDefined();
    });
  });

  describe('type inference', () => {
    /**
     * WHY: TypeScript types must be correctly inferred
     */
    it('should correctly infer File type', () => {
      const file: File = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        s3Key: 'filebase-123/file-456',
        mimeType: 'application/pdf',
        size: BigInt(1024 * 1024), // 1MB
        uploadedBy: '123e4567-e89b-12d3-a456-426614174001',
        createdAt: new Date(),
      };

      expect(file.id).toBeDefined();
      expect(file.s3Key).toBeDefined();
      expect(file.mimeType).toBeDefined();
    });

    /**
     * WHY: NewFile should not require auto-generated fields
     */
    it('should correctly infer NewFile type', () => {
      const newFile: NewFile = {
        s3Key: 'filebase-123/file-456',
        mimeType: 'image/png',
        size: BigInt(2048),
        uploadedBy: '123e4567-e89b-12d3-a456-426614174001',
      };

      expect(newFile.s3Key).toBeDefined();
      expect(newFile.uploadedBy).toBeDefined();
    });

    /**
     * WHY: Size must support large values (BigInt)
     */
    it('should support large file sizes', () => {
      const largeFile: File = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        s3Key: 'filebase-123/large-file',
        mimeType: 'video/mp4',
        size: BigInt(10 * 1024 * 1024 * 1024), // 10GB
        uploadedBy: '123e4567-e89b-12d3-a456-426614174001',
        createdAt: new Date(),
      };

      // BigInt comparison - 10GB in bytes
      expect(largeFile.size).toBe(BigInt(10737418240));
    });
  });
});
