import { describe, it, expect } from 'vitest';
import { NotFoundException } from '../exceptions/not-found.exception';
import { ConflictException } from '../exceptions/conflict.exception';
import { InternalServerException } from '../exceptions/internal.exception';
import { AppException } from '../exceptions/base.exception';

/**
 * AGGRESSIVE TEST SUITE: Resource Exceptions
 *
 * Why test resource exceptions thoroughly?
 * 1. NotFoundException: Most common after validation errors - every missing resource throws this
 * 2. ConflictException: Critical for data integrity (duplicate detection)
 * 3. InternalServerException: Security-sensitive - must not leak internal details
 *
 * Testing focus:
 * - Status codes match HTTP semantics
 * - Resource type/ID are properly captured for debugging
 * - Security: internal details are not exposed to clients
 */

describe('NotFoundException', () => {
  /**
   * WHY: HTTP 404 is the universal "not found" status
   * Clients and browsers handle this specially
   */
  it('should have correct code and status', () => {
    const exception = new NotFoundException('User');

    expect(exception.code).toBe('RESOURCE_NOT_FOUND');
    expect(exception.statusCode).toBe(404);
  });

  it('should extend AppException', () => {
    const exception = new NotFoundException('Resource');
    expect(exception instanceof AppException).toBe(true);
  });

  /**
   * WHY: Resource type without ID is valid
   * e.g., "Organization not found" (when looked up by slug)
   */
  describe('without resource ID', () => {
    it('should create message with resource type only', () => {
      const exception = new NotFoundException('User');
      expect(exception.message).toBe('User was not found');
    });

    it('should store resource type', () => {
      const exception = new NotFoundException('Organization');
      expect(exception.resourceType).toBe('Organization');
    });

    it('should not have resource ID', () => {
      const exception = new NotFoundException('Document');
      expect(exception.resourceId).toBeUndefined();
    });
  });

  /**
   * WHY: Resource type with ID is most common case
   * Helps debug exactly which resource was missing
   */
  describe('with resource ID', () => {
    it('should create message with type and ID', () => {
      const exception = new NotFoundException('User', '123');
      expect(exception.message).toBe("User with identifier '123' was not found");
    });

    it('should store both type and ID', () => {
      const exception = new NotFoundException('Organization', 'acme-corp');

      expect(exception.resourceType).toBe('Organization');
      expect(exception.resourceId).toBe('acme-corp');
    });

    /**
     * WHY: UUIDs are common identifiers
     * Should handle them without issues
     */
    it('should handle UUID identifiers', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const exception = new NotFoundException('User', uuid);

      expect(exception.resourceId).toBe(uuid);
      expect(exception.message).toContain(uuid);
    });
  });

  describe('toLogPayload', () => {
    /**
     * WHY: Log aggregation can analyze which resources are frequently not found
     * Helps identify broken links or data inconsistencies
     */
    it('should include resource details in log payload', () => {
      const exception = new NotFoundException('User', '123', { requestPath: '/api/users/123' });
      const payload = exception.toLogPayload();

      expect(payload.resourceType).toBe('User');
      expect(payload.resourceId).toBe('123');
      expect(payload.metadata).toEqual({ requestPath: '/api/users/123' });
    });
  });

  describe('toJSON', () => {
    it('should include resource details in JSON response', () => {
      const exception = new NotFoundException('User', '123');
      const json = exception.toJSON();

      expect(json).toEqual({
        code: 'RESOURCE_NOT_FOUND',
        message: "User with identifier '123' was not found",
        statusCode: 404,
        timestamp: expect.any(String),
        resourceType: 'User',
        resourceId: '123',
      });
    });
  });

  describe('edge cases', () => {
    /**
     * WHY: Special characters in resource IDs
     * URL-encoded or database-escaped IDs should work
     */
    it('should handle special characters in resource ID', () => {
      const exception = new NotFoundException('File', 'path/to/file.txt');
      expect(exception.resourceId).toBe('path/to/file.txt');
    });

    it('should handle empty resource ID', () => {
      const exception = new NotFoundException('User', '');
      // Empty string is falsy, so should use "without ID" format
      expect(exception.message).toBe('User was not found');
    });

    /**
     * WHY: Resource types might be programmatically generated
     * Unusual but valid type names should work
     */
    it('should handle various resource type formats', () => {
      const types = ['user', 'UserProfile', 'ORGANIZATION', 'api-key', 'OAuth2Token'];

      types.forEach((type) => {
        const exception = new NotFoundException(type, '123');
        expect(exception.resourceType).toBe(type);
      });
    });
  });
});

