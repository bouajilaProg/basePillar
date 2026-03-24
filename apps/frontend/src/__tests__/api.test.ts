import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api, ApiError } from '../lib/api';

/**
 * AGGRESSIVE TEST SUITE: API Client
 *
 * Why test the API client thoroughly?
 * 1. All server communication goes through here - bugs affect entire app
 * 2. Error handling must be consistent for good UX
 * 3. Credentials must be included for cookie auth
 * 4. Response parsing must handle edge cases
 *
 * Testing strategy:
 * - Mock fetch globally
 * - Test success and error paths
 * - Verify request configuration (credentials, headers)
 */

describe('API Client', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('register', () => {
    /**
     * WHY: Registration must send correct payload
     */
    it('should send registration data to correct endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            user: { id: '1', email: 'test@example.com', name: 'Test' },
            organization: { id: 'org1', name: 'Org', slug: 'org' },
          }),
      });

      await api.register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/auth/register',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    /**
     * WHY: Successful registration must return user and organization
     */
    it('should return user and organization on success', async () => {
      const responseData = {
        user: { id: '1', email: 'test@example.com', name: 'Test' },
        organization: { id: 'org1', name: 'My Org', slug: 'my-org' },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(responseData),
      });

      const result = await api.register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test',
      });

      expect(result).toEqual(responseData);
    });

    /**
     * WHY: Conflict (duplicate email) must throw ApiError
     */
    it('should throw ApiError on conflict', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: () =>
          Promise.resolve({
            code: 'RESOURCE_CONFLICT',
            message: 'Email already exists',
          }),
      });

      await expect(
        api.register({
          email: 'existing@example.com',
          password: 'password123',
          name: 'Test',
        })
      ).rejects.toThrow(ApiError);
    });
  });

  describe('login', () => {
    /**
     * WHY: Login must send credentials
     */
    it('should send login credentials', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            user: { id: '1', email: 'test@example.com', name: 'Test' },
            organizations: [],
          }),
      });

      await api.login({ email: 'test@example.com', password: 'password123' });

      const calledBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(calledBody).toEqual({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    /**
     * WHY: Invalid credentials must throw with correct code
     */
    it('should throw ApiError for invalid credentials', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () =>
          Promise.resolve({
            code: 'AUTH_INVALID_CREDENTIALS',
            message: 'Invalid email or password',
          }),
      });

      try {
        await api.login({ email: 'test@example.com', password: 'wrong' });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).code).toBe('AUTH_INVALID_CREDENTIALS');
        expect((error as ApiError).statusCode).toBe(401);
      }
    });
  });

  describe('logout', () => {
    /**
     * WHY: Logout must be a POST request
     */
    it('should send POST request to logout endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: 'Logged out successfully' }),
      });

      await api.logout();

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/auth/logout',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('me', () => {
    /**
     * WHY: /me must include credentials for cookie auth
     */
    it('should include credentials', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: '1',
            email: 'test@example.com',
            name: 'Test',
            organizations: [],
          }),
      });

      await api.me();

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/auth/me',
        expect.objectContaining({
          credentials: 'include',
        })
      );
    });

    /**
     * WHY: 401 on /me means user is not authenticated
     */
    it('should throw ApiError when not authenticated', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () =>
          Promise.resolve({
            code: 'AUTH_UNAUTHORIZED',
            message: 'Authentication required',
          }),
      });

      await expect(api.me()).rejects.toThrow(ApiError);
    });
  });

  describe('error handling', () => {
    /**
     * WHY: Server might return non-JSON response
     */
    it('should handle non-JSON error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('Not JSON')),
      });

      try {
        await api.login({ email: 'test@example.com', password: 'test' });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).message).toBe('An error occurred');
      }
    });

    /**
     * WHY: ApiError should have all necessary properties
     */
    it('should create ApiError with correct properties', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: () =>
          Promise.resolve({
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
          }),
      });

      try {
        await api.login({ email: 'invalid', password: 'test' });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        const apiError = error as ApiError;
        expect(apiError.code).toBe('VALIDATION_ERROR');
        expect(apiError.message).toBe('Invalid input');
        expect(apiError.statusCode).toBe(422);
        expect(apiError.name).toBe('ApiError');
      }
    });
  });

  describe('request configuration', () => {
    /**
     * WHY: Content-Type must be JSON for all requests
     */
    it('should set Content-Type header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await api.logout();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    /**
     * WHY: credentials: 'include' is required for cookie auth
     */
    it('should always include credentials', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await api.me();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          credentials: 'include',
        })
      );
    });
  });
});
