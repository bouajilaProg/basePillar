import { describe, it, expect } from 'vitest';
import {
  InvalidCredentialsException,
  UnauthorizedException,
  ForbiddenException,
  TokenExpiredException,
} from '../exceptions/auth.exception';
import { AppException } from '../exceptions/base.exception';

/**
 * AGGRESSIVE TEST SUITE: Authentication Exceptions
 *
 * Why test auth exceptions so thoroughly?
 * 1. Security-critical code - wrong status codes could expose vulnerabilities
 * 2. Client apps depend on specific error codes for UX flows (redirect to login, show expired message)
 * 3. 401 vs 403 distinction is often misunderstood - tests document correct behavior
 * 4. These exceptions are thrown on EVERY unauthenticated request - high frequency
 *
 * Security considerations tested:
 * - Error messages don't leak sensitive information (e.g., "email exists")
 * - Consistent status codes prevent authentication bypass attacks
 * - Proper error codes enable secure client-side handling
 */

describe('InvalidCredentialsException', () => {
  /**
   * WHY: This exception is thrown during login
   * Wrong error code could break frontend auth flow
   */
  it('should have correct code and status for authentication failures', () => {
    const exception = new InvalidCredentialsException();

    expect(exception.code).toBe('AUTH_INVALID_CREDENTIALS');
    expect(exception.statusCode).toBe(401);
  });

  /**
   * WHY: SECURITY - Generic message prevents email enumeration attacks
   * An attacker shouldn't be able to determine if an email exists in the system
   * by analyzing error messages
   */
  it('should have a generic message that does not reveal if email exists', () => {
    const exception = new InvalidCredentialsException();

    expect(exception.message).toBe('Invalid email or password');
    // Should NOT contain phrases like "email not found" or "wrong password"
    expect(exception.message.toLowerCase()).not.toContain('not found');
    expect(exception.message.toLowerCase()).not.toContain('wrong password');
    expect(exception.message.toLowerCase()).not.toContain("doesn't exist");
  });

  it('should extend AppException', () => {
    const exception = new InvalidCredentialsException();
    expect(exception instanceof AppException).toBe(true);
  });

  /**
   * WHY: Metadata might include login attempt tracking info
   * Must work correctly for rate limiting and security audit logs
   */
  it('should accept and store metadata', () => {
    const metadata = {
      email: 'user@example.com', // Note: storing email in metadata is OK for logging
      ipAddress: '192.168.1.1',
      attemptCount: 3,
    };
    const exception = new InvalidCredentialsException(metadata);

    expect(exception.metadata).toEqual(metadata);
  });

  /**
   * WHY: Frontend code checks error codes to show appropriate UI
   * Consistent JSON structure is critical for API consumers
   */
  it('should produce consistent JSON for API responses', () => {
    const exception = new InvalidCredentialsException({ attemptCount: 2 });
    const json = exception.toJSON();

    expect(json).toEqual({
      code: 'AUTH_INVALID_CREDENTIALS',
      message: 'Invalid email or password',
      statusCode: 401,
      timestamp: expect.any(String),
      metadata: { attemptCount: 2 },
    });
  });
});

describe('UnauthorizedException', () => {
  /**
   * WHY: This is the generic "not logged in" exception
   * Status 401 triggers auth redirects in many frontend frameworks
   */
  it('should have correct code and status for unauthenticated access', () => {
    const exception = new UnauthorizedException();

    expect(exception.code).toBe('AUTH_UNAUTHORIZED');
    expect(exception.statusCode).toBe(401);
  });

  it('should have default message', () => {
    const exception = new UnauthorizedException();
    expect(exception.message).toBe('Authentication required');
  });

  /**
   * WHY: Sometimes we need context-specific unauthorized messages
   * e.g., "Please log in to view your profile"
   */
  it('should allow custom message', () => {
    const exception = new UnauthorizedException('Session expired');
    expect(exception.message).toBe('Session expired');
  });

  it('should accept metadata as second parameter', () => {
    const exception = new UnauthorizedException('Custom message', {
      requestPath: '/api/users/me',
    });

    expect(exception.message).toBe('Custom message');
    expect(exception.metadata).toEqual({ requestPath: '/api/users/me' });
  });

  it('should extend AppException', () => {
    const exception = new UnauthorizedException();
    expect(exception instanceof AppException).toBe(true);
  });
});