describe('ConflictException', () => {
  /**
   * WHY: HTTP 409 Conflict indicates duplicate/concurrent modification
   * Distinct from 400 (bad format) - the data format is valid but conflicts
   */
  it('should have correct code and status', () => {
    const exception = new ConflictException('email');

    expect(exception.code).toBe('RESOURCE_CONFLICT');
    expect(exception.statusCode).toBe(409);
  });

  it('should extend AppException', () => {
    const exception = new ConflictException('name');
    expect(exception instanceof AppException).toBe(true);
  });

  /**
   * WHY: Conflict without showing the value (privacy consideration)
   * e.g., "Email already exists" without revealing the email
   */
  describe('without conflicting value', () => {
    it('should create generic conflict message', () => {
      const exception = new ConflictException('email');
      expect(exception.message).toBe('A resource with this email already exists');
    });

    it('should store conflicting field', () => {
      const exception = new ConflictException('slug');
      expect(exception.conflictingField).toBe('slug');
    });

    it('should not have conflicting value', () => {
      const exception = new ConflictException('email');
      expect(exception.conflictingValue).toBeUndefined();
    });
  });

  /**
   * WHY: Including the value helps user understand the exact conflict
   * e.g., "Organization with name 'Acme Corp' already exists"
   */
  describe('with conflicting value', () => {
    it('should create message with field and value', () => {
      const exception = new ConflictException('name', 'Acme Corp');
      expect(exception.message).toBe("A resource with name 'Acme Corp' already exists");
    });

    it('should store both field and value', () => {
      const exception = new ConflictException('email', 'user@example.com');

      expect(exception.conflictingField).toBe('email');
      expect(exception.conflictingValue).toBe('user@example.com');
    });
  });

  describe('toLogPayload', () => {
    /**
     * WHY: Track which fields cause the most conflicts
     * Helps identify UX issues (common name collisions, etc.)
     */
    it('should include conflict details in log payload', () => {
      const exception = new ConflictException('email', 'user@example.com', { action: 'register' });
      const payload = exception.toLogPayload();

      expect(payload.conflictingField).toBe('email');
      expect(payload.conflictingValue).toBe('user@example.com');
      expect(payload.metadata).toEqual({ action: 'register' });
    });
  });

  describe('toJSON', () => {
    /**
     * WHY: Frontend can highlight the specific field causing conflict
     * Much better UX than generic "already exists" error
     */
    it('should include conflict details in JSON response', () => {
      const exception = new ConflictException('slug', 'acme-corp');
      const json = exception.toJSON();

      expect(json).toEqual({
        code: 'RESOURCE_CONFLICT',
        message: "A resource with slug 'acme-corp' already exists",
        statusCode: 409,
        timestamp: expect.any(String),
        conflictingField: 'slug',
        conflictingValue: 'acme-corp',
      });
    });
  });

  describe('edge cases', () => {
    /**
     * WHY: Composite keys might cause conflicts
     * Field name could be a path like "userId+organizationId"
     */
    it('should handle composite field names', () => {
      const exception = new ConflictException('userId_organizationId', '123_456');
      expect(exception.conflictingField).toBe('userId_organizationId');
    });

    /**
     * WHY: Values with special characters (emails, names with quotes)
     * Must be preserved correctly
     */
    it('should handle special characters in value', () => {
      const exception = new ConflictException('name', "O'Reilly & Associates");
      expect(exception.conflictingValue).toBe("O'Reilly & Associates");
    });
  });
});

