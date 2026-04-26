import { Test, TestingModule } from '@nestjs/testing';
import { FoldersService } from './folders.service';
import { DB_CONNECTION } from '../db/db.module';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';

/**
 * AGGRESSIVE TEST SUITE: FoldersService
 *
 * Why test FoldersService thoroughly?
 * 1. Folders are the organizational structure for files
 * 2. Hierarchy must be maintained (no cycles, valid parents)
 * 3. Root folder has special constraints (cannot delete, rename to non-root)
 * 4. Listing operations must be efficient
 *
 * Testing strategy:
 * - Mock database operations
 * - Test CRUD operations
 * - Test hierarchy constraints
 * - Test path resolution
 */
describe('FoldersService', () => {
  let service: FoldersService;
  let mockDb: any;

  interface MockDb {
    select: jest.Mock;
    insert: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    _queueSelect: (value: any) => void;
    _queueInsert: (value: any) => void;
    _reset: () => void;
  }

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

    return {
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      _queueSelect: (value: any) => selectQueue.push(value),
      _queueInsert: (value: any) => insertQueue.push(value),
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
      providers: [FoldersService, { provide: DB_CONNECTION, useValue: mockDb }],
    }).compile();

    service = module.get<FoldersService>(FoldersService);
  });

  describe('create', () => {
    const createDto = {
      filebaseId: 'fb-123',
      parentId: 'parent-folder-id',
      name: 'New Folder',
    };

    /**
     * WHY: Basic folder creation must work
     */
    it('should create a folder and return it', async () => {
      // Mock: parent folder exists
      mockDb._queueSelect([{ id: 'parent-folder-id', filebaseId: 'fb-123' }]);
      // Mock: no existing folder with same name in same parent
      mockDb._queueSelect([]);
      // Mock: folder insert
      mockDb._queueInsert([{ id: 'folder-123', ...createDto }]);

      const result = await service.create(createDto);

      expect(result.id).toBe('folder-123');
      expect(result.name).toBe('New Folder');
    });

    /**
     * WHY: Cannot create folder if parent doesn't exist
     */
    it('should throw NotFoundException if parent folder not found', async () => {
      mockDb._queueSelect([]); // Parent not found

      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
    });

    /**
     * WHY: Folder names must be unique within same parent
     */
    it('should throw ConflictException if folder with same name exists in parent', async () => {
      // Mock: parent exists
      mockDb._queueSelect([{ id: 'parent-folder-id', filebaseId: 'fb-123' }]);
      // Mock: existing folder with same name
      mockDb._queueSelect([{ id: 'existing', name: 'New Folder', parentId: 'parent-folder-id' }]);

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });

    /**
     * WHY: Parent must belong to same filebase
     */
    it('should throw BadRequestException if parent belongs to different filebase', async () => {
      // Mock: parent exists but in different filebase
      mockDb._queueSelect([{ id: 'parent-folder-id', filebaseId: 'different-fb' }]);

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
    });

    /**
     * WHY: Creating folder in root (null parent) should work
     */
    it('should create folder with null parentId (in root)', async () => {
      const rootDto = { ...createDto, parentId: null };
      // Mock: no existing folder with same name in root
      mockDb._queueSelect([]);
      // Mock: folder insert
      mockDb._queueInsert([
        { id: 'folder-123', filebaseId: 'fb-123', parentId: null, name: 'New Folder' },
      ]);

      // Need to adjust the service to handle null parentId differently
      const result = await service.create(rootDto);

      expect(result.parentId).toBeNull();
    });
  });

  describe('findById', () => {
    /**
     * WHY: Must be able to retrieve folder by ID
     */
    it('should return folder when found', async () => {
      mockDb._queueSelect([{ id: 'folder-123', name: 'Test', filebaseId: 'fb-123' }]);

      const result = await service.findById('folder-123');

      expect(result.id).toBe('folder-123');
    });

    /**
     * WHY: Must throw when folder not found
     */
    it('should throw NotFoundException when folder not found', async () => {
      mockDb._queueSelect([]);

      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByParentId', () => {
    /**
     * WHY: List children of a folder
     */
    it('should return child folders', async () => {
      mockDb._queueSelect([
        { id: 'child-1', name: 'Child 1', parentId: 'parent-id' },
        { id: 'child-2', name: 'Child 2', parentId: 'parent-id' },
      ]);

      const result = await service.findByParentId('fb-123', 'parent-id');

      expect(result).toHaveLength(2);
    });

    /**
     * WHY: Return empty array if no children
     */
    it('should return empty array when no children', async () => {
      mockDb._queueSelect([]);

      const result = await service.findByParentId('fb-123', 'parent-id');

      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    /**
     * WHY: Must be able to rename folder
     */
    it('should update folder name', async () => {
      // Mock: folder exists (for check) - non-root folder
      mockDb._queueSelect([
        { id: 'folder-123', name: 'Old Name', parentId: 'parent-id', filebaseId: 'fb-123' },
      ]);
      // Mock: update returns updated folder
      mockDb._queueSelect([
        { id: 'folder-123', name: 'New Name', filebaseId: 'fb-123', parentId: 'parent-id' },
      ]);

      const result = await service.update('folder-123', { name: 'New Name' });

      expect(result.name).toBe('New Name');
    });

    /**
     * WHY: Cannot rename root folder to non-"root" name
     */
    it('should throw BadRequestException when renaming root folder', async () => {
      // Mock: folder is root (parentId is null, name is "root")
      mockDb._queueSelect([{ id: 'folder-123', name: 'root', parentId: null }]);

      await expect(service.update('folder-123', { name: 'Not Root' })).rejects.toThrow(
        BadRequestException
      );
    });

    /**
     * WHY: Updating non-existent folder should throw
     */
    it('should throw NotFoundException when folder not found', async () => {
      mockDb._queueSelect([]);

      await expect(service.update('non-existent', { name: 'New' })).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('delete', () => {
    /**
     * WHY: Must be able to delete folder (cascades to children)
     */
    it('should delete folder', async () => {
      // Mock: folder exists and is not root
      mockDb._queueSelect([{ id: 'folder-123', name: 'Test', parentId: 'parent-id' }]);

      await expect(service.delete('folder-123')).resolves.not.toThrow();
      expect(mockDb.delete).toHaveBeenCalled();
    });

    /**
     * WHY: Cannot delete root folder
     */
    it('should throw BadRequestException when deleting root folder', async () => {
      // Mock: folder is root (parentId is null)
      mockDb._queueSelect([{ id: 'folder-123', name: 'root', parentId: null }]);

      await expect(service.delete('folder-123')).rejects.toThrow(BadRequestException);
    });

    /**
     * WHY: Deleting non-existent folder should throw
     */
    it('should throw NotFoundException when folder not found', async () => {
      mockDb._queueSelect([]);

      await expect(service.delete('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('move', () => {
    /**
     * WHY: Moving folder to new parent
     */
    it('should move folder to new parent', async () => {
      // Mock: folder exists
      mockDb._queueSelect([
        { id: 'folder-123', name: 'Test', parentId: 'old-parent', filebaseId: 'fb-123' },
      ]);
      // Mock: new parent exists
      mockDb._queueSelect([{ id: 'new-parent', filebaseId: 'fb-123' }]);
      // Mock: no conflict
      mockDb._queueSelect([]);
      // Mock: update result
      mockDb._queueSelect([{ id: 'folder-123', name: 'Test', parentId: 'new-parent' }]);

      const result = await service.move('folder-123', 'new-parent');

      expect(result.parentId).toBe('new-parent');
    });

    /**
     * WHY: Cannot move root folder
     */
    it('should throw BadRequestException when moving root folder', async () => {
      mockDb._queueSelect([{ id: 'folder-123', name: 'root', parentId: null }]);

      await expect(service.move('folder-123', 'new-parent')).rejects.toThrow(BadRequestException);
    });

    /**
     * WHY: Cannot move folder into itself
     */
    it('should throw BadRequestException when moving folder into itself', async () => {
      mockDb._queueSelect([
        { id: 'folder-123', name: 'Test', parentId: 'old-parent', filebaseId: 'fb-123' },
      ]);

      await expect(service.move('folder-123', 'folder-123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPath', () => {
    /**
     * WHY: Get path from root to folder for breadcrumbs
     */
    it('should return path from root to folder', async () => {
      // This requires multiple queries to traverse up the tree
      // Mock: current folder
      mockDb._queueSelect([{ id: 'folder-3', name: 'Level 3', parentId: 'folder-2' }]);
      // Mock: parent folder
      mockDb._queueSelect([{ id: 'folder-2', name: 'Level 2', parentId: 'folder-1' }]);
      // Mock: grandparent folder
      mockDb._queueSelect([{ id: 'folder-1', name: 'Level 1', parentId: 'root-id' }]);
      // Mock: root folder
      mockDb._queueSelect([{ id: 'root-id', name: 'root', parentId: null }]);

      const result = await service.getPath('folder-3');

      expect(result).toHaveLength(4);
      expect(result[0].name).toBe('root');
      expect(result[3].name).toBe('Level 3');
    });
  });

  describe('edge cases', () => {
    /**
     * WHY: Unicode folder names should work
     */
    it('should handle unicode folder names', async () => {
      const unicodeName = '文件夹 📂';
      mockDb._queueSelect([{ id: 'parent-id', filebaseId: 'fb-123' }]);
      mockDb._queueSelect([]);
      mockDb._queueInsert([
        { id: 'folder-123', filebaseId: 'fb-123', parentId: 'parent-id', name: unicodeName },
      ]);

      const result = await service.create({
        filebaseId: 'fb-123',
        parentId: 'parent-id',
        name: unicodeName,
      });

      expect(result.name).toBe(unicodeName);
    });

    /**
     * WHY: Very long folder names should work
     */
    it('should handle long folder names', async () => {
      const longName = 'A'.repeat(255);
      mockDb._queueSelect([{ id: 'parent-id', filebaseId: 'fb-123' }]);
      mockDb._queueSelect([]);
      mockDb._queueInsert([
        { id: 'folder-123', filebaseId: 'fb-123', parentId: 'parent-id', name: longName },
      ]);

      const result = await service.create({
        filebaseId: 'fb-123',
        parentId: 'parent-id',
        name: longName,
      });

      expect(result.name.length).toBe(255);
    });
  });
});
