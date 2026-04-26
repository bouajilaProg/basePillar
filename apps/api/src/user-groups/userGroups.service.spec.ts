import { Test, TestingModule } from '@nestjs/testing';
import { UserGroupsService } from './userGroups.service';
import { DB_CONNECTION } from '../db/db.module';
import { ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';

/**
 * AGGRESSIVE TEST SUITE: UserGroupsService
 *
 * Why test UserGroupsService thoroughly?
 * 1. Groups are used for bulk access control - must be reliable
 * 2. Group membership affects permission checks across the system
 * 3. Must prevent orphan groups and invalid memberships
 * 4. Names should be unique within a filebase
 *
 * Testing strategy:
 * - Mock database operations
 * - Test CRUD operations for groups
 * - Test member management (add/remove)
 * - Test constraints (unique name per filebase)
 * - Test user's group membership queries
 */
describe('UserGroupsService', () => {
  let service: UserGroupsService;
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
        onConflictDoNothing: jest.fn(() => ({
          returning: jest.fn(() => {
            const value = insertQueue.shift();
            return Promise.resolve(value ?? []);
          }),
        })),
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
      transaction: jest.fn(),
      _queueSelect: (value: any) => selectQueue.push(value),
      _queueInsert: (value: any) => insertQueue.push(value),
      _setSelectQueue: (queue: any[]) => {
        selectQueue = queue;
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
      providers: [
        UserGroupsService,
        {
          provide: DB_CONNECTION,
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<UserGroupsService>(UserGroupsService);
  });

  afterEach(() => {
    mockDb._reset();
  });

  describe('create', () => {
    const createDto = {
      filebaseId: 'fb-123',
      name: 'Editors',
    };

    /**
     * WHY: Groups allow bulk permission management
     */
    it('should create a new user group', async () => {
      // Mock: no existing group with same name
      mockDb._queueSelect([]);
      // Mock: group created
      mockDb._queueInsert([
        { id: 'group-1', filebaseId: 'fb-123', name: 'Editors', createdAt: new Date() },
      ]);

      const result = await service.create(createDto);

      expect(result.id).toBe('group-1');
      expect(result.name).toBe('Editors');
      expect(result.filebaseId).toBe('fb-123');
    });

    /**
     * WHY: Group names must be unique within a filebase
     */
    it('should throw ConflictException if name already exists in filebase', async () => {
      // Mock: existing group with same name
      mockDb._queueSelect([{ id: 'existing', name: 'Editors', filebaseId: 'fb-123' }]);

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });

    /**
     * WHY: Same name is allowed in different filebases
     */
    it('should allow same name in different filebases', async () => {
      // Mock: no existing in this filebase
      mockDb._queueSelect([]);
      mockDb._queueInsert([
        { id: 'group-2', filebaseId: 'fb-456', name: 'Editors', createdAt: new Date() },
      ]);

      const result = await service.create({ filebaseId: 'fb-456', name: 'Editors' });

      expect(result.name).toBe('Editors');
      expect(result.filebaseId).toBe('fb-456');
    });
  });

  describe('findById', () => {
    /**
     * WHY: Need to retrieve group details
     */
    it('should return group by ID', async () => {
      mockDb._queueSelect([{ id: 'group-1', filebaseId: 'fb-123', name: 'Editors' }]);

      const result = await service.findById('group-1');

      expect(result.id).toBe('group-1');
      expect(result.name).toBe('Editors');
    });

    /**
     * WHY: Must handle non-existent groups gracefully
     */
    it('should throw NotFoundException if group not found', async () => {
      mockDb._queueSelect([]);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByFilebaseId', () => {
    /**
     * WHY: List all groups in a filebase for management
     */
    it('should return all groups in a filebase', async () => {
      mockDb._queueSelect([
        { id: 'group-1', filebaseId: 'fb-123', name: 'Editors' },
        { id: 'group-2', filebaseId: 'fb-123', name: 'Viewers' },
      ]);

      const result = await service.findByFilebaseId('fb-123');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Editors');
      expect(result[1].name).toBe('Viewers');
    });

    /**
     * WHY: Empty list is valid for filebase with no groups
     */
    it('should return empty array for filebase with no groups', async () => {
      mockDb._queueSelect([]);

      const result = await service.findByFilebaseId('fb-empty');

      expect(result).toEqual([]);
    });
  });

  describe('rename', () => {
    /**
     * WHY: Allow renaming groups
     */
    it('should rename a group', async () => {
      // Mock: group exists
      mockDb._queueSelect([{ id: 'group-1', filebaseId: 'fb-123', name: 'Editors' }]);
      // Mock: no conflict with new name
      mockDb._queueSelect([]);
      // Mock: update returns new name
      mockDb._queueSelect([{ id: 'group-1', filebaseId: 'fb-123', name: 'Senior Editors' }]);

      const result = await service.rename('group-1', 'Senior Editors');

      expect(result.name).toBe('Senior Editors');
    });

    /**
     * WHY: Prevent duplicate names
     */
    it('should throw ConflictException if new name already exists', async () => {
      // Mock: group exists
      mockDb._queueSelect([{ id: 'group-1', filebaseId: 'fb-123', name: 'Editors' }]);
      // Mock: conflict with new name
      mockDb._queueSelect([{ id: 'group-2', filebaseId: 'fb-123', name: 'Viewers' }]);

      await expect(service.rename('group-1', 'Viewers')).rejects.toThrow(ConflictException);
    });

    /**
     * WHY: Can't rename non-existent group
     */
    it('should throw NotFoundException if group not found', async () => {
      mockDb._queueSelect([]);

      await expect(service.rename('nonexistent', 'NewName')).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    /**
     * WHY: Clean up unused groups
     */
    it('should delete a group', async () => {
      // Mock: group exists
      mockDb._queueSelect([{ id: 'group-1', filebaseId: 'fb-123', name: 'Editors' }]);

      await expect(service.delete('group-1')).resolves.not.toThrow();
      expect(mockDb.delete).toHaveBeenCalled();
    });

    /**
     * WHY: Can't delete non-existent group
     */
    it('should throw NotFoundException if group not found', async () => {
      mockDb._queueSelect([]);

      await expect(service.delete('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('addMember', () => {
    /**
     * WHY: Add users to groups for bulk permissions
     */
    it('should add a user to a group', async () => {
      // Mock: group exists
      mockDb._queueSelect([{ id: 'group-1', filebaseId: 'fb-123', name: 'Editors' }]);
      // Mock: user not already in group
      mockDb._queueSelect([]);
      // Mock: member added
      mockDb._queueInsert([{ groupId: 'group-1', userId: 'user-1' }]);

      const result = await service.addMember('group-1', 'user-1');

      expect(result.groupId).toBe('group-1');
      expect(result.userId).toBe('user-1');
    });

    /**
     * WHY: Prevent duplicate memberships
     */
    it('should throw ConflictException if user already in group', async () => {
      // Mock: group exists
      mockDb._queueSelect([{ id: 'group-1', filebaseId: 'fb-123', name: 'Editors' }]);
      // Mock: user already in group
      mockDb._queueSelect([{ groupId: 'group-1', userId: 'user-1' }]);

      await expect(service.addMember('group-1', 'user-1')).rejects.toThrow(ConflictException);
    });

    /**
     * WHY: Can't add to non-existent group
     */
    it('should throw NotFoundException if group not found', async () => {
      mockDb._queueSelect([]);

      await expect(service.addMember('nonexistent', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeMember', () => {
    /**
     * WHY: Allow removing users from groups
     */
    it('should remove a user from a group', async () => {
      // Mock: membership exists
      mockDb._queueSelect([{ groupId: 'group-1', userId: 'user-1' }]);

      await expect(service.removeMember('group-1', 'user-1')).resolves.not.toThrow();
      expect(mockDb.delete).toHaveBeenCalled();
    });

    /**
     * WHY: Can't remove non-existent membership
     */
    it('should throw NotFoundException if membership not found', async () => {
      mockDb._queueSelect([]);

      await expect(service.removeMember('group-1', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMembers', () => {
    /**
     * WHY: List all members in a group for management
     */
    it('should return all members of a group', async () => {
      mockDb._queueSelect([
        { groupId: 'group-1', userId: 'user-1' },
        { groupId: 'group-1', userId: 'user-2' },
      ]);

      const result = await service.getMembers('group-1');

      expect(result).toHaveLength(2);
    });

    /**
     * WHY: Empty group is valid
     */
    it('should return empty array for group with no members', async () => {
      mockDb._queueSelect([]);

      const result = await service.getMembers('group-empty');

      expect(result).toEqual([]);
    });
  });

  describe('getUserGroups', () => {
    /**
     * WHY: Find all groups a user belongs to (for permission checks)
     */
    it('should return all groups for a user in a filebase', async () => {
      mockDb._queueSelect([
        { groupId: 'group-1', userId: 'user-1' },
        { groupId: 'group-2', userId: 'user-1' },
      ]);

      const result = await service.getUserGroups('user-1', 'fb-123');

      expect(result).toHaveLength(2);
    });

    /**
     * WHY: User may not be in any groups
     */
    it('should return empty array if user has no groups', async () => {
      mockDb._queueSelect([]);

      const result = await service.getUserGroups('user-lonely', 'fb-123');

      expect(result).toEqual([]);
    });
  });

  describe('getUserGroupIds', () => {
    /**
     * WHY: Used by access rules service to check group-based permissions
     */
    it('should return array of group IDs for a user', async () => {
      mockDb._queueSelect([
        { groupId: 'group-1', userId: 'user-1' },
        { groupId: 'group-2', userId: 'user-1' },
      ]);

      const result = await service.getUserGroupIds('user-1', 'fb-123');

      expect(result).toEqual(['group-1', 'group-2']);
    });

    /**
     * WHY: Empty array for user with no groups
     */
    it('should return empty array if user has no groups', async () => {
      mockDb._queueSelect([]);

      const result = await service.getUserGroupIds('user-1', 'fb-123');

      expect(result).toEqual([]);
    });
  });

  describe('isUserInGroup', () => {
    /**
     * WHY: Quick check if user is in a specific group
     */
    it('should return true if user is in group', async () => {
      mockDb._queueSelect([{ groupId: 'group-1', userId: 'user-1' }]);

      const result = await service.isUserInGroup('group-1', 'user-1');

      expect(result).toBe(true);
    });

    /**
     * WHY: Return false for non-members
     */
    it('should return false if user is not in group', async () => {
      mockDb._queueSelect([]);

      const result = await service.isUserInGroup('group-1', 'user-1');

      expect(result).toBe(false);
    });
  });

  describe('edge cases', () => {
    /**
     * WHY: Group names may contain special characters
     */
    it('should handle unicode group names', async () => {
      mockDb._queueSelect([]);
      mockDb._queueInsert([
        { id: 'group-1', filebaseId: 'fb-123', name: '编辑团队 🎨', createdAt: new Date() },
      ]);

      const result = await service.create({ filebaseId: 'fb-123', name: '编辑团队 🎨' });

      expect(result.name).toBe('编辑团队 🎨');
    });

    /**
     * WHY: Handle empty string names gracefully (should be prevented at validation layer)
     */
    it('should handle whitespace-only names', async () => {
      mockDb._queueSelect([]);
      // In a real scenario, validation would reject this, but service should handle it
      mockDb._queueInsert([
        { id: 'group-1', filebaseId: 'fb-123', name: '   ', createdAt: new Date() },
      ]);

      const result = await service.create({ filebaseId: 'fb-123', name: '   ' });

      // Service creates it - validation is done at controller/DTO level
      expect(result.name).toBe('   ');
    });
  });
});