describe('InternalServerException', () => {
  /**
   * WHY: HTTP 500 indicates server-side error
   * Client cannot fix this - they should retry or contact support
   */
  it('should have correct code and status', () => {
    const exception = new InternalServerException('Database connection failed');

    expect(exception.code).toBe('INTERNAL_SERVER_ERROR');
    expect(exception.statusCode).toBe(500);
  });

  it('should extend AppException', () => {
    const exception = new InternalServerException('Error');
    expect(exception instanceof AppException).toBe(true);
  });

  /**
   * WHY: SECURITY - Internal error details must never reach the client
   * "Database connection failed" could reveal infrastructure details
   */
  describe('security - message hiding', () => {
    it('should show generic message to users', () => {
      const exception = new InternalServerException('PostgreSQL connection timeout');
      expect(exception.message).toBe('An unexpected error occurred. Please try again later.');
    });

    it('should NOT expose internal message in user-facing error', () => {
      const exception = new InternalServerException('Redis cluster down');
      expect(exception.message).not.toContain('Redis');
    });

    /**
     * WHY: Stack traces reveal file paths, function names, dependencies
     * This is valuable info for attackers
     */
    it('should NOT include internal details in toJSON', () => {
      const exception = new InternalServerException(
        'SQL Error: relation "users" does not exist',
        new Error('Original DB error')
      );
      const json = exception.toJSON();

      expect(json).not.toHaveProperty('metadata');
      expect(json).not.toHaveProperty('stack');
      expect(JSON.stringify(json)).not.toContain('SQL');
      expect(JSON.stringify(json)).not.toContain('relation');
    });
  });

  /**
   * WHY: Developers need full error details for debugging
   * toLogPayload is only sent to internal logging systems
   */
  describe('logging - full details', () => {
    it('should include internal message in log payload', () => {
      const internalMsg = 'Connection pool exhausted';
      const exception = new InternalServerException(internalMsg);
      const payload = exception.toLogPayload();

      expect(payload.metadata).toHaveProperty('internalMessage', internalMsg);
    });

    it('should include original error details in log payload', () => {
      const originalError = new Error('ECONNREFUSED');
      originalError.stack = 'Error: ECONNREFUSED\n    at Connection.connect (...)';

      const exception = new InternalServerException('Connection failed', originalError);
      const payload = exception.toLogPayload();

      expect(payload.metadata).toHaveProperty('originalError');
      const captured = payload.metadata as Record<string, unknown>;
      const original = captured.originalError as Record<string, unknown>;

      expect(original.name).toBe('Error');
      expect(original.message).toBe('ECONNREFUSED');
      expect(original.stack).toContain('ECONNREFUSED');
    });
  });

  describe('wrapping errors', () => {
    /**
     * WHY: Most internal errors come from catching other exceptions
     * Must preserve the original error for debugging
     */
    it('should wrap existing Error objects', () => {
      const original = new TypeError('Cannot read property x of undefined');
      const exception = new InternalServerException('Unexpected null reference', original);
      const payload = exception.toLogPayload();

      const meta = payload.metadata as Record<string, unknown>;
      const captured = meta.originalError as Record<string, unknown>;

      expect(captured.name).toBe('TypeError');
    });

    it('should handle null original error', () => {
      const exception = new InternalServerException('Something broke', undefined);
      const payload = exception.toLogPayload();
      const meta = payload.metadata as Record<string, unknown>;

      expect(meta.originalError).toBeUndefined();
    });

    /**
     * WHY: Additional context helps debugging
     * Request ID, user ID, etc.
     */
    it('should accept additional metadata', () => {
      const exception = new InternalServerException('DB timeout', new Error('Timeout'), {
        requestId: 'req-123',
        userId: 'user-456',
        operation: 'findUsers',
      });
      const payload = exception.toLogPayload();
      const meta = payload.metadata as Record<string, unknown>;

      expect(meta.requestId).toBe('req-123');
      expect(meta.userId).toBe('user-456');
      expect(meta.operation).toBe('findUsers');
    });
  });

  describe('toJSON security verification', () => {
    /**
     * WHY: Double-check that sensitive data doesn't leak
     * This is a critical security test
     */
    it('should only contain safe fields in JSON output', () => {
      const exception = new InternalServerException(
        'SELECT * FROM secret_table failed',
        new Error('permission denied for table secret_table'),
        { query: 'SELECT * FROM users WHERE password = ...', connectionString: 'postgres://...' }
      );

      const json = exception.toJSON();
      const jsonString = JSON.stringify(json);

      // Should not contain any sensitive info
      expect(jsonString).not.toContain('secret_table');
      expect(jsonString).not.toContain('SELECT');
      expect(jsonString).not.toContain('password');
      expect(jsonString).not.toContain('postgres://');
      expect(jsonString).not.toContain('permission denied');

      // Should only have these safe fields
      expect(Object.keys(json)).toEqual(['code', 'message', 'statusCode', 'timestamp']);
    });
  });
});
