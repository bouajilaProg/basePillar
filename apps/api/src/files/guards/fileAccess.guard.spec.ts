import { Test, TestingModule } from '@nestjs/testing';
import { FileAccessGuard, FILE_PERMISSION_KEY } from './fileAccess.guard';
import { AccessRulesService } from '../../access-rules/accessRules.service';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

describe('FileAccessGuard', () => {
  let guard: FileAccessGuard;
  let mockAccessRulesService: any;
  let mockReflector: any;

  const createMockContext = (user: any, params: any = {}): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user, params }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as ExecutionContext;

  beforeEach(async () => {
    mockAccessRulesService = { checkAccess: jest.fn() };
    mockReflector = { getAllAndOverride: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileAccessGuard,
        { provide: AccessRulesService, useValue: mockAccessRulesService },
        { provide: Reflector, useValue: mockReflector },
      ],
    }).compile();

    guard = module.get<FileAccessGuard>(FileAccessGuard);
  });

  it('should allow access when user has permission', async () => {
    mockReflector.getAllAndOverride.mockReturnValue('read');
    mockAccessRulesService.checkAccess.mockResolvedValue(true);

    const ctx = createMockContext({ sub: 'user-1' }, { folderId: 'folder-1' });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('should deny access when user lacks permission', async () => {
    mockReflector.getAllAndOverride.mockReturnValue('write');
    mockAccessRulesService.checkAccess.mockResolvedValue(false);

    const ctx = createMockContext({ sub: 'user-1' }, { folderId: 'folder-1' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should pass when no permission metadata is set', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(undefined);

    const ctx = createMockContext({ sub: 'user-1' }, { folderId: 'folder-1' });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });
});
