import { Test, TestingModule } from '@nestjs/testing';
import { FilebasesService } from './filebases.service';
import { DB_CONNECTION } from '../db/db.module';
import { ConflictException, NotFoundException } from '@nestjs/common';

/**
 * AGGRESSIVE TEST SUITE: FilebasesService
 *
 * Why test FilebasesService thoroughly?
 * 1. Filebase is the root of all file storage - must be reliable
 * 2. One filebase per user constraint is critical
 * 3. Root folder auto-creation must happen on filebase creation
 * 4. Cascade deletes must work correctly
 *
 * Testing strategy:
 * - Mock database operations
 * - Test CRUD operations
 * - Test constraints (unique ownerId)
 * - Test root folder creation
 */
describe('FilebasesService', () => {
  let service: FilebasesService;
  let mockDb: any;

  interface MockDb {
    select: jest.Mock;
    insert: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    transaction: jest.Mock;
    _queueSelect: (value: any) => void;
    _queueInsert: (value: any) => void;
    _setSelectQueue: (queue: any[]) => void;
    _setInsertQueue: (queue: any[]) => void;
    _reset: () => void;
  }

  /**
   * Mock database with queue system for chained operations
   */
  const createMockDb = (): MockDb => {
    let selectQueue: any[] = [];
    let insertQueue: any[] = [];

    const mockSelect = jest.fn(() => ({
      from: jest.fn(() => ({
        where: jest.fn(() => {
          const value = selectQueue.shift();
          return Promise.resolve(value ?? []);
        }),
      })),
    }));

    const mockInsert = jest.fn(() => ({
      values: jest.fn(() => ({
        returning: jest.fn(() => {
          const value = insertQueue.shift();
          return Promise.resolve(value ?? []);
        }),
      })),
    }));

    const mockUpdate = jest.fn(() => ({
      set: jest.fn(() => ({
        where: jest.fn(() => ({
          returning: jest.fn(() => {
            const value = selectQueue.shift();
            return Promise.resolve(value ?? []);
          }),
        })),
      })),
    }));

    const mockDelete = jest.fn(() => ({
      where: jest.fn(() => Promise.resolve({ rowCount: 1 })),
    }));

    // For transaction support - simpler implementation
    const mockTransaction = jest.fn(async <T>(callback: (tx: MockDb) => Promise<T>): Promise<T> => {
      // Use same queues for transaction (they share state)
      const txMock: MockDb = {
        select: mockSelect,
        insert: mockInsert,
        update: mockUpdate,
        delete: mockDelete,
        transaction: mockTransaction,
        _queueSelect: (value: any) => selectQueue.push(value),
        _queueInsert: (value: any) => insertQueue.push(value),
        _setSelectQueue: (queue: any[]) => {
          selectQueue = queue;
        },
        _setInsertQueue: (queue: any[]) => {
          insertQueue = queue;
        },
        _reset: () => {
          selectQueue = [];
          insertQueue = [];
        },
      };
      return callback(txMock);
    });

    return {
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      transaction: mockTransaction,
      _queueSelect: (value: any) => {
        selectQueue.push(value);
      },
      _queueInsert: (value: any) => {
        insertQueue.push(value);
      },
      _setSelectQueue: (queue: any[]) => {
        selectQueue = queue;
      },
      _setInsertQueue: (queue: any[]) => {
        insertQueue = queue;
      },
      _reset: () => {
        selectQueue = [];
        insertQueue = [];
        mockSelect.mockClear();
        mockInsert.mockClear();
        mockUpdate.mockClear();
        mockDelete.mockClear();
      },
    };
  };

  beforeEach(async () => {
    mockDb = createMockDb();

    const module: TestingModule = await Test.createTestingModule({
      providers: [FilebasesService, { provide: DB_CONNECTION, useValue: mockDb }],
    }).compile();

    service = module.get<FilebasesService>(FilebasesService);
  });

  describe('create', () => {
    const createDto = {
      ownerId: 'user-123',
      name: 'My Filebase',
    };

    /**
     * WHY: Basic creation must work - core functionality
     */
    it('should create a filebase and return it', async () => {
      // Mock: no existing filebase for this user
      mockDb._queueSelect([]);
      // Mock: filebase insert
      mockDb._queueInsert([{ id: 'fb-123', ownerId: 'user-123', name: 'My Filebase' }]);
      // Mock: root folder insert
      mockDb._queueInsert([
        { id: 'folder-root', filebaseId: 'fb-123', name: 'root', parentId: null },
      ]);

      const result = await service.create(createDto);

      expect(result.id).toBe('fb-123');
      expect(result.name).toBe('My Filebase');
    });

    /**
     * WHY: One filebase per user constraint must be enforced
     */
    it('should throw ConflictException if user already has a filebase', async () => {
      // Mock: existing filebase found
      mockDb._queueSelect([{ id: 'existing-fb', ownerId: 'user-123' }]);

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });

    /**
     * WHY: Root folder must be auto-created with filebase
     */
    it('should create root folder when creating filebase', async () => {
      mockDb._queueSelect([]);
      mockDb._queueInsert([{ id: 'fb-123', ownerId: 'user-123', name: 'My Filebase' }]);
      mockDb._queueInsert([
        { id: 'folder-root', filebaseId: 'fb-123', name: 'root', parentId: null },
      ]);

      const result = await service.create(createDto);

      expect(result.rootFolderId).toBe('folder-root');
    });

    /**
     * WHY: Name validation - empty names should not be allowed
     */
    it('should accept non-empty name', async () => {
      mockDb._queueSelect([]);
      mockDb._queueInsert([{ id: 'fb-123', ownerId: 'user-123', name: 'Valid Name' }]);
      mockDb._queueInsert([
        { id: 'folder-root', filebaseId: 'fb-123', name: 'root', parentId: null },
      ]);

      const result = await service.create({ ...createDto, name: 'Valid Name' });

      expect(result.name).toBe('Valid Name');
    });
  });

  describe('findById', () => {
    /**
     * WHY: Must be able to retrieve filebase by ID
     */
    it('should return filebase when found', async () => {
      mockDb._queueSelect([{ id: 'fb-123', ownerId: 'user-123', name: 'Test' }]);

      const result = await service.findById('fb-123');

      expect(result.id).toBe('fb-123');
    });

    /**
     * WHY: Must throw when filebase not found
     */
    it('should throw NotFoundException when filebase not found', async () => {
      mockDb._queueSelect([]);

      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByOwnerId', () => {
    /**
     * WHY: Find filebase by owner - common lookup pattern
     */
    it('should return filebase when owner has one', async () => {
      mockDb._queueSelect([{ id: 'fb-123', ownerId: 'user-123', name: 'Test' }]);

      const result = await service.findByOwnerId('user-123');

      expect(result?.ownerId).toBe('user-123');
    });

    /**
     * WHY: Return null if user has no filebase (valid state)
     */
    it('should return null when owner has no filebase', async () => {
      mockDb._queueSelect([]);

      const result = await service.findByOwnerId('user-without-fb');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    /**
     * WHY: Must be able to update filebase name
     */
    it('should update filebase name', async () => {
      mockDb._queueSelect([{ id: 'fb-123', ownerId: 'user-123', name: 'New Name' }]);

      const result = await service.update('fb-123', { name: 'New Name' });

      expect(result.name).toBe('New Name');
    });

    /**
     * WHY: Updating non-existent filebase should throw
     */
    it('should throw NotFoundException when updating non-existent filebase', async () => {
      mockDb._queueSelect([]);

      await expect(service.update('non-existent', { name: 'New' })).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('delete', () => {
    /**
     * WHY: Must be able to delete filebase (cascades to all content)
     */
    it('should delete filebase', async () => {
      // Mock: filebase exists
      mockDb._queueSelect([{ id: 'fb-123' }]);

      await expect(service.delete('fb-123')).resolves.not.toThrow();
      expect(mockDb.delete).toHaveBeenCalled();
    });

    /**
     * WHY: Deleting non-existent filebase should throw
     */
    it('should throw NotFoundException when deleting non-existent filebase', async () => {
      mockDb._queueSelect([]);

      await expect(service.delete('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getRootFolder', () => {
    /**
     * WHY: Must be able to get root folder for a filebase
     */
    it('should return root folder', async () => {
      mockDb._queueSelect([
        { id: 'folder-root', filebaseId: 'fb-123', name: 'root', parentId: null },
      ]);

      const result = await service.getRootFolder('fb-123');

      expect(result.name).toBe('root');
      expect(result.parentId).toBeNull();
    });

    /**
     * WHY: Missing root folder indicates data corruption
     */
    it('should throw error if root folder not found', async () => {
      mockDb._queueSelect([]);

      await expect(service.getRootFolder('fb-123')).rejects.toThrow();
    });
  });

  describe('edge cases', () => {
    /**
     * WHY: Unicode names should be supported
     */
    it('should handle unicode filebase names', async () => {
      const unicodeName = '文件库 📁';
      mockDb._queueSelect([]);
      mockDb._queueInsert([{ id: 'fb-123', ownerId: 'user-123', name: unicodeName }]);
      mockDb._queueInsert([
        { id: 'folder-root', filebaseId: 'fb-123', name: 'root', parentId: null },
      ]);

      const result = await service.create({ ownerId: 'user-123', name: unicodeName });

      expect(result.name).toBe(unicodeName);
    });

    /**
     * WHY: Very long names should work (up to DB limit)
     */
    it('should handle long filebase names', async () => {
      const longName = 'A'.repeat(255);
      mockDb._queueSelect([]);
      mockDb._queueInsert([{ id: 'fb-123', ownerId: 'user-123', name: longName }]);
      mockDb._queueInsert([
        { id: 'folder-root', filebaseId: 'fb-123', name: 'root', parentId: null },
      ]);

      const result = await service.create({ ownerId: 'user-123', name: longName });

      expect(result.name.length).toBe(255);
    });

    /**
     * WHY: UUIDs should be handled correctly
     */
    it('should handle UUID owner IDs', async () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      mockDb._queueSelect([]);
      mockDb._queueInsert([{ id: 'fb-123', ownerId: uuid, name: 'Test' }]);
      mockDb._queueInsert([
        { id: 'folder-root', filebaseId: 'fb-123', name: 'root', parentId: null },
      ]);

      const result = await service.create({ ownerId: uuid, name: 'Test' });

      expect(result.ownerId).toBe(uuid);
    });
  });
});
