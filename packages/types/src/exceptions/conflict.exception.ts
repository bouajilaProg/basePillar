import { AppException } from './base.exception';

/**
 * Conflict Exception
 *
 * Thrown when an operation would create a duplicate or conflict with existing data.
 * HTTP 409 (Conflict) is the appropriate status for these scenarios.
 *
 * Common use cases:
 * - Registering with an email that already exists
 * - Creating an organization with a duplicate name/slug
 * - Concurrent modification conflicts (optimistic locking)
 *
 * Why include conflictingField?
 * - Allows frontends to highlight the specific field causing the conflict
 * - More helpful than generic "already exists" messages
 */
export class ConflictException extends AppException {
  readonly code = 'RESOURCE_CONFLICT';
  readonly statusCode = 409;

  /** The field/property that caused the conflict */
  readonly conflictingField: string;

  /** The value that already exists (sanitized) */
  readonly conflictingValue?: string;

  constructor(
    conflictingField: string,
    conflictingValue?: string,
    metadata?: Record<string, unknown>
  ) {
    const message = conflictingValue
      ? `A resource with ${conflictingField} '${conflictingValue}' already exists`
      : `A resource with this ${conflictingField} already exists`;

    super(message, metadata);
    this.conflictingField = conflictingField;
    this.conflictingValue = conflictingValue;
  }

  override toLogPayload(): Record<string, unknown> {
    return {
      ...super.toLogPayload(),
      conflictingField: this.conflictingField,
      conflictingValue: this.conflictingValue,
    };
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      conflictingField: this.conflictingField,
      conflictingValue: this.conflictingValue,
    };
  }
}
