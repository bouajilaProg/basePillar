import { AppException } from './base.exception';

/**
 * Validation Exception
 *
 * Thrown when input data fails validation rules.
 * Designed to work with class-validator in NestJS and Zod schemas.
 *
 * Key features:
 * - `errors` array contains field-level validation messages
 * - Structured format allows frontends to display inline field errors
 * - HTTP 400 (Bad Request) indicates client-side error
 */
export interface ValidationError {
  /** The field/property that failed validation */
  field: string;
  /** Human-readable error message */
  message: string;
  /** The invalid value (sanitized - never include passwords) */
  value?: unknown;
}

export class ValidationException extends AppException {
  readonly code = 'VALIDATION_ERROR';
  readonly statusCode = 400;

  /**
   * Array of field-level validation errors
   * Allows clients to display errors next to the relevant form fields
   */
  readonly errors: ValidationError[];

  constructor(errors: ValidationError[], metadata?: Record<string, unknown>) {
    // Summary message for logging
    const fieldNames = errors.map((e) => e.field).join(', ');
    super(`Validation failed for fields: ${fieldNames}`, metadata);
    this.errors = errors;
  }

  /**
   * Override to include validation errors in log payload
   */
  override toLogPayload(): Record<string, unknown> {
    return {
      ...super.toLogPayload(),
      errors: this.errors,
    };
  }

  /**
   * Override to include validation errors in JSON response
   */
  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      errors: this.errors,
    };
  }
}
