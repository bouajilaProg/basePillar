import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

/**
 * AGGRESSIVE TEST SUITE: AuthController
 *
 * Why test AuthController thoroughly?
 * 1. HTTP layer validation - ensures correct status codes and response format
 * 2. Cookie handling - HttpOnly cookie security is critical
 * 3. Guard integration - protected routes must reject unauthenticated requests
 * 4. DTO validation pipeline - malformed requests must be rejected
 *
 * Testing strategy:
 * - Mock AuthService to isolate controller logic
 * - Verify cookie settings for security
 * - Test response structure for API contract
 */

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: any;
  let mockConfigService: any;
  let mockResponse: Partial<Response>;

  beforeEach(async () => {
    mockAuthService = {
      register: jest.fn(),
      login: jest.fn(),
      getCurrentUser: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn().mockReturnValue('false'),
    };

    mockResponse = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('register', () => {
    const registerDto = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    };

    /**
     * WHY: Successful registration must return user and organization
     */
    it('should return user and organization on successful registration', async () => {
      const serviceResult = {
        user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
        organization: { id: 'org-1', name: 'Test Org', slug: 'test' },
        token: 'jwt-token',
      };
      mockAuthService.register.mockResolvedValue(serviceResult);

      const result = await controller.register(registerDto, mockResponse as Response);

      expect(result).toEqual({
        user: serviceResult.user,
        organization: serviceResult.organization,
      });
    });

    /**
     * WHY: Cookie must be set with security attributes
     * HttpOnly prevents XSS, SameSite prevents CSRF
     */
    it('should set HttpOnly cookie with JWT token', async () => {
      mockAuthService.register.mockResolvedValue({
        user: { id: '1', email: 'test@example.com', name: 'Test' },
        organization: { id: 'org', name: 'Org', slug: 'org' },
        token: 'jwt-token-123',
      });

      await controller.register(registerDto, mockResponse as Response);

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'access_token',
        'jwt-token-123',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'strict',
          path: '/',
        })
      );
    });

    /**
     * WHY: Token should NOT be in response body (only in cookie)
     */
    it('should not include token in response body', async () => {
      mockAuthService.register.mockResolvedValue({
        user: { id: '1', email: 'test@example.com', name: 'Test' },
        organization: { id: 'org', name: 'Org', slug: 'org' },
        token: 'secret-token',
      });

      const result = await controller.register(registerDto, mockResponse as Response);

      expect(result).not.toHaveProperty('token');
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    /**
     * WHY: Successful login must return user and organizations
     */
    it('should return user and organizations on successful login', async () => {
      const serviceResult = {
        user: { id: 'user-1', email: 'test@example.com', name: 'Test' },
        organizations: [{ id: 'org-1', name: 'Org', slug: 'org', role: 'admin' }],
        token: 'jwt-token',
      };
      mockAuthService.login.mockResolvedValue(serviceResult);

      const result = await controller.login(loginDto, mockResponse as Response);

      expect(result).toEqual({
        user: serviceResult.user,
        organizations: serviceResult.organizations,
      });
    });

    /**
     * WHY: Cookie must be set on login
     */
    it('should set auth cookie on login', async () => {
      mockAuthService.login.mockResolvedValue({
        user: { id: '1', email: 'test@example.com', name: 'Test' },
        organizations: [],
        token: 'login-token',
      });

      await controller.login(loginDto, mockResponse as Response);

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'access_token',
        'login-token',
        expect.any(Object)
      );
    });
  });

  describe('logout', () => {
    /**
     * WHY: Logout must clear the auth cookie
     */
    it('should clear the auth cookie', async () => {
      const result = await controller.logout(mockResponse as Response);

      expect(mockResponse.clearCookie).toHaveBeenCalledWith(
        'access_token',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'strict',
          path: '/',
        })
      );
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });

  describe('me', () => {
    /**
     * WHY: /me endpoint must return current user
     */
    it('should return current user profile', async () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test',
        organizations: [{ id: 'org-1', name: 'Org', role: 'admin' }],
      };
      mockAuthService.getCurrentUser.mockResolvedValue(user);

      const mockRequest = { user: { sub: 'user-1' } };
      const result = await controller.me(mockRequest as any);

      expect(result).toEqual(user);
      expect(mockAuthService.getCurrentUser).toHaveBeenCalledWith('user-1');
    });
  });

  describe('cookie security', () => {
    /**
     * WHY: In production, cookies must be secure (HTTPS only)
     */
    it('should set secure cookie when COOKIE_SECURE is true', async () => {
      mockConfigService.get.mockReturnValue('true');

      mockAuthService.register.mockResolvedValue({
        user: { id: '1', email: 'test@example.com', name: 'Test' },
        organization: { id: 'org', name: 'Org', slug: 'org' },
        token: 'token',
      });

      await controller.register(
        { email: 'test@example.com', password: 'password123', name: 'Test' },
        mockResponse as Response
      );

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'access_token',
        'token',
        expect.objectContaining({
          secure: true,
        })
      );
    });

    /**
     * WHY: Cookie maxAge must match JWT expiry
     */
    it('should set appropriate cookie maxAge', async () => {
      mockAuthService.register.mockResolvedValue({
        user: { id: '1', email: 'test@example.com', name: 'Test' },
        organization: { id: 'org', name: 'Org', slug: 'org' },
        token: 'token',
      });

      await controller.register(
        { email: 'test@example.com', password: 'password123', name: 'Test' },
        mockResponse as Response
      );

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'access_token',
        'token',
        expect.objectContaining({
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        })
      );
    });
  });
});
