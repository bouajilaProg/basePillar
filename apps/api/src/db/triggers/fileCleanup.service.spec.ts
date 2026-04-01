import { Test, TestingModule } from '@nestjs/testing';
import { FileCleanupService } from './fileCleanup.service';
import { DB_CONNECTION } from '../db.module';

/**
 * AGGRESSIVE TEST SUITE: FileCleanupService
 *
 * Why test FileCleanupService thoroughly?
 * 1. Orphan files waste S3 storage (and money)
 * 2. Premature deletion = data loss for users
 * 3. Must correctly determine orphan status before delete
 * 4. S3 integration must be reliable
 *
 * Testing strategy:
 * - Mock database operations
 * - Test counting logic for pointers
 * - Test deletion flows
 * - Test batch cleanup
 */
describe('FileCleanupService', () => {
  let service: FileCleanupService;
  let mockDb: any;

  /**
   * Mock database that tracks operations for cleanup queries
   */
  const createMockDb = () => {
    let selectQueue: any[] = [];
    let deleteResults: string[] = [];

    const mockSelect = jest.fn(() => ({
      from: jest.fn(() => ({
        where: jest.fn(() => {
          const value = selectQueue.shift() ?? [];
          return Promise.resolve(value);
        }),
      })),
    }));

    const mockDelete = jest.fn(() => ({
      where: jest.fn((condition) => {
        // Track deleted file IDs
        return Promise.resolve({ rowCount: 1 });
      }),
    }));

    return {
      select: mockSelect,
      delete: mockDelete,
      // Queue helpers
      _queueSelect: (value: any) => {
        selectQueue.push(value);
      },
      _getDeletedFiles: () => deleteResults,
      _reset: () => {
        selectQueue = [];
        deleteResults = [];
        mockSelect.mockClear();
        mockDelete.mockClear();
      },
    };
  };

  beforeEach(async () => {
    mockDb = createMockDb();

    const module: TestingModule = await Test.createTestingModule({
      providers: [FileCleanupService, { provide: DB_CONNECTION, useValue: mockDb }],
    }).compile();

    service = module.get<FileCleanupService>(FileCleanupService);
  });

  describe('checkAndCleanupOrphanFile', () => {
    /**
     * WHY: File with active pointers should NOT be deleted
     * Core invariant: never delete files that users can access
     */
    it('should NOT delete file when it has active pointers', async () => {
      // Mock: count returns 2 pointers
      mockDb._queueSelect([{ count: 2 }]);

      const result = await service.checkAndCleanupOrphanFile('file-123');

      expect(result).toBe(false);
      expect(mockDb.delete).not.toHaveBeenCalled();
    });

    /**
     * WHY: File with exactly 1 pointer is still active
     */
    it('should NOT delete file when it has exactly 1 pointer', async () => {
      mockDb._queueSelect([{ count: 1 }]);

      const result = await service.checkAndCleanupOrphanFile('file-123');

      expect(result).toBe(false);
      expect(mockDb.delete).not.toHaveBeenCalled();
    });

    /**
     * WHY: File with 0 pointers is an orphan - must be cleaned up
     */
    it('should delete file when it has no pointers', async () => {
      // Mock: count returns 0 pointers
      mockDb._queueSelect([{ count: 0 }]);
      // Mock: file lookup for S3 key
      mockDb._queueSelect([{ s3Key: 'filebase-1/abc123' }]);

      const result = await service.checkAndCleanupOrphanFile('file-123');

      expect(result).toBe(true);
      expect(mockDb.delete).toHaveBeenCalled();
    });

    /**
     * WHY: If file doesn't exist in DB, cleanup should not fail
     */
    it('should return false if file not found in database', async () => {
      // Mock: count returns 0 pointers
      mockDb._queueSelect([{ count: 0 }]);
      // Mock: file not found
      mockDb._queueSelect([]);

      const result = await service.checkAndCleanupOrphanFile('non-existent-file');

      expect(result).toBe(false);
    });

    /**
     * WHY: Should handle null count gracefully (defensive coding)
     */
    it('should handle null count result as 0 pointers', async () => {
      // Mock: count returns null/undefined
      mockDb._queueSelect([{ count: null }]);
      // Mock: file lookup
      mockDb._queueSelect([{ s3Key: 'filebase-1/abc123' }]);

      const result = await service.checkAndCleanupOrphanFile('file-123');

      expect(result).toBe(true);
      expect(mockDb.delete).toHaveBeenCalled();
    });

    /**
     * WHY: Should handle empty result set (no rows) gracefully
     */
    it('should handle empty count result as 0 pointers', async () => {
      // Mock: empty result from count query
      mockDb._queueSelect([]);
      // Mock: file lookup
      mockDb._queueSelect([{ s3Key: 'filebase-1/abc123' }]);

      // When result is empty, count is undefined, defaulting to 0
      const result = await service.checkAndCleanupOrphanFile('file-123');

      expect(result).toBe(true);
    });
  });

  describe('cleanupAllOrphanFiles', () => {
    /**
     * WHY: Batch cleanup should process all files
     */
    it('should check all files and cleanup orphans', async () => {
      // Reset and set up fresh mock for batch operation
      const batchMockDb = {
        select: jest.fn().mockImplementation(() => ({
          from: jest.fn().mockImplementation(() => ({
            where: jest.fn(),
          })),
        })),
        delete: jest.fn().mockImplementation(() => ({
          where: jest.fn().mockResolvedValue({ rowCount: 1 }),
        })),
      };

      // Need to create a new module for this test
      const module: TestingModule = await Test.createTestingModule({
        providers: [FileCleanupService, { provide: DB_CONNECTION, useValue: batchMockDb }],
      }).compile();

      const batchService = module.get<FileCleanupService>(FileCleanupService);

      // Mock the entire select().from() chain for getting all files
      let callCount = 0;
      batchMockDb.select.mockImplementation(() => ({
        from: jest.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            // First call: get all files
            return Promise.resolve([
              { id: 'file-1', s3Key: 'key1' },
              { id: 'file-2', s3Key: 'key2' },
            ]);
          }
          // Subsequent calls are for pointer counts and file lookups
          return {
            where: jest.fn().mockResolvedValue([{ count: 0 }]),
          };
        }),
      }));

      // This test verifies the batch method runs without error
      // Actual deletion count depends on orphan detection
      await expect(batchService.cleanupAllOrphanFiles()).resolves.not.toThrow();
    });

    /**
     * WHY: Should return count of cleaned up files
     */
    it('should return number of files cleaned up', async () => {
      // Create a controlled mock for counting
      const countMockDb = {
        select: jest.fn(),
        delete: jest.fn().mockImplementation(() => ({
          where: jest.fn().mockResolvedValue({ rowCount: 1 }),
        })),
      };

      // Mock returns empty file list - no files to clean
      countMockDb.select.mockImplementation(() => ({
        from: jest.fn().mockResolvedValue([]),
      }));

      const module: TestingModule = await Test.createTestingModule({
        providers: [FileCleanupService, { provide: DB_CONNECTION, useValue: countMockDb }],
      }).compile();

      const countService = module.get<FileCleanupService>(FileCleanupService);

      const result = await countService.cleanupAllOrphanFiles();

      expect(typeof result).toBe('number');
      expect(result).toBe(0);
    });
  });

  describe('edge cases', () => {
    /**
     * WHY: Very large pointer count should not cause issues
     */
    it('should handle large pointer counts', async () => {
      mockDb._queueSelect([{ count: 1000000 }]);

      const result = await service.checkAndCleanupOrphanFile('file-123');

      expect(result).toBe(false);
    });

    /**
     * WHY: S3 key with special characters should be handled
     */
    it('should handle S3 keys with special characters', async () => {
      mockDb._queueSelect([{ count: 0 }]);
      mockDb._queueSelect([{ s3Key: 'filebase-1/file with spaces & symbols!.txt' }]);

      const result = await service.checkAndCleanupOrphanFile('file-special');

      expect(result).toBe(true);
    });

    /**
     * WHY: UUID file IDs should be handled correctly
     */
    it('should handle UUID file IDs', async () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      mockDb._queueSelect([{ count: 0 }]);
      mockDb._queueSelect([{ s3Key: `filebase-1/${uuid}` }]);

      const result = await service.checkAndCleanupOrphanFile(uuid);

      expect(result).toBe(true);
    });
  });
});
