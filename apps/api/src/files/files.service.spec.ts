import { Test, TestingModule } from '@nestjs/testing';
import { FileService } from './files.service';
import { FsService } from '../fs/fs.service';
import { FileCleanupService } from '../db/triggers/fileCleanup.service';
import { DB_CONNECTION } from '../db/db.module';
import { NotFoundException, ConflictException } from '@nestjs/common';

/**
 * AGGRESSIVE TEST SUITE: FileService
 *
 * Why test FileService thoroughly?
 * 1. File uploads involve S3 and DB - must be atomic
 * 2. Shortcuts allow multiple pointers to same file
 * 3. Orphan cleanup must trigger when last pointer deleted
 * 4. File metadata must stay consistent
 *
 * Testing strategy:
 * - Mock S3 operations (FsService)
 * - Mock database operations
 * - Test upload, download, delete flows
 * - Test shortcut creation
 */
describe('FileService', () => {
  let service: FileService;
  let mockDb: any;
  let mockFsService: any;
  let mockCleanupService: any;

  interface MockDb {
    select: jest.Mock;
    insert: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    transaction: jest.Mock;
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
        innerJoin: jest.fn(() => ({
          where: jest.fn(() => {
            const value = selectQueue.shift();
            return Promise.resolve(value ?? []);
          }),
        })),
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

    const mockTransaction = jest.fn(async <T>(callback: (tx: MockDb) => Promise<T>): Promise<T> => {
      const txMock: MockDb = {
        select: mockSelect,
        insert: mockInsert,
        update: mockUpdate,
        delete: mockDelete,
        transaction: mockTransaction,
        _queueSelect: (value: any) => selectQueue.push(value),
        _queueInsert: (value: any) => insertQueue.push(value),
        _setSelectQueue: () => {},
        _setInsertQueue: () => {},
        _reset: () => {},
      } as any;
      return callback(txMock);
    });

    return {
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      transaction: mockTransaction,
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
    mockFsService = {
      upload: jest.fn(),
      download: jest.fn(),
      delete: jest.fn(),
      getSignedUrl: jest.fn(),
    };
    mockCleanupService = {
      checkAndCleanupOrphanFile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileService,
        { provide: DB_CONNECTION, useValue: mockDb },
        { provide: FsService, useValue: mockFsService },
        { provide: FileCleanupService, useValue: mockCleanupService },
      ],
    }).compile();

    service = module.get<FileService>(FileService);
  });

  describe('upload', () => {
    const uploadDto = {
      filebaseId: 'fb-123',
      folderId: 'folder-456',
      name: 'test-file.pdf',
      buffer: Buffer.from('file content'),
      mimeType: 'application/pdf',
      uploadedBy: 'user-789',
    };

    /**
     * WHY: Basic upload must create file and pointer
     */
    it('should upload file and create pointer', async () => {
      // Mock S3 upload
      mockFsService.upload.mockResolvedValue({ s3Key: 'fb-123/uuid-1', size: 12 });
      // Mock file insert
      mockDb._queueInsert([{ id: 'file-1', s3Key: 'fb-123/uuid-1', size: BigInt(12) }]);
      // Mock pointer insert
      mockDb._queueInsert([{ id: 'pointer-1', fileId: 'file-1', name: 'test-file.pdf' }]);

      const result = await service.upload(uploadDto);

      expect(result.pointer.name).toBe('test-file.pdf');
      expect(result.file.s3Key).toBe('fb-123/uuid-1');
      expect(mockFsService.upload).toHaveBeenCalled();
    });

    /**
     * WHY: Must validate folder exists before upload
     */
    it('should throw if folder not found', async () => {
      // Override service to check folder first
      // This depends on implementation - adjust if needed
      mockDb._queueSelect([]); // folder not found

      await expect(service.upload({ ...uploadDto, validateFolder: true })).rejects.toThrow(
        NotFoundException
      );
    });

    /**
     * WHY: Duplicate names in same folder should be rejected
     */
    it('should throw ConflictException if file with same name exists in folder', async () => {
      // Mock: existing file with same name
      mockDb._queueSelect([{ id: 'existing', name: 'test-file.pdf', folderId: 'folder-456' }]);

      await expect(service.upload(uploadDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findById', () => {
    /**
     * WHY: Get file by pointer ID
     */
    it('should return file pointer with file info', async () => {
      mockDb._queueSelect([
        {
          id: 'pointer-1',
          fileId: 'file-1',
          name: 'test.pdf',
          file: { id: 'file-1', s3Key: 'fb/uuid', mimeType: 'application/pdf' },
        },
      ]);

      const result = await service.findById('pointer-1');

      expect(result.name).toBe('test.pdf');
    });

    /**
     * WHY: Must throw if not found
     */
    it('should throw NotFoundException when not found', async () => {
      mockDb._queueSelect([]);

      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByFolderId', () => {
    /**
     * WHY: List files in a folder
     */
    it('should return all file pointers in folder', async () => {
      mockDb._queueSelect([
        { id: 'p1', name: 'file1.pdf', folderId: 'folder-1' },
        { id: 'p2', name: 'file2.doc', folderId: 'folder-1' },
      ]);

      const result = await service.findByFolderId('folder-1');

      expect(result).toHaveLength(2);
    });

    /**
     * WHY: Empty folder should return empty array
     */
    it('should return empty array for empty folder', async () => {
      mockDb._queueSelect([]);

      const result = await service.findByFolderId('empty-folder');

      expect(result).toEqual([]);
    });
  });

  describe('createShortcut', () => {
    /**
     * WHY: Shortcuts allow multiple references to same file
     */
    it('should create a shortcut to existing file', async () => {
      // Mock: original pointer exists
      mockDb._queueSelect([{ id: 'original', fileId: 'file-1', name: 'original.pdf' }]);
      // Mock: no conflict in target folder
      mockDb._queueSelect([]);
      // Mock: shortcut insert
      mockDb._queueInsert([
        {
          id: 'shortcut-1',
          fileId: 'file-1',
          folderId: 'target-folder',
          name: 'shortcut.pdf',
          isShortcut: true,
        },
      ]);

      const result = await service.createShortcut({
        sourcePointerId: 'original',
        targetFolderId: 'target-folder',
        name: 'shortcut.pdf',
      });

      expect(result.isShortcut).toBe(true);
      expect(result.fileId).toBe('file-1');
    });

    /**
     * WHY: Source pointer must exist
     */
    it('should throw if source pointer not found', async () => {
      mockDb._queueSelect([]);

      await expect(
        service.createShortcut({
          sourcePointerId: 'non-existent',
          targetFolderId: 'folder',
          name: 'shortcut.pdf',
        })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('rename', () => {
    /**
     * WHY: Must be able to rename file pointers
     */
    it('should rename file pointer', async () => {
      // Mock: pointer exists
      mockDb._queueSelect([{ id: 'pointer-1', name: 'old-name.pdf', folderId: 'folder-1' }]);
      // Mock: no conflict
      mockDb._queueSelect([]);
      // Mock: update
      mockDb._queueSelect([{ id: 'pointer-1', name: 'new-name.pdf' }]);

      const result = await service.rename('pointer-1', 'new-name.pdf');

      expect(result.name).toBe('new-name.pdf');
    });

    /**
     * WHY: Cannot rename to existing name in same folder
     */
    it('should throw ConflictException on name collision', async () => {
      // Mock: pointer exists
      mockDb._queueSelect([{ id: 'pointer-1', name: 'old.pdf', folderId: 'folder-1' }]);
      // Mock: name already exists
      mockDb._queueSelect([{ id: 'other', name: 'new.pdf' }]);

      await expect(service.rename('pointer-1', 'new.pdf')).rejects.toThrow(ConflictException);
    });
  });

  describe('move', () => {
    /**
     * WHY: Move file to different folder
     */
    it('should move file pointer to new folder', async () => {
      // Mock: pointer exists
      mockDb._queueSelect([{ id: 'pointer-1', name: 'file.pdf', folderId: 'old-folder' }]);
      // Mock: target folder exists (we might not need this check)
      // Mock: no conflict in target
      mockDb._queueSelect([]);
      // Mock: update
      mockDb._queueSelect([{ id: 'pointer-1', name: 'file.pdf', folderId: 'new-folder' }]);

      const result = await service.move('pointer-1', 'new-folder');

      expect(result.folderId).toBe('new-folder');
    });
  });

  describe('delete', () => {
    /**
     * WHY: Deleting pointer should trigger cleanup check
     */
    it('should delete pointer and check for orphan cleanup', async () => {
      // Mock: pointer exists
      mockDb._queueSelect([{ id: 'pointer-1', fileId: 'file-1' }]);

      await service.delete('pointer-1');

      expect(mockDb.delete).toHaveBeenCalled();
      expect(mockCleanupService.checkAndCleanupOrphanFile).toHaveBeenCalledWith('file-1');
    });

    /**
     * WHY: Non-existent pointer should throw
     */
    it('should throw NotFoundException when pointer not found', async () => {
      mockDb._queueSelect([]);

      await expect(service.delete('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getDownloadUrl', () => {
    /**
     * WHY: Generate signed URL for file download
     */
    it('should return signed download URL', async () => {
      // Mock: pointer with file info
      mockDb._queueSelect([
        {
          id: 'pointer-1',
          file: { s3Key: 'fb/uuid' },
        },
      ]);
      mockFsService.getSignedUrl.mockResolvedValue('https://s3.example.com/signed');

      const url = await service.getDownloadUrl('pointer-1');

      expect(url).toBe('https://s3.example.com/signed');
    });
  });

  describe('edge cases', () => {
    /**
     * WHY: Unicode file names should work
     */
    it('should handle unicode file names', async () => {
      const unicodeName = 'файл 📄.pdf';
      mockFsService.upload.mockResolvedValue({ s3Key: 'fb/uuid', size: 10 });
      mockDb._queueSelect([]); // no conflict
      mockDb._queueInsert([{ id: 'file-1', s3Key: 'fb/uuid' }]);
      mockDb._queueInsert([{ id: 'pointer-1', name: unicodeName }]);

      const result = await service.upload({
        filebaseId: 'fb-1',
        folderId: 'folder-1',
        name: unicodeName,
        buffer: Buffer.from('test'),
        mimeType: 'application/pdf',
        uploadedBy: 'user-1',
      });

      expect(result.pointer.name).toBe(unicodeName);
    });

    /**
     * WHY: Large file sizes should be handled (bigint)
     */
    it('should handle large file sizes', async () => {
      const largeSize = BigInt('5000000000'); // 5GB
      mockFsService.upload.mockResolvedValue({ s3Key: 'fb/uuid', size: Number(largeSize) });
      mockDb._queueSelect([]);
      mockDb._queueInsert([{ id: 'file-1', s3Key: 'fb/uuid', size: largeSize }]);
      mockDb._queueInsert([{ id: 'pointer-1', name: 'large.zip' }]);

      const result = await service.upload({
        filebaseId: 'fb-1',
        folderId: 'folder-1',
        name: 'large.zip',
        buffer: Buffer.alloc(100), // Just a test buffer
        mimeType: 'application/zip',
        uploadedBy: 'user-1',
      });

      expect(result.file.size).toBe(largeSize);
    });
  });
});
