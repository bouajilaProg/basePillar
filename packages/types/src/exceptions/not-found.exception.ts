import { AppException } from './base.exception';

/**
 * Not Found Exception
 *
 * Thrown when a requested resource doesn't exist.
 * Generic enough to work with any entity type (users, orgs, files, etc.)
 *
 * Why include resourceType and resourceId?
 * - Helps with debugging ("User 123 not found" vs just "Not found")
 * - Allows structured logging for analytics
 * - Enables frontends to show contextual error messages
 */
export class NotFoundException extends AppException {
  readonly code = 'RESOURCE_NOT_FOUND';
  readonly statusCode = 404;

  /** Type of resource that wasn't found (e.g., 'User', 'Organization') */
  readonly resourceType: string;

  /** Identifier of the resource (e.g., UUID, slug) */
  readonly resourceId?: string;

  constructor(resourceType: string, resourceId?: string, metadata?: Record<string, unknown>) {
    const message = resourceId
      ? `${resourceType} with identifier '${resourceId}' was not found`
      : `${resourceType} was not found`;

    super(message, metadata);
    this.resourceType = resourceType;
    this.resourceId = resourceId;
  }

  override toLogPayload(): Record<string, unknown> {
    return {
      ...super.toLogPayload(),
      resourceType: this.resourceType,
      resourceId: this.resourceId,
    };
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      resourceType: this.resourceType,
      resourceId: this.resourceId,
    };
  }
}
