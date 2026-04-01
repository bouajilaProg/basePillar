import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { DB_CONNECTION } from '../db/db.module';
import { InvalidCredentialsException, ConflictException, NotFoundException } from '@repo/types';

/**
 * AGGRESSIVE TEST SUITE: AuthService
 *
 * Why test AuthService so thoroughly?
 * 1. Authentication is the gateway to the entire system - bugs here = security vulnerabilities
 * 2. Password hashing must be correct - wrong implementation = data breach
 * 3. JWT generation must be consistent - wrong tokens = auth failures
 * 4. User enumeration attacks must be prevented - consistent error messages
 *
 * NOTE: Organization/membership tests are commented out for now.
 * These will be replaced by filebase tests once implemented.
 *
 * Testing strategy:
 * - Mock database operations (no real DB in unit tests)
 * - Mock bcrypt for predictable password checks
 * - Mock JWT service for token verification
 * - Test all error paths aggressively
 */

describe('AuthService', () => {
  let service: AuthService;
  let mockDb: any;
  let mockJwtService: any;

  /**
   * Mock database that tracks operations
   *
   * This mock needs to handle two types of query patterns:
   * 1. select().from().where().limit() - returns from limit()
   * 2. select().from().innerJoin().where() - returns from where()
   *
   * We use a queue system for each terminal method.
   */
  const createMockDb = () => {
    let limitQueue: any[] = [];
    let whereTerminalQueue: any[] = [];
    let returningQueue: any[] = [];

    const mockSelect = jest.fn().mockReturnThis();
    const mockFrom = jest.fn().mockReturnThis();
    const mockInnerJoin = jest.fn(() => {
      // After innerJoin, the next where() is terminal
      return {
        where: jest.fn(() => {
          // Return queued value or empty array
          const value = whereTerminalQueue.shift() ?? [];
          return Promise.resolve(value);
        }),
      };
    });
    const mockWhere = jest.fn().mockReturnThis();
    const mockLimit = jest.fn(() => {
      const value = limitQueue.shift() ?? [];
      return Promise.resolve(value);
    });
    const mockInsert = jest.fn().mockReturnThis();
    const mockValues = jest.fn().mockReturnThis();
    const mockReturning = jest.fn(() => {
      const value = returningQueue.shift() ?? [];
      return Promise.resolve(value);
    });

    return {
      select: mockSelect,
      from: mockFrom,
      where: mockWhere,
      limit: mockLimit,
      insert: mockInsert,
      values: mockValues,
      returning: mockReturning,
      innerJoin: mockInnerJoin,
      // Queue helpers for test setup
      _queueLimit: (value: any) => {
        limitQueue.push(value);
      },
      _queueWhereTerminal: (value: any) => {
        whereTerminalQueue.push(value);
      },
      _queueReturning: (value: any) => {
        returningQueue.push(value);
      },
      _reset: () => {
        limitQueue = [];
        whereTerminalQueue = [];
        returningQueue = [];
        mockSelect.mockClear().mockReturnThis();
        mockFrom.mockClear().mockReturnThis();
        mockWhere.mockClear().mockReturnThis();
        mockInsert.mockClear().mockReturnThis();
        mockValues.mockClear().mockReturnThis();
      },
    };
  };

  beforeEach(async () => {
    mockDb = createMockDb();
    mockJwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DB_CONNECTION, useValue: mockDb },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    const validDto = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    };

    /**
     * WHY: Happy path must work - this is the core registration flow
     * NOTE: Organization creation is now commented out, only user is created
     */
    it('should successfully register a new user', async () => {
      // Mock: no existing user
      mockDb._queueLimit([]);
      // Mock: user insert
      mockDb._queueReturning([{ id: 'user-1', email: 'test@example.com', name: 'Test User' }]);

      const result = await service.register(validDto);

      expect(result.user.email).toBe('test@example.com');
      expect(result.user.name).toBe('Test User');
      expect(result.token).toBe('mock-jwt-token');
    });

    /**
     * WHY: Duplicate email is a security-relevant error
     * Must throw ConflictException, not leak info about existing users
     */
    it('should throw ConflictException when email already exists', async () => {
      // Mock: existing user found
      mockDb._queueLimit([{ id: 'existing-user', email: 'test@example.com' }]);

      await expect(service.register(validDto)).rejects.toThrow(ConflictException);
    });

    /**
     * WHY: JWT must be generated with correct payload
     * User ID and email are in the token for session management
     */
    it('should generate JWT with user ID and email', async () => {
      mockDb._queueLimit([]);
      mockDb._queueReturning([{ id: 'user-123', email: 'test@example.com', name: 'Test' }]);

      await service.register(validDto);

      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: 'user-123',
        email: 'test@example.com',
      });
    });

    /**
     * WHY: Empty name should still work (name is optional in some flows)
     */
    it('should register user with null name if not provided', async () => {
      mockDb._queueLimit([]);
      mockDb._queueReturning([{ id: 'user-1', email: 'test@example.com', name: null }]);

      const result = await service.register({
        email: 'test@example.com',
        password: 'password123',
        name: '',
      });

      expect(result.user.email).toBe('test@example.com');
    });

    // NOTE: Organization-related tests are commented out
    // -----------------------------------------------
    // /**
    //  * WHY: Custom organization name should be used if provided
    //  */
    // it('should use custom organization name if provided', async () => {
    //   // ...
    // });
    //
    // /**
    //  * WHY: Slug conflicts should be handled with timestamp suffix
    //  */
    // it('should add timestamp to slug if slug already exists', async () => {
    //   // ...
    // });
  });

  describe('login', () => {
    const validDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    /**
     * WHY: Successful login must return user and token
     * NOTE: Organizations are now commented out
     */
    it('should successfully login with valid credentials', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);

      // Mock: user found (first query with .limit())
      mockDb._queueLimit([
        { id: 'user-1', email: 'test@example.com', name: 'Test', password: passwordHash },
      ]);

      const result = await service.login(validDto);

      expect(result.user.email).toBe('test@example.com');
      expect(result.token).toBe('mock-jwt-token');
    });

    /**
     * WHY: Non-existent email must throw InvalidCredentialsException
     * NOT "user not found" - prevents user enumeration
     */
    it('should throw InvalidCredentialsException for non-existent email', async () => {
      mockDb._queueLimit([]); // No user found

      await expect(service.login(validDto)).rejects.toThrow(InvalidCredentialsException);
    });

    /**
     * WHY: Wrong password must throw same exception as non-existent email
     * Prevents user enumeration by timing or error message
     */
    it('should throw InvalidCredentialsException for wrong password', async () => {
      const passwordHash = await bcrypt.hash('different-password', 10);

      mockDb._queueLimit([{ id: 'user-1', email: 'test@example.com', password: passwordHash }]);

      await expect(service.login(validDto)).rejects.toThrow(InvalidCredentialsException);
    });

    /**
     * WHY: JWT must contain user ID for authorization
     */
    it('should generate JWT with correct payload', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);

      mockDb._queueLimit([
        { id: 'user-abc', email: 'test@example.com', name: 'Test', password: passwordHash },
      ]);

      await service.login(validDto);

      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: 'user-abc',
        email: 'test@example.com',
      });
    });

    /**
     * WHY: User name should be included in response
     */
    it('should return user name in response', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);

      mockDb._queueLimit([
        { id: 'user-1', email: 'test@example.com', name: 'Test User', password: passwordHash },
      ]);

      const result = await service.login(validDto);

      expect(result.user.name).toBe('Test User');
    });
  });

  describe('getCurrentUser', () => {
    /**
     * WHY: Must return user data for authenticated requests
     * NOTE: Organizations are now commented out
     */
    it('should return user data', async () => {
      mockDb._queueLimit([
        { id: 'user-1', email: 'test@example.com', name: 'Test', createdAt: new Date() },
      ]);

      const result = await service.getCurrentUser('user-1');

      expect(result.email).toBe('test@example.com');
      expect(result.id).toBe('user-1');
    });

    /**
     * WHY: Non-existent user ID must throw NotFoundException
     */
    it('should throw NotFoundException for non-existent user', async () => {
      mockDb._queueLimit([]);

      await expect(service.getCurrentUser('non-existent')).rejects.toThrow(NotFoundException);
    });

    /**
     * WHY: User's name and createdAt should be included
     */
    it('should return user name and createdAt', async () => {
      const createdAt = new Date('2024-01-01');
      mockDb._queueLimit([
        { id: 'user-1', email: 'test@example.com', name: 'Test User', createdAt },
      ]);

      const result = await service.getCurrentUser('user-1');

      expect(result.name).toBe('Test User');
      expect(result.createdAt).toEqual(createdAt);
    });
  });

  describe('edge cases', () => {
    /**
     * WHY: Email with special characters should be handled properly
     */
    it('should handle email with special characters', async () => {
      mockDb._queueLimit([]);
      mockDb._queueReturning([{ id: 'user-1', email: 'test+tag@example.com', name: 'Test' }]);

      const result = await service.register({
        email: 'test+tag@example.com',
        password: 'password123',
        name: 'Test',
      });

      expect(result.user.email).toBe('test+tag@example.com');
    });

    /**
     * WHY: Very long names should be handled (DB may truncate)
     */
    it('should handle long names', async () => {
      const longName = 'A'.repeat(255);
      mockDb._queueLimit([]);
      mockDb._queueReturning([{ id: 'user-1', email: 'test@example.com', name: longName }]);

      const result = await service.register({
        email: 'test@example.com',
        password: 'password123',
        name: longName,
      });

      expect(result.user.name).toBe(longName);
    });

    /**
     * WHY: Unicode names should be supported
     */
    it('should handle unicode names', async () => {
      const unicodeName = '日本語名前 🎉';
      mockDb._queueLimit([]);
      mockDb._queueReturning([{ id: 'user-1', email: 'test@example.com', name: unicodeName }]);

      const result = await service.register({
        email: 'test@example.com',
        password: 'password123',
        name: unicodeName,
      });

      expect(result.user.name).toBe(unicodeName);
    });
  });
});
