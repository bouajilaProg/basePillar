import { FilebaseMemberRole } from '../db/schema/filebaseMembers';

export const FILEBASE_ROLES_KEY = 'filebaseRoles';
export const FILE_PERMISSION_KEY = 'filePermission';

/**
 * Role hierarchy: viewer < editor < admin
 */
export const FILEBASE_ROLE_RANK: Record<FilebaseMemberRole, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
};
