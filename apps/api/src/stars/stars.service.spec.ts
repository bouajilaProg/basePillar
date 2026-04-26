import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { StarsService } from './stars.service';
import { DB_CONNECTION } from '../db/db.module';

describe('StarsService', () => {
  let service: StarsService;
  let mockDb: any;

  interface MockDb {
    select: jest.Mock;
    insert: jest.Mock;
    delete: jest.Mock;
    _queueSelect: (value: any) => void;
    _queueInsert: (value: any) => void;
    _queueDelete: (value: any) => void;
  }

  const createMockDb = (): MockDb => {
    let selectQueue: any[] = [];
    let insertQueue: any[] = [];
    let deleteQueue: any[] = [];

    const mockSelect = jest.fn(() => ({
      from: jest.fn(() => ({
        where: jest.fn(() => Promise.resolve(selectQueue.shift() ?? [])),
        innerJoin: jest.fn(() => ({
          where: jest.fn(() => ({
            orderBy: jest.fn(() => Promise.resolve(selectQueue.shift() ?? [])),
          })),
        })),
      })),
    }));

    const mockInsert = jest.fn(() => ({
      values: jest.fn(() => ({
        returning: jest.fn(() => Promise.resolve(insertQueue.shift() ?? [])),
      })),
    }));

    const mockDelete = jest.fn(() => ({
      where: jest.fn(() => ({
        returning: jest.fn(() => Promise.resolve(deleteQueue.shift() ?? [])),
      })),
    }));

    return {
      select: mockSelect,
      insert: mockInsert,
      delete: mockDelete,
      _queueSelect: (value: any) => selectQueue.push(value),
      _queueInsert: (value: any) => insertQueue.push(value),
      _queueDelete: (value: any) => deleteQueue.push(value),
    };
  };

  beforeEach(async () => {
    mockDb = createMockDb();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StarsService,
        {
          provide: DB_CONNECTION,
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<StarsService>(StarsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('star', () => {
    const dto = {
      filebaseId: 'fb-1',
      folderId: 'folder-1',
      userId: 'user-1',
    };

    it('should create a new star', async () => {
      mockDb._queueSelect([{ id: 'folder-1', filebaseId: 'fb-1', name: 'Design Docs' }]);
      mockDb._queueSelect([]);
      mockDb._queueInsert([
        {
          id: 'star-1',
          filebaseId: 'fb-1',
          folderId: 'folder-1',
          userId: 'user-1',
          createdAt: new Date(),
        },
      ]);

      const result = await service.star(dto);

      expect(result.id).toBe('star-1');
      expect(result.folderId).toBe('folder-1');
    });

    it('should throw NotFoundException when folder is missing', async () => {
      mockDb._queueSelect([]);

      await expect(service.star(dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when folder is outside filebase', async () => {
      mockDb._queueSelect([{ id: 'folder-1', filebaseId: 'fb-2' }]);

      await expect(service.star(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when star already exists', async () => {
      mockDb._queueSelect([{ id: 'folder-1', filebaseId: 'fb-1' }]);
      mockDb._queueSelect([
        { id: 'star-1', filebaseId: 'fb-1', folderId: 'folder-1', userId: 'user-1' },
      ]);

      await expect(service.star(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('unstar', () => {
    const dto = {
      filebaseId: 'fb-1',
      folderId: 'folder-1',
      userId: 'user-1',
    };

    it('should remove an existing star', async () => {
      mockDb._queueDelete([{ id: 'star-1' }]);

      await expect(service.unstar(dto)).resolves.not.toThrow();
    });

    it('should throw NotFoundException when star does not exist', async () => {
      mockDb._queueDelete([]);

      await expect(service.unstar(dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('listStars', () => {
    it('should return current user starred folders in filebase', async () => {
      mockDb._queueSelect([
        {
          id: 'star-1',
          filebaseId: 'fb-1',
          folderId: 'folder-1',
          userId: 'user-1',
          createdAt: new Date(),
          folderName: 'Design Docs',
          parentId: null,
        },
      ]);

      const result = await service.listStars('fb-1', 'user-1');

      expect(result).toHaveLength(1);
      expect(result[0].folderName).toBe('Design Docs');
    });

    it('should return an empty array when there are no stars', async () => {
      mockDb._queueSelect([]);

      const result = await service.listStars('fb-1', 'user-1');

      expect(result).toEqual([]);
    });
  });
});
