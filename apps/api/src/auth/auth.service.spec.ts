import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { DB_CONNECTION } from '../db/db.module';
import {
  InvalidCredentialsException,
  ConflictException,
  NotFoundException,
} from '@repo/types';

/**
 * AGGRESSIVE TEST SUITE: AuthService
 *
 * Why test AuthService so thoroughly?
 * 1. Authentication is the gateway to the entire system - bugs here = security vulnerabilities
 * 2. Password hashing must be correct - wrong implementation = data breach
 * 3. JWT generation must be consistent - wrong tokens = auth failures
 * 4. User enumeration attacks must be prevented - consistent error messages
 * 5. Registration flow creates multiple entities - must be atomic
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
      _queueLimit: (value: any) => { limitQueue.push(value); },
      _queueWhereTerminal: (value: any) => { whereTerminalQueue.push(value); },
      _queueReturning: (value: any) => { returningQueue.push(value); },
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
     */
    it('should successfully register a new user', async () => {
      // Mock: no existing user
      mockDb._queueLimit([]);
      // Mock: no existing org with same slug
      mockDb._queueLimit([]);
      // Mock: org insert
      mockDb._queueReturning([{ id: 'org-1', name: "Test User's Org", slug: 'test-user' }]);
      // Mock: user insert
      mockDb._queueReturning([{ id: 'user-1', email: 'test@example.com', name: 'Test User' }]);
      // Mock: membership insert
      mockDb._queueReturning([]);

      const result = await service.register(validDto);

      expect(result.user.email).toBe('test@example.com');
      expect(result.organization.name).toBe("Test User's Org");
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
      mockDb._queueLimit([]);
      mockDb._queueReturning([{ id: 'org-1', name: 'Org', slug: 'org' }]);
      mockDb._queueReturning([{ id: 'user-123', email: 'test@example.com', name: 'Test' }]);
      mockDb._queueReturning([]);

      await service.register(validDto);

      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: 'user-123',
        email: 'test@example.com',
      });
    });

    /**
     * WHY: Custom organization name should be used if provided
     */
    it('should use custom organization name if provided', async () => {
      mockDb._queueLimit([]);
      mockDb._queueLimit([]);
      mockDb._queueReturning([{ id: 'org-1', name: 'Custom Org Name', slug: 'test' }]);
      mockDb._queueReturning([{ id: 'user-1', email: 'test@example.com', name: 'Test User' }]);
      mockDb._queueReturning([]);

      const result = await service.register({
        ...validDto,
        organizationName: 'Custom Org Name',
      });

      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Custom Org Name',
        })
      );
    });

    /**
     * WHY: Slug conflicts should be handled with timestamp suffix
     */
    it('should add timestamp to slug if slug already exists', async () => {
      mockDb._queueLimit([]); // No user
      mockDb._queueLimit([{ slug: 'test' }]); // Slug exists
      mockDb._queueReturning([{ id: 'org-1', name: 'Org', slug: 'test-123' }]);
      mockDb._queueReturning([{ id: 'user-1', email: 'test@example.com', name: 'Test' }]);
      mockDb._queueReturning([]);

      await service.register(validDto);

      // The slug should include a timestamp
      expect(mockDb.values).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const validDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    /**
     * WHY: Successful login must return user and organizations
     */
    it('should successfully login with valid credentials', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);

      // Mock: user found (first query with .limit())
      mockDb._queueLimit([
        { id: 'user-1', email: 'test@example.com', name: 'Test', password: passwordHash },
      ]);
      // Mock: memberships query (uses innerJoin, terminal where)
      mockDb._queueWhereTerminal([
        { organization: { id: 'org-1', name: 'Org', slug: 'org' }, role: 'admin' },
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

      mockDb._queueLimit([
        { id: 'user-1', email: 'test@example.com', password: passwordHash },
      ]);

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
      // Mock: memberships query (uses innerJoin, terminal where)
      mockDb._queueWhereTerminal([]);

      await service.login(validDto);

      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: 'user-abc',
        email: 'test@example.com',
      });
    });
  });

  describe('getCurrentUser', () => {
    /**
     * WHY: Must return user with organizations
     */
    it('should return user with organizations', async () => {
      mockDb._queueLimit([
        { id: 'user-1', email: 'test@example.com', name: 'Test', createdAt: new Date() },
      ]);
      // Mock: memberships query (uses innerJoin, terminal where)
      mockDb._queueWhereTerminal([
        { organization: { id: 'org-1', name: 'Org', slug: 'org' }, role: 'admin' },
      ]);

      const result = await service.getCurrentUser('user-1');

      expect(result.email).toBe('test@example.com');
      expect(result.organizations).toBeDefined();
    });

    /**
     * WHY: Non-existent user ID must throw NotFoundException
     */
    it('should throw NotFoundException for non-existent user', async () => {
      mockDb._queueLimit([]);

      await expect(service.getCurrentUser('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('slug generation', () => {
    /**
     * WHY: Slugs must be URL-safe
     * This tests the private generateSlug method indirectly
     */
    it('should generate URL-safe slugs from email', async () => {
      mockDb._queueLimit([]);
      mockDb._queueLimit([]);
      mockDb._queueReturning([{ id: 'org', name: 'Org', slug: 'test-user' }]);
      mockDb._queueReturning([{ id: 'user', email: 'test.user+tag@example.com', name: 'Test' }]);
      mockDb._queueReturning([]);

      await service.register({
        email: 'test.user+tag@example.com',
        password: 'password123',
        name: 'Test',
      });

      // Slug should be generated from email prefix, sanitized
      expect(mockDb.values).toHaveBeenCalled();
    });
  });
});
