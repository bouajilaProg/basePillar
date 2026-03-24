import { describe, it, expect } from 'vitest';
import { ValidationException, type ValidationError } from '../exceptions/validation.exception';
import { AppException } from '../exceptions/base.exception';

/**
 * AGGRESSIVE TEST SUITE: ValidationException
 *
 * Why test validation exceptions so thoroughly?
 * 1. Validation errors are the MOST FREQUENT errors in any application
 * 2. Frontend forms depend on structured error format for inline field errors
 * 3. Class-validator and Zod errors must be transformable to this format
 * 4. Poor validation UX = frustrated users = churn
 *
 * Key behaviors tested:
 * - Field-level error structure for form integration
 * - Summary message for logging/toasts
 * - Serialization format for API responses
 * - Edge cases: empty errors, special characters, long lists
 */

describe('ValidationException', () => {
  /**
   * WHY: HTTP 400 is standard for client input errors
   * Clients use this to know "something YOU sent was wrong"
   */
  it('should have correct code and status for validation failures', () => {
    const exception = new ValidationException([{ field: 'email', message: 'Invalid email' }]);

    expect(exception.code).toBe('VALIDATION_ERROR');
    expect(exception.statusCode).toBe(400);
  });

  it('should extend AppException', () => {
    const exception = new ValidationException([]);
    expect(exception instanceof AppException).toBe(true);
  });

  /**
   * WHY: Single field validation is the most common case
   * Must work correctly for forms with one invalid field
   */
  describe('single field validation', () => {
    it('should store single validation error', () => {
      const errors: ValidationError[] = [
        { field: 'email', message: 'must be a valid email address' },
      ];
      const exception = new ValidationException(errors);

      expect(exception.errors).toHaveLength(1);
      expect(exception.errors[0]).toEqual({
        field: 'email',
        message: 'must be a valid email address',
      });
    });

    it('should generate meaningful summary message', () => {
      const exception = new ValidationException([{ field: 'email', message: 'Invalid' }]);

      expect(exception.message).toBe('Validation failed for fields: email');
    });
  });

  /**
   * WHY: Registration and complex forms have multiple fields
   * All errors should be returned together for good UX
   */
  describe('multiple field validation', () => {
    it('should store multiple validation errors', () => {
      const errors: ValidationError[] = [
        { field: 'email', message: 'Invalid email format' },
        { field: 'password', message: 'Must be at least 8 characters' },
        { field: 'name', message: 'Required' },
      ];
      const exception = new ValidationException(errors);

      expect(exception.errors).toHaveLength(3);
    });

    it('should list all failed fields in summary message', () => {
      const errors: ValidationError[] = [
        { field: 'email', message: 'Invalid' },
        { field: 'password', message: 'Too short' },
        { field: 'confirmPassword', message: 'Must match' },
      ];
      const exception = new ValidationException(errors);

      expect(exception.message).toBe('Validation failed for fields: email, password, confirmPassword');
    });
  });

  /**
   * WHY: The invalid value helps with debugging
   * But must NEVER include password values!
   */
  describe('error with value', () => {
    it('should include the invalid value when provided', () => {
      const errors: ValidationError[] = [
        { field: 'age', message: 'Must be a positive number', value: -5 },
      ];
      const exception = new ValidationException(errors);

      expect(exception.errors[0].value).toBe(-5);
    });

    it('should handle string values', () => {
      const errors: ValidationError[] = [
        { field: 'email', message: 'Invalid format', value: 'not-an-email' },
      ];
      const exception = new ValidationException(errors);

      expect(exception.errors[0].value).toBe('not-an-email');
    });

    /**
     * WHY: Security - password values should NEVER be logged
     * This test documents the risk (actual filtering is app responsibility)
     */
    it('should handle various value types (WARNING: never include passwords!)', () => {
      const errors: ValidationError[] = [
        { field: 'count', message: 'Too high', value: 1000000 },
        { field: 'active', message: 'Must be true', value: false },
        { field: 'tags', message: 'Invalid tag', value: ['tag1', 'invalid!'] },
      ];
      const exception = new ValidationException(errors);

      expect(exception.errors[0].value).toBe(1000000);
      expect(exception.errors[1].value).toBe(false);
      expect(exception.errors[2].value).toEqual(['tag1', 'invalid!']);
    });
  });

  describe('toLogPayload', () => {
    /**
     * WHY: Log aggregation needs structured error details
     * Field-level errors help identify common validation issues
     */
    it('should include errors array in log payload', () => {
      const errors: ValidationError[] = [
        { field: 'email', message: 'Invalid' },
        { field: 'password', message: 'Too short' },
      ];
      const exception = new ValidationException(errors);
      const payload = exception.toLogPayload();

      expect(payload.errors).toEqual(errors);
    });

    it('should include all base exception fields', () => {
      const exception = new ValidationException([{ field: 'test', message: 'error' }]);
      const payload = exception.toLogPayload();

      expect(payload).toHaveProperty('name');
      expect(payload).toHaveProperty('code');
      expect(payload).toHaveProperty('message');
      expect(payload).toHaveProperty('statusCode');
      expect(payload).toHaveProperty('timestamp');
      expect(payload).toHaveProperty('stack');
    });
  });

  describe('toJSON', () => {
    /**
     * WHY: API clients need errors array to show inline field errors
     * This is the contract between backend and frontend
     */
    it('should include errors array in JSON response', () => {
      const errors: ValidationError[] = [
        { field: 'email', message: 'Invalid email' },
      ];
      const exception = new ValidationException(errors);
      const json = exception.toJSON();

      expect(json.errors).toEqual(errors);
    });

    it('should produce valid JSON for API response', () => {
      const errors: ValidationError[] = [
        { field: 'name', message: 'Required', value: '' },
        { field: 'email', message: 'Invalid format', value: 'bad-email' },
      ];
      const exception = new ValidationException(errors, { formId: 'registration' });
      const json = exception.toJSON();

      expect(json).toEqual({
        code: 'VALIDATION_ERROR',
        message: 'Validation failed for fields: name, email',
        statusCode: 400,
        timestamp: expect.any(String),
        metadata: { formId: 'registration' },
        errors: errors,
      });
    });

    /**
     * WHY: Stack trace contains internal code paths
     * Should not be exposed to API consumers
     */
    it('should not include stack trace (security)', () => {
      const exception = new ValidationException([{ field: 'test', message: 'error' }]);
      const json = exception.toJSON();

      expect(json).not.toHaveProperty('stack');
    });
  });

  describe('edge cases', () => {
    /**
     * WHY: Empty errors array is technically valid
     * Should not crash, but log a warning in real app
     */
    it('should handle empty errors array', () => {
      const exception = new ValidationException([]);

      expect(exception.errors).toEqual([]);
      expect(exception.message).toBe('Validation failed for fields: ');
    });

    /**
     * WHY: Field names can be paths like "user.address.city"
     * Nested object validation is common with DTOs
     */
    it('should handle nested field names', () => {
      const errors: ValidationError[] = [
        { field: 'address.street', message: 'Required' },
        { field: 'address.city', message: 'Required' },
        { field: 'contacts[0].email', message: 'Invalid' },
      ];
      const exception = new ValidationException(errors);

      expect(exception.errors).toHaveLength(3);
      expect(exception.message).toContain('address.street');
      expect(exception.message).toContain('contacts[0].email');
    });

    /**
     * WHY: Unicode field names (i18n applications)
     * and special characters must be preserved
     */
    it('should handle unicode in field names and messages', () => {
      const errors: ValidationError[] = [
        { field: '名前', message: '必須です' },
        { field: 'email', message: 'debe ser válido 📧' },
      ];
      const exception = new ValidationException(errors);
      const json = exception.toJSON();

      expect(json.errors).toEqual(errors);
    });

    /**
     * WHY: Forms with many fields could have many errors
     * Performance shouldn't degrade significantly
     */
    it('should handle many validation errors', () => {
      const errors: ValidationError[] = Array.from({ length: 100 }, (_, i) => ({
        field: `field${i}`,
        message: `Error for field ${i}`,
        value: `value${i}`,
      }));
      const exception = new ValidationException(errors);

      expect(exception.errors).toHaveLength(100);
      expect(() => JSON.stringify(exception.toJSON())).not.toThrow();
    });

    /**
     * WHY: Same field might have multiple validation rules
     * All failures should be reported
     */
    it('should allow multiple errors for the same field', () => {
      const errors: ValidationError[] = [
        { field: 'password', message: 'Must be at least 8 characters' },
        { field: 'password', message: 'Must contain a number' },
        { field: 'password', message: 'Must contain a special character' },
      ];
      const exception = new ValidationException(errors);

      expect(exception.errors).toHaveLength(3);
      expect(exception.message).toBe('Validation failed for fields: password, password, password');
    });

    /**
     * WHY: Null and undefined values in the invalid value field
     * Should be handled correctly
     */
    it('should handle null and undefined values', () => {
      const errors: ValidationError[] = [
        { field: 'required', message: 'Required', value: null },
        { field: 'optional', message: 'Invalid', value: undefined },
      ];
      const exception = new ValidationException(errors);
      const json = exception.toJSON();

      expect(json.errors).toEqual([
        { field: 'required', message: 'Required', value: null },
        { field: 'optional', message: 'Invalid', value: undefined },
      ]);
    });
  });
});
