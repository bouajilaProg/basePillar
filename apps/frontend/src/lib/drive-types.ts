export type User = {
  id: string;
  email: string;
  name: string | null;
};

export type Filebase = {
  id: string;
  ownerId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  rootFolderId?: string;
};

export type Folder = {
  id: string;
  filebaseId: string;
  parentId: string | null;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type FilePointer = {
  id: string;
  fileId: string;
  folderId: string;
  name: string;
  isShortcut: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DriveItemType = 'folder' | 'file';

export type DriveItem = {
  id: string;
  type: DriveItemType;
  name: string;
  updatedAt: string;
  folderId?: string;
  pointerId?: string;
  isShortcut?: boolean;
};

export type SortKey = 'name' | 'date';
export type SortDirection = 'asc' | 'desc';
