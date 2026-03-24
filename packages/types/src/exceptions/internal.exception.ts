import { AppException } from './base.exception';

/**
 * Internal Server Exception
 *
 * Thrown when an unexpected error occurs that's not the client's fault.
 * This is a catch-all for unhandled errors that should be investigated.
 *
 * IMPORTANT: Never expose internal error details to clients in production!
 * - The message shown to users is generic
 * - The actual error details go into metadata for logging only
 *
 * When to use:
 * - Database connection failures
 * - External service unavailability
 * - Unexpected null/undefined values
 * - Any unhandled exception caught by global error handler
 */
export class InternalServerException extends AppException {
  readonly code = 'INTERNAL_SERVER_ERROR';
  readonly statusCode = 500;

  constructor(
    /** Internal message for logging (NOT shown to users) */
    internalMessage: string,
    /** Original error if wrapping another exception */
    originalError?: Error,
    metadata?: Record<string, unknown>
  ) {
    // User-facing message is always generic
    super('An unexpected error occurred. Please try again later.', {
      ...metadata,
      internalMessage,
      originalError: originalError
        ? {
            name: originalError.name,
            message: originalError.message,
            stack: originalError.stack,
          }
        : undefined,
    });
  }

  /**
   * For JSON responses, hide internal details
   * The full error is only in toLogPayload for server-side logging
   */
  override toJSON(): Record<string, unknown> {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      // Deliberately omit metadata to hide internal details from clients
    };
  }
}
