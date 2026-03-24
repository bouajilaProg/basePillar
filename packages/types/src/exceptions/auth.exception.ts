import { AppException } from './base.exception';

/**
 * Authentication Exceptions
 *
 * These exceptions handle authentication-related failures.
 * Each has a specific code to help clients distinguish between error types
 * and display appropriate messages to users.
 */

/**
 * Thrown when user provides wrong email/password combination
 *
 * Why separate from UnauthorizedException?
 * - InvalidCredentials is specifically for login failures
 * - UnauthorizedException is for accessing protected resources without auth
 * - This distinction helps frontends show appropriate error messages
 */
export class InvalidCredentialsException extends AppException {
  readonly code = 'AUTH_INVALID_CREDENTIALS';
  readonly statusCode = 401;

  constructor(metadata?: Record<string, unknown>) {
    // Generic message to avoid leaking whether email exists
    super('Invalid email or password', metadata);
  }
}

/**
 * Thrown when accessing a protected resource without authentication
 *
 * Use cases:
 * - Missing JWT cookie
 * - Expired JWT token
 * - Malformed JWT token
 */
export class UnauthorizedException extends AppException {
  readonly code = 'AUTH_UNAUTHORIZED';
  readonly statusCode = 401;

  constructor(message = 'Authentication required', metadata?: Record<string, unknown>) {
    super(message, metadata);
  }
}

/**
 * Thrown when authenticated user lacks permission for an action
 *
 * Key difference from UnauthorizedException:
 * - 401 = "Who are you?" (not authenticated)
 * - 403 = "I know who you are, but you can't do this" (not authorized)
 */
export class ForbiddenException extends AppException {
  readonly code = 'AUTH_FORBIDDEN';
  readonly statusCode = 403;

  constructor(
    message = 'You do not have permission to perform this action',
    metadata?: Record<string, unknown>
  ) {
    super(message, metadata);
  }
}

/**
 * Thrown when JWT token has expired
 *
 * Separate from UnauthorizedException to allow clients to:
 * - Attempt token refresh (if using refresh tokens)
 * - Redirect to login with "session expired" message
 */
export class TokenExpiredException extends AppException {
  readonly code = 'AUTH_TOKEN_EXPIRED';
  readonly statusCode = 401;

  constructor(metadata?: Record<string, unknown>) {
    super('Your session has expired, please log in again', metadata);
  }
}
