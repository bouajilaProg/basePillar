import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccessRulesService, Permission } from '../accessRules.service';
import { FILE_PERMISSION_KEY } from '../constants';
export { FILE_PERMISSION_KEY } from '../constants';

/**
 * Decorator to set required permission for file/folder access
 * @param permission - Required permission (read, write, delete, share)
 */
export const RequirePermission = (permission: Permission) =>
  SetMetadata(FILE_PERMISSION_KEY, permission);

/**
 * FileAccessGuard
 *
 * Guards routes that require file/folder-level access.
 * Uses AccessRulesService to check fine-grained permissions.
 *
 * Usage:
 * @UseGuards(JwtAuthGuard, FileAccessGuard)
 * @RequirePermission('write')
 */
@Injectable()
export class FileAccessGuard implements CanActivate {
  constructor(
    private readonly accessRulesService: AccessRulesService,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<Permission>(FILE_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No permission specified = no restriction
    if (!requiredPermission) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.sub;
    const folderId = request.params?.folderId;
    const fileId = request.params?.fileId;

    if (!userId) {
      throw new ForbiddenException('Missing user context');
    }

    if (!folderId && !fileId) {
      throw new ForbiddenException('Missing target context');
    }

    // Check access using AccessRulesService
    const hasAccess = await this.accessRulesService.checkAccess({
      userId,
      targetType: folderId ? 'folder' : 'file',
      targetId: folderId || fileId,
      permission: requiredPermission,
    });

    if (!hasAccess) {
      throw new ForbiddenException(`Missing ${requiredPermission} permission`);
    }

    return true;
  }
}
