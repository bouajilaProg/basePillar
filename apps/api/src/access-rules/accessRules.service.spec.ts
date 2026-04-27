import { Test, TestingModule } from '@nestjs/testing';
import {
  AccessRulesService,
  Permission,
  AccessType,
  TargetType,
  SubjectType,
} from './accessRules.service';
import { DB_CONNECTION } from '../db/db.module';
import { FoldersService } from '../folders/folders.service';

/**
 * AGGRESSIVE TEST SUITE: AccessRulesService
 *
 * Why test AccessRulesService thoroughly?
 * 1. Access control is security-critical
 * 2. Whitelist vs blacklist logic must be correct
 * 3. Inheritance up folder tree must work
 * 4. Group membership must be considered
 *
 * Access Logic:
 * 1. If ANY allow rule exists for resource → whitelist mode
 * 2. Else → open access (denied only by explicit deny)
 * 3. Rules inherit from parent folders
 *
 * Testing strategy:
 * - Test CRUD operations for rules
 * - Test permission checking logic
 * - Test inheritance up folder tree
 * - Test group-based permissions
 */
describe('AccessRulesService', () => {
  let service: AccessRulesService;
  let mockDb: any;
  let mockFoldersService: any;

  interface MockDb {
    select: jest.Mock;
    insert: jest.Mock;
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

    const mockDelete = jest.fn(() => ({
      where: jest.fn(() => Promise.resolve({ rowCount: 1 })),
    }));

    return {
      select: mockSelect,
      insert: mockInsert,
      delete: mockDelete,
      _queueSelect: (value: any) => selectQueue.push(value),
      _queueInsert: (value: any) => insertQueue.push(value),
      _reset: () => {
        selectQueue = [];
        insertQueue = [];
        mockSelect.mockClear();
        mockInsert.mockClear();
        mockDelete.mockClear();
      },
    };
  };

  beforeEach(async () => {
    mockDb = createMockDb();
    mockFoldersService = {
      getPath: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccessRulesService,
        { provide: DB_CONNECTION, useValue: mockDb },
        { provide: FoldersService, useValue: mockFoldersService },
      ],
    }).compile();

    service = module.get<AccessRulesService>(AccessRulesService);
  });

  describe('createRule', () => {
    const createDto = {
      targetType: 'folder' as TargetType,
      targetId: 'folder-123',
      subjectType: 'user' as SubjectType,
      subjectId: 'user-456',
      accessType: 'allow' as AccessType,
      permission: 'read' as Permission,
    };

    /**
     * WHY: Basic rule creation must work
     */
    it('should create an access rule', async () => {
      mockDb._queueInsert([{ id: 'rule-123', ...createDto }]);

      const result = await service.createRule(createDto);

      expect(result.id).toBe('rule-123');
      expect(result.permission).toBe('read');
    });

    /**
     * WHY: Must support all permission types
     */
    it('should create rules for all permission types', async () => {
      const permissions: Permission[] = ['read', 'write', 'delete', 'share'];

      for (const permission of permissions) {
        mockDb._queueInsert([{ id: `rule-${permission}`, ...createDto, permission }]);
        const result = await service.createRule({ ...createDto, permission });
        expect(result.permission).toBe(permission);
      }
    });

    /**
     * WHY: Must support both allow and deny
     */
    it('should create both allow and deny rules', async () => {
      mockDb._queueInsert([{ id: 'rule-allow', ...createDto, accessType: 'allow' }]);
      const allowResult = await service.createRule({ ...createDto, accessType: 'allow' });
      expect(allowResult.accessType).toBe('allow');

      mockDb._queueInsert([{ id: 'rule-deny', ...createDto, accessType: 'deny' }]);
      const denyResult = await service.createRule({ ...createDto, accessType: 'deny' });
      expect(denyResult.accessType).toBe('deny');
    });
  });

  describe('findRulesForTarget', () => {
    /**
     * WHY: Must be able to get all rules for a resource
     */
    it('should return all rules for a target', async () => {
      mockDb._queueSelect([
        { id: 'rule-1', targetType: 'folder', targetId: 'folder-123', permission: 'read' },
        { id: 'rule-2', targetType: 'folder', targetId: 'folder-123', permission: 'write' },
      ]);

      const result = await service.findRulesForTarget('folder', 'folder-123');

      expect(result).toHaveLength(2);
    });

    /**
     * WHY: Return empty array if no rules exist
     */
    it('should return empty array when no rules exist', async () => {
      mockDb._queueSelect([]);

      const result = await service.findRulesForTarget('folder', 'folder-123');

      expect(result).toEqual([]);
    });
  });

  describe('deleteRule', () => {
    /**
     * WHY: Must be able to delete rules
     */
    it('should delete an access rule', async () => {
      await expect(service.deleteRule('rule-123')).resolves.not.toThrow();
      expect(mockDb.delete).toHaveBeenCalled();
    });
  });

  describe('checkAccess (without inheritance)', () => {
    /**
     * WHY: If no rules exist, access is granted (open access mode)
     */
    it('should grant access when no rules exist (open access)', async () => {
      // Mock: first - get user groups (empty)
      mockDb._queueSelect([]);
      // Mock: second - no rules for folder
      mockDb._queueSelect([]);

      const result = await service.checkAccess({
        userId: 'user-123',
        targetType: 'folder',
        targetId: 'folder-456',
        permission: 'read',
        checkInheritance: false,
      });

      expect(result).toBe(true);
    });

    /**
     * WHY: If allow rule exists, access is granted (whitelist mode)
     */
    it('should grant access when explicit allow rule exists', async () => {
      // Mock: first - no group memberships
      mockDb._queueSelect([]);
      // Mock: second - allow rule exists for this user
      mockDb._queueSelect([
        { subjectType: 'user', subjectId: 'user-123', accessType: 'allow', permission: 'read' },
      ]);

      const result = await service.checkAccess({
        userId: 'user-123',
        targetType: 'folder',
        targetId: 'folder-456',
        permission: 'read',
        checkInheritance: false,
      });

      expect(result).toBe(true);
    });

    /**
     * WHY: If explicit deny rule exists, access is denied
     */
    it('should deny access when explicit deny rule exists', async () => {
      // Mock: first - no group memberships
      mockDb._queueSelect([]);
      // Mock: second - deny rule exists
      mockDb._queueSelect([
        { subjectType: 'user', subjectId: 'user-123', accessType: 'deny', permission: 'read' },
      ]);

      const result = await service.checkAccess({
        userId: 'user-123',
        targetType: 'folder',
        targetId: 'folder-456',
        permission: 'read',
        checkInheritance: false,
      });

      expect(result).toBe(false);
    });

    /**
     * WHY: Whitelist mode - if allow rules exist but not for this user, deny
     */
    it('should deny access in whitelist mode when user not in allow list', async () => {
      // Mock: first - no group memberships
      mockDb._queueSelect([]);
      // Mock: second - allow rule exists but for different user
      mockDb._queueSelect([
        { subjectType: 'user', subjectId: 'other-user', accessType: 'allow', permission: 'read' },
      ]);

      const result = await service.checkAccess({
        userId: 'user-123',
        targetType: 'folder',
        targetId: 'folder-456',
        permission: 'read',
        checkInheritance: false,
      });

      expect(result).toBe(false);
    });

    /**
     * WHY: Deny takes precedence over allow
     */
    it('should deny access when both allow and deny rules exist', async () => {
      // Mock: first - no group memberships
      mockDb._queueSelect([]);
      // Mock: second - both allow and deny rules
      mockDb._queueSelect([
        { subjectType: 'user', subjectId: 'user-123', accessType: 'allow', permission: 'read' },
        { subjectType: 'user', subjectId: 'user-123', accessType: 'deny', permission: 'read' },
      ]);

      const result = await service.checkAccess({
        userId: 'user-123',
        targetType: 'folder',
        targetId: 'folder-456',
        permission: 'read',
        checkInheritance: false,
      });

      expect(result).toBe(false);
    });
  });

  describe('checkAccess (with group membership)', () => {
    /**
     * WHY: Group-based allow should grant access
     */
    it('should grant access via group membership', async () => {
      // Mock: first - user is member of the group
      mockDb._queueSelect([{ groupId: 'group-1' }]);
      // Mock: second - allow rule for group
      mockDb._queueSelect([
        { subjectType: 'group', subjectId: 'group-1', accessType: 'allow', permission: 'read' },
      ]);

      const result = await service.checkAccess({
        userId: 'user-123',
        targetType: 'folder',
        targetId: 'folder-456',
        permission: 'read',
        checkInheritance: false,
      });

      expect(result).toBe(true);
    });

    /**
     * WHY: Group-based deny should revoke access
     */
    it('should deny access via group membership', async () => {
      // Mock: first - user is member of the group
      mockDb._queueSelect([{ groupId: 'group-1' }]);
      // Mock: second - deny rule for group
      mockDb._queueSelect([
        { subjectType: 'group', subjectId: 'group-1', accessType: 'deny', permission: 'read' },
      ]);

      const result = await service.checkAccess({
        userId: 'user-123',
        targetType: 'folder',
        targetId: 'folder-456',
        permission: 'read',
        checkInheritance: false,
      });

      expect(result).toBe(false);
    });
  });

  describe('checkAccess (with inheritance)', () => {
    /**
     * WHY: Rules should inherit from parent folders
     */
    it('should inherit allow rule from parent folder', async () => {
      // Mock: first - no group memberships for user
      mockDb._queueSelect([]);
      // Mock: second - no rules on current folder
      mockDb._queueSelect([]);
      // Mock: folder path (for inheritance)
      mockFoldersService.getPath.mockResolvedValue([
        { id: 'root', parentId: null },
        { id: 'parent-folder', parentId: 'root' },
        { id: 'folder-456', parentId: 'parent-folder' },
      ]);
      // Mock: rules on parent-folder (checking from current to root)
      mockDb._queueSelect([
        { subjectType: 'user', subjectId: 'user-123', accessType: 'allow', permission: 'read' },
      ]);

      const result = await service.checkAccess({
        userId: 'user-123',
        targetType: 'folder',
        targetId: 'folder-456',
        permission: 'read',
        checkInheritance: true,
      });

      expect(result).toBe(true);
    });
  });

  describe('edge cases', () => {
    /**
     * WHY: Different permissions should be independent
     * Note: Whitelist mode is per-permission. If allow rules exist for 'read',
     * that doesn't affect 'write' permission checks.
     */
    it('should check correct permission type', async () => {
      // Mock: first - no group memberships
      mockDb._queueSelect([]);
      // Mock: second - allow rules only for 'read', not 'write'
      // When checking 'write', these rules are filtered out by permission
      mockDb._queueSelect([
        { subjectType: 'user', subjectId: 'user-123', accessType: 'allow', permission: 'read' },
      ]);

      // Checking write permission - no rules for write, so open access mode
      const result = await service.checkAccess({
        userId: 'user-123',
        targetType: 'folder',
        targetId: 'folder-456',
        permission: 'write',
        checkInheritance: false,
      });

      // Open access mode (no write rules) - access granted
      expect(result).toBe(true);
    });

    /**
     * WHY: Whitelist mode for specific permission should work
     */
    it('should deny access when write has whitelist but user not included', async () => {
      // Mock: first - no group memberships
      mockDb._queueSelect([]);
      // Mock: second - allow rules for write for different user
      mockDb._queueSelect([
        { subjectType: 'user', subjectId: 'other-user', accessType: 'allow', permission: 'write' },
      ]);

      const result = await service.checkAccess({
        userId: 'user-123',
        targetType: 'folder',
        targetId: 'folder-456',
        permission: 'write',
        checkInheritance: false,
      });

      // Whitelist mode for write - user not in list, denied
      expect(result).toBe(false);
    });

    /**
     * WHY: UUID subject IDs should work
     */
    it('should handle UUID IDs', async () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      mockDb._queueInsert([
        {
          id: 'rule-123',
          targetType: 'folder',
          targetId: uuid,
          subjectType: 'user',
          subjectId: uuid,
          accessType: 'allow',
          permission: 'read',
        },
      ]);

      const result = await service.createRule({
        targetType: 'folder',
        targetId: uuid,
        subjectType: 'user',
        subjectId: uuid,
        accessType: 'allow',
        permission: 'read',
      });

      expect(result.targetId).toBe(uuid);
    });
  });
});
