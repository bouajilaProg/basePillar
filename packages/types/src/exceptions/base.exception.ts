/**
 * Base Application Exception
 *
 * This is the foundation of our exception hierarchy. All custom exceptions
 * extend this class to ensure consistent error handling across the stack.
 *
 * Key design decisions:
 * 1. Abstract class forces subclasses to define `code` and `statusCode`
 * 2. `toLogPayload()` integrates with @repo/logger for structured logging
 * 3. `toJSON()` provides a safe, serializable representation for API responses
 * 4. Timestamp is captured at construction time for accurate debugging
 *
 * Why exceptions over Result<T, E>?
 * - NestJS has built-in exception filters that work seamlessly with thrown errors
 * - Stack traces are automatically captured for debugging
 * - TypeScript/JavaScript developers are more familiar with try/catch patterns
 * - Integration with monitoring tools (Sentry, DataDog) is more straightforward
 */
export abstract class AppException extends Error {
  /**
   * Machine-readable error code for programmatic handling
   * Example: 'AUTH_INVALID_CREDENTIALS', 'RESOURCE_NOT_FOUND'
   */
  abstract readonly code: string;

  /**
   * HTTP status code to return in API responses
   * Maps directly to standard HTTP semantics
   */
  abstract readonly statusCode: number;

  /**
   * ISO 8601 timestamp of when the exception was created
   * Useful for correlating errors across distributed systems
   */
  readonly timestamp: string;

  /**
   * Additional context about the error
   * Can include user IDs, request IDs, affected resources, etc.
   * WARNING: Never include sensitive data (passwords, tokens) in metadata
   */
  readonly metadata?: Record<string, unknown>;

  constructor(message: string, metadata?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date().toISOString();
    this.metadata = metadata;

    // Maintains proper stack trace in V8 engines (Node, Chrome)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Converts exception to a structured payload for the logging service
   * This integrates with @repo/logger's exception logging
   */
  toLogPayload(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      metadata: this.metadata,
      stack: this.stack,
    };
  }

  /**
   * Safe JSON representation for API responses
   * Excludes stack trace to avoid leaking implementation details
   */
  toJSON(): Record<string, unknown> {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      ...(this.metadata && { metadata: this.metadata }),
    };
  }
}
