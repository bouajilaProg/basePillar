import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AppException } from '../exceptions/base.exception';

/**
 * AGGRESSIVE TEST SUITE: AppException Base Class
 *
 * Why test the base exception class so thoroughly?
 * 1. It's the foundation - every exception in the system extends this class
 * 2. toLogPayload() is used for centralized logging - bugs here affect ALL error tracking
 * 3. toJSON() is serialized in EVERY API error response - consistency is critical
 * 4. Timestamp formatting affects log correlation across microservices
 * 5. Stack trace capture is V8-specific - must verify it works correctly
 *
 * Testing philosophy:
 * - Test behavior, not implementation
 * - Cover edge cases that could cause production incidents
 * - Verify contract that subclasses depend on
 */

// Concrete implementation for testing the abstract class
class TestException extends AppException {
  readonly code = 'TEST_ERROR';
  readonly statusCode = 418; // I'm a teapot - easy to identify in tests

  constructor(message: string, metadata?: Record<string, unknown>) {
    super(message, metadata);
  }
}

describe('AppException', () => {
  /**
   * WHY: The exception name is used in error tracking tools (Sentry, DataDog)
   * If name is wrong, errors won't be grouped correctly
   */
  describe('constructor', () => {
    it('should set the exception name to the class name', () => {
      const exception = new TestException('test message');
      expect(exception.name).toBe('TestException');
    });

    it('should set the message correctly', () => {
      const exception = new TestException('Something went wrong');
      expect(exception.message).toBe('Something went wrong');
    });

    /**
     * WHY: Timestamps must be ISO 8601 for log aggregation tools
     * Non-standard formats break date parsing in Elasticsearch, Loki, etc.
     */
    it('should generate a valid ISO 8601 timestamp', () => {
      const before = new Date().toISOString();
      const exception = new TestException('test');
      const after = new Date().toISOString();

      expect(exception.timestamp).toBeDefined();
      // Verify it's a valid ISO date string
      expect(() => new Date(exception.timestamp)).not.toThrow();
      // Verify timestamp is within expected range
      expect(exception.timestamp >= before).toBe(true);
      expect(exception.timestamp <= after).toBe(true);
    });

    /**
     * WHY: Metadata is optional - must not break if undefined
     * Common bug: code assumes metadata exists and crashes on undefined.field
     */
    it('should handle undefined metadata gracefully', () => {
      const exception = new TestException('test');
      expect(exception.metadata).toBeUndefined();
    });

    it('should store metadata when provided', () => {
      const metadata = { userId: '123', action: 'login' };
      const exception = new TestException('test', metadata);
      expect(exception.metadata).toEqual(metadata);
    });

    /**
     * WHY: Deep objects in metadata are common (request body, user object)
     * Must preserve structure for debugging
     */
    it('should preserve nested metadata structure', () => {
      const metadata = {
        user: { id: '123', roles: ['admin', 'user'] },
        request: { path: '/api/users', method: 'POST' },
      };
      const exception = new TestException('test', metadata);
      expect(exception.metadata).toEqual(metadata);
    });

    /**
     * WHY: Stack traces are essential for debugging
     * In V8 engines (Node), Error.captureStackTrace provides clean traces
     */
    it('should capture stack trace', () => {
      const exception = new TestException('test');
      expect(exception.stack).toBeDefined();
      expect(exception.stack).toContain('TestException');
    });
  });

  describe('toLogPayload', () => {
    /**
     * WHY: Log aggregation systems parse these fields
     * Missing fields = broken dashboards and alerts
     */
    it('should include all required fields for logging', () => {
      const exception = new TestException('test error');
      const payload = exception.toLogPayload();

      expect(payload).toHaveProperty('name', 'TestException');
      expect(payload).toHaveProperty('code', 'TEST_ERROR');
      expect(payload).toHaveProperty('message', 'test error');
      expect(payload).toHaveProperty('statusCode', 418);
      expect(payload).toHaveProperty('timestamp');
      expect(payload).toHaveProperty('stack');
    });

    it('should include metadata in log payload', () => {
      const metadata = { requestId: 'abc-123' };
      const exception = new TestException('test', metadata);
      const payload = exception.toLogPayload();

      expect(payload.metadata).toEqual(metadata);
    });

    /**
     * WHY: Stack traces are crucial for debugging production issues
     * Without stack trace, finding the error source is nearly impossible
     */
    it('should include stack trace for debugging', () => {
      const exception = new TestException('test');
      const payload = exception.toLogPayload();

      expect(payload.stack).toBeDefined();
      expect(typeof payload.stack).toBe('string');
    });

    /**
     * WHY: Log payloads must be serializable to JSON
     * Circular references or BigInt values would crash logging
     */
    it('should produce a JSON-serializable payload', () => {
      const exception = new TestException('test', { nested: { deep: { value: 123 } } });
      const payload = exception.toLogPayload();

      expect(() => JSON.stringify(payload)).not.toThrow();
    });
  });

  describe('toJSON', () => {
    /**
     * WHY: API responses are sent to clients via JSON
     * This is the public-facing error format
     */
    it('should include essential fields for API responses', () => {
      const exception = new TestException('test error');
      const json = exception.toJSON();

      expect(json).toHaveProperty('code', 'TEST_ERROR');
      expect(json).toHaveProperty('message', 'test error');
      expect(json).toHaveProperty('statusCode', 418);
      expect(json).toHaveProperty('timestamp');
    });

    /**
     * WHY: Stack traces contain file paths and internal code structure
     * Exposing them to clients is a security risk (information disclosure)
     */
    it('should NOT include stack trace (security)', () => {
      const exception = new TestException('test');
      const json = exception.toJSON();

      expect(json).not.toHaveProperty('stack');
    });

    /**
     * WHY: Metadata may be included if it's user-relevant
     * But the base implementation includes it - subclasses can override
     */
    it('should include metadata when present', () => {
      const metadata = { field: 'email' };
      const exception = new TestException('test', metadata);
      const json = exception.toJSON();

      expect(json.metadata).toEqual(metadata);
    });

    /**
     * WHY: No metadata = no metadata field (not metadata: undefined)
     * Clean JSON responses are easier to work with
     */
    it('should not include metadata key when metadata is undefined', () => {
      const exception = new TestException('test');
      const json = exception.toJSON();

      expect(Object.keys(json)).not.toContain('metadata');
    });
  });

  describe('inheritance', () => {
    /**
     * WHY: instanceof checks are used in exception filters
     * If inheritance chain is broken, errors won't be caught correctly
     */
    it('should be instanceof Error', () => {
      const exception = new TestException('test');
      expect(exception instanceof Error).toBe(true);
    });

    it('should be instanceof AppException', () => {
      const exception = new TestException('test');
      expect(exception instanceof AppException).toBe(true);
    });

    /**
     * WHY: throw/catch must work with our custom exceptions
     * This verifies the exception is throwable and catchable
     */
    it('should be throwable and catchable', () => {
      const throwAndCatch = () => {
        try {
          throw new TestException('test');
        } catch (e) {
          return e;
        }
      };

      const caught = throwAndCatch();
      expect(caught).toBeInstanceOf(TestException);
      expect((caught as TestException).message).toBe('test');
    });
  });

  describe('edge cases', () => {
    /**
     * WHY: Empty strings are valid messages (e.g., default constructors)
     * Should not crash or behave unexpectedly
     */
    it('should handle empty message', () => {
      const exception = new TestException('');
      expect(exception.message).toBe('');
      expect(exception.toJSON().message).toBe('');
    });

    /**
     * WHY: Unicode in error messages (international users, emojis in input)
     * Serialization must preserve unicode correctly
     */
    it('should handle unicode in message', () => {
      const message = '用户不存在 🚫';
      const exception = new TestException(message);

      expect(exception.message).toBe(message);
      expect(exception.toJSON().message).toBe(message);
      expect(JSON.parse(JSON.stringify(exception.toJSON())).message).toBe(message);
    });

    /**
     * WHY: Very long messages could cause issues with log storage
     * Verify they're preserved (truncation is logger's responsibility)
     */
    it('should handle very long messages', () => {
      const longMessage = 'x'.repeat(10000);
      const exception = new TestException(longMessage);

      expect(exception.message.length).toBe(10000);
    });

    /**
     * WHY: Special characters in metadata (SQL injection attempts, XSS)
     * Must be preserved as-is for logging/debugging
     */
    it('should preserve special characters in metadata', () => {
      const metadata = {
        input: '<script>alert("xss")</script>',
        sql: "'; DROP TABLE users; --",
      };
      const exception = new TestException('test', metadata);

      expect(exception.metadata).toEqual(metadata);
    });

    /**
     * WHY: Empty object metadata is valid but different from undefined
     * Should include metadata field with empty object
     */
    it('should handle empty object metadata', () => {
      const exception = new TestException('test', {});
      expect(exception.metadata).toEqual({});
      // Empty object is truthy, so metadata should be in JSON
      expect(exception.toJSON().metadata).toEqual({});
    });

    /**
     * WHY: Null values in metadata object
     * JSON.stringify handles null, but code might not expect it
     */
    it('should handle null values in metadata', () => {
      const metadata = { userId: null, action: 'test' };
      const exception = new TestException('test', metadata as Record<string, unknown>);

      expect(exception.metadata).toEqual(metadata);
      expect(() => JSON.stringify(exception.toJSON())).not.toThrow();
    });

    /**
     * WHY: Arrays in metadata (e.g., list of validation errors)
     * Must preserve array structure
     */
    it('should handle arrays in metadata', () => {
      const metadata = { errors: ['error1', 'error2'], ids: [1, 2, 3] };
      const exception = new TestException('test', metadata);

      expect(exception.metadata).toEqual(metadata);
      expect(Array.isArray((exception.metadata as Record<string, unknown>).errors)).toBe(true);
    });
  });
});