describe('ForbiddenException', () => {
  /**
   * WHY: 403 Forbidden is semantically different from 401 Unauthorized
   * - 401: "Who are you?" (not authenticated)
   * - 403: "I know who you are, but you can't do this" (not authorized)
   *
   * Getting this wrong can confuse users and create security issues
   */
  it('should have correct code and status for authorization failures', () => {
    const exception = new ForbiddenException();

    expect(exception.code).toBe('AUTH_FORBIDDEN');
    expect(exception.statusCode).toBe(403);
  });

  it('should have default message explaining the denial', () => {
    const exception = new ForbiddenException();
    expect(exception.message).toBe('You do not have permission to perform this action');
  });

  /**
   * WHY: Role-based access control often needs specific messages
   * e.g., "Only admins can delete users"
   */
  it('should allow custom message for specific permission denials', () => {
    const exception = new ForbiddenException('Only organization admins can invite users');
    expect(exception.message).toBe('Only organization admins can invite users');
  });

  /**
   * WHY: Metadata is useful for logging access control decisions
   * Helps with security audits and debugging RBAC issues
   */
  it('should include metadata about the denied action', () => {
    const exception = new ForbiddenException('Cannot delete', {
      userId: '123',
      action: 'DELETE',
      resource: 'organization',
      resourceId: '456',
      requiredRole: 'admin',
      actualRole: 'member',
    });

    expect(exception.metadata).toEqual({
      userId: '123',
      action: 'DELETE',
      resource: 'organization',
      resourceId: '456',
      requiredRole: 'admin',
      actualRole: 'member',
    });
  });

  it('should extend AppException', () => {
    const exception = new ForbiddenException();
    expect(exception instanceof AppException).toBe(true);
  });
});

describe('TokenExpiredException', () => {
  /**
   * WHY: Token expiration is separate from invalid credentials
   * Clients can handle differently (prompt re-login vs show "session expired")
   */
  it('should have correct code and status for expired tokens', () => {
    const exception = new TokenExpiredException();

    expect(exception.code).toBe('AUTH_TOKEN_EXPIRED');
    expect(exception.statusCode).toBe(401);
  });

  /**
   * WHY: User-friendly message that guides them to re-login
   * Not technical jargon like "JWT expired" or "token invalid"
   */
  it('should have user-friendly expiration message', () => {
    const exception = new TokenExpiredException();
    expect(exception.message).toBe('Your session has expired, please log in again');
  });

  /**
   * WHY: Metadata can include token timing info for debugging
   * Useful for identifying clock skew issues
   */
  it('should accept metadata with token timing information', () => {
    const exception = new TokenExpiredException({
      issuedAt: '2024-01-01T00:00:00Z',
      expiredAt: '2024-01-08T00:00:00Z',
      currentTime: '2024-01-09T00:00:00Z',
    });

    expect(exception.metadata).toHaveProperty('issuedAt');
    expect(exception.metadata).toHaveProperty('expiredAt');
    expect(exception.metadata).toHaveProperty('currentTime');
  });

  it('should extend AppException', () => {
    const exception = new TokenExpiredException();
    expect(exception instanceof AppException).toBe(true);
  });
});

/**
 * Cross-cutting concerns for all auth exceptions
 * These tests verify consistency across the exception family
 */
describe('Auth Exceptions - Cross-cutting', () => {
  /**
   * WHY: Frontend code often uses switch/case on error codes
   * All auth codes should start with 'AUTH_' prefix for easy identification
   */
  it('should all have AUTH_ prefixed codes', () => {
    const exceptions = [
      new InvalidCredentialsException(),
      new UnauthorizedException(),
      new ForbiddenException(),
      new TokenExpiredException(),
    ];

    exceptions.forEach((ex) => {
      expect(ex.code.startsWith('AUTH_')).toBe(true);
    });
  });

  /**
   * WHY: All should be instances of AppException for filter catching
   * NestJS exception filters use instanceof checks
   */
  it('should all extend AppException for consistent handling', () => {
    const exceptions = [
      new InvalidCredentialsException(),
      new UnauthorizedException(),
      new ForbiddenException(),
      new TokenExpiredException(),
    ];

    exceptions.forEach((ex) => {
      expect(ex instanceof AppException).toBe(true);
      expect(ex instanceof Error).toBe(true);
    });
  });

  /**
   * WHY: Timestamps are needed for log correlation
   * All exceptions must have valid timestamps
   */
  it('should all have valid timestamps', () => {
    const exceptions = [
      new InvalidCredentialsException(),
      new UnauthorizedException(),
      new ForbiddenException(),
      new TokenExpiredException(),
    ];

    exceptions.forEach((ex) => {
      expect(ex.timestamp).toBeDefined();
      expect(() => new Date(ex.timestamp)).not.toThrow();
    });
  });

  /**
   * WHY: Status codes affect HTTP response handling
   * Verifying expected status codes for each exception type
   */
  it('should have appropriate HTTP status codes', () => {
    expect(new InvalidCredentialsException().statusCode).toBe(401); // Wrong credentials
    expect(new UnauthorizedException().statusCode).toBe(401); // Not authenticated
    expect(new ForbiddenException().statusCode).toBe(403); // Not authorized
    expect(new TokenExpiredException().statusCode).toBe(401); // Token issue = re-auth needed
  });
});
