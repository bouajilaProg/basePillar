import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Inject,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { eq, and } from 'drizzle-orm';
import { DB_CONNECTION, type Database } from '../../db/db.module';
import * as schema from '../../db/schema';
import { FilebaseMemberRole } from '../../db/schema/filebaseMembers';
import { FILEBASE_ROLE_RANK, FILEBASE_ROLES_KEY } from '../constants';

/**
 * Decorator to set required minimum roles for filebase access
 * @param roles - Array of acceptable roles (any match allows access)
 */
export const FilebaseRoles = (...roles: FilebaseMemberRole[]) =>
  SetMetadata(FILEBASE_ROLES_KEY, roles);

/**
 * FilebaseAccessGuard
 *
 * Guards routes that require filebase-level access.
 * Checks if user is owner or has sufficient member role.
 *
 * Usage:
 * @UseGuards(JwtAuthGuard, FilebaseAccessGuard)
 * @FilebaseRoles('editor')
 */
@Injectable()
export class FilebaseAccessGuard implements CanActivate {
  constructor(
    @Inject(DB_CONNECTION)
    private readonly db: Database,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<FilebaseMemberRole[]>(
      FILEBASE_ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );

    // No roles specified = no restriction
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.sub;
    const filebaseId = request.params?.filebaseId;

    if (!userId || !filebaseId) {
      throw new ForbiddenException('Missing user or filebase context');
    }

    // Check if user is owner
    const [filebase] = await this.db
      .select()
      .from(schema.filebases)
      .where(eq(schema.filebases.id, filebaseId));

    if (!filebase) {
      throw new ForbiddenException('Filebase not found');
    }

    // Owner has full access
    if (filebase.ownerId === userId) {
      return true;
    }

    // Check membership
    const [membership] = await this.db
      .select()
      .from(schema.filebaseMembers)
      .where(
        and(
          eq(schema.filebaseMembers.filebaseId, filebaseId),
          eq(schema.filebaseMembers.userId, userId)
        )
      );

    if (!membership) {
      throw new ForbiddenException('Not a member of this filebase');
    }

    // Check if member's role meets minimum requirement
    const memberRank = FILEBASE_ROLE_RANK[membership.role];
    const minRequiredRank = Math.min(...requiredRoles.map((r) => FILEBASE_ROLE_RANK[r]));

    if (memberRank < minRequiredRank) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
