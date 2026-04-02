import { Test, TestingModule } from '@nestjs/testing';
import { FilebaseAccessGuard } from './filebaseAccess.guard';
import { DB_CONNECTION } from '../../db/db.module';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

describe('FilebaseAccessGuard', () => {
  let guard: FilebaseAccessGuard;
  let mockDb: any;
  let mockReflector: any;

  const createMockContext = (user: any, params: any = {}): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user, params }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as ExecutionContext;

  const createMockDb = () => {
    let selectQueue: any[] = [];
    return {
      select: jest.fn(() => ({
        from: jest.fn(() => ({
          where: jest.fn(() => Promise.resolve(selectQueue.shift() ?? [])),
        })),
      })),
      _queueSelect: (value: any) => selectQueue.push(value),
      _reset: () => {
        selectQueue = [];
      },
    };
  };

  beforeEach(async () => {
    mockDb = createMockDb();
    mockReflector = { getAllAndOverride: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilebaseAccessGuard,
        { provide: DB_CONNECTION, useValue: mockDb },
        { provide: Reflector, useValue: mockReflector },
      ],
    }).compile();

    guard = module.get<FilebaseAccessGuard>(FilebaseAccessGuard);
  });

  it('should allow owner access', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(['viewer']);
    mockDb._queueSelect([{ id: 'fb-1', ownerId: 'user-1' }]);

    const ctx = createMockContext({ sub: 'user-1' }, { filebaseId: 'fb-1' });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('should allow member with required role', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(['editor']);
    mockDb._queueSelect([{ id: 'fb-1', ownerId: 'other' }]); // not owner
    mockDb._queueSelect([{ role: 'admin' }]); // member with higher role

    const ctx = createMockContext({ sub: 'user-1' }, { filebaseId: 'fb-1' });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('should deny access when user has insufficient role', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(['admin']);
    mockDb._queueSelect([{ id: 'fb-1', ownerId: 'other' }]);
    mockDb._queueSelect([{ role: 'viewer' }]); // insufficient

    const ctx = createMockContext({ sub: 'user-1' }, { filebaseId: 'fb-1' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should deny access when user is not a member', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(['viewer']);
    mockDb._queueSelect([{ id: 'fb-1', ownerId: 'other' }]);
    mockDb._queueSelect([]); // not a member

    const ctx = createMockContext({ sub: 'user-1' }, { filebaseId: 'fb-1' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });
});
