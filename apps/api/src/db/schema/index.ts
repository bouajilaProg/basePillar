// Tables
export { users, usersRelations, type User, type NewUser } from './users';

// NOTE: Organizations and memberships are kept for future use but not exported
// To re-enable, uncomment the following:
// export {
//   organizations,
//   organizationsRelations,
//   type Organization,
//   type NewOrganization,
// } from './organizations';
// export {
//   memberships,
//   membershipsRelations,
//   membershipRoleEnum,
//   type Membership,
//   type NewMembership,
//   type MembershipRole,
// } from './memberships';

// Filebases - user's personal file storage space
export { filebases, filebasesRelations, type Filebase, type NewFilebase } from './filebases';

// Filebase Members - users invited to a filebase
export {
  filebaseMembers,
  filebaseMembersRelations,
  filebaseMemberRoleEnum,
  type FilebaseMember,
  type NewFilebaseMember,
  type FilebaseMemberRole,
} from './filebaseMembers';

// Folders - directory structure within a filebase
export { folders, foldersRelations, type Folder, type NewFolder } from './folders';

// Files - physical files stored in S3
export { files, filesRelations, type File, type NewFile } from './files';

// File Pointers - user-facing file entries (including shortcuts)
export {
  filePointers,
  filePointersRelations,
  type FilePointer,
  type NewFilePointer,
} from './filePointers';

// User Groups - groups for bulk access control
export { userGroups, userGroupsRelations, type UserGroup, type NewUserGroup } from './userGroups';

// User Group Members - users in groups
export {
  userGroupMembers,
  userGroupMembersRelations,
  type UserGroupMember,
  type NewUserGroupMember,
} from './userGroupMembers';

// Access Rules - fine-grained access control
export {
  accessRules,
  accessRulesRelations,
  targetTypeEnum,
  subjectTypeEnum,
  accessTypeEnum,
  permissionEnum,
  type AccessRule,
  type NewAccessRule,
  type TargetType,
  type SubjectType,
  type AccessType,
  type Permission,
} from './accessRules';
