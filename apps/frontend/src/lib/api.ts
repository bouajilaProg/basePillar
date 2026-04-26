import type { Filebase, FilePointer, Folder, User } from './drive-types';

export class ApiError extends Error {
  code: string;
  statusCode: number;

  constructor(code: string, message: string, statusCode: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export const api = {
  auth: {
    register: (payload: {
      email: string;
      password: string;
      name: string;
      organizationName?: string;
    }) => import('./services').then(({ auth }) => auth.register(payload)),

    login: (payload: { email: string; password: string }) =>
      import('./services').then(({ auth }) => auth.login(payload)),

    logout: () => import('./services').then(({ auth }) => auth.logout()),

    me: () => import('./services').then(({ auth }) => auth.me()),
  },

  filebases: {
    create: (name: string) => import('./services').then(({ filebases }) => filebases.create(name)),

    getMy: () => import('./services').then(({ filebases }) => filebases.getMy()),

    getById: (filebaseId: string) =>
      import('./services').then(({ filebases }) => filebases.getById(filebaseId)),

    getRoot: (filebaseId: string) =>
      import('./services').then(({ filebases }) => filebases.getRoot(filebaseId)),

    updateName: (filebaseId: string, name: string) =>
      import('./services').then(({ filebases }) => filebases.updateName(filebaseId, name)),

    delete: (filebaseId: string) =>
      import('./services').then(({ filebases }) => filebases.delete(filebaseId)),
  },

  folders: {
    listChildren: (filebaseId: string, folderId: string) =>
      import('./services').then(({ folders }) => folders.listChildren(filebaseId, folderId)),

    get: (filebaseId: string, folderId: string) =>
      import('./services').then(({ folders }) => folders.get(filebaseId, folderId)),

    create: (filebaseId: string, name: string, parentId: string | null) =>
      import('./services').then(({ folders }) => folders.create(filebaseId, name, parentId)),

    rename: (filebaseId: string, folderId: string, name: string) =>
      import('./services').then(({ folders }) => folders.rename(filebaseId, folderId, name)),

    move: (filebaseId: string, folderId: string, parentId: string) =>
      import('./services').then(({ folders }) => folders.move(filebaseId, folderId, parentId)),

    delete: (filebaseId: string, folderId: string) =>
      import('./services').then(({ folders }) => folders.delete(filebaseId, folderId)),

    getPath: (filebaseId: string, folderId: string) =>
      import('./services').then(({ folders }) => folders.getPath(filebaseId, folderId)),
  },

  files: {
    listInFolder: (filebaseId: string, folderId: string) =>
      import('./services').then(({ files }) => files.listInFolder(filebaseId, folderId)),

    getPointer: (filebaseId: string, pointerId: string) =>
      import('./services').then(({ files }) => files.getPointer(filebaseId, pointerId)),

    upload: (filebaseId: string, folderId: string, file: File, name?: string) =>
      import('./services').then(({ files }) => files.upload(filebaseId, folderId, file, name)),

    rename: (filebaseId: string, pointerId: string, name: string) =>
      import('./services').then(({ files }) => files.rename(filebaseId, pointerId, name)),

    move: (filebaseId: string, pointerId: string, folderId: string) =>
      import('./services').then(({ files }) => files.move(filebaseId, pointerId, folderId)),

    delete: (filebaseId: string, pointerId: string) =>
      import('./services').then(({ files }) => files.delete(filebaseId, pointerId)),

    createShortcut: (
      filebaseId: string,
      sourcePointerId: string,
      targetFolderId: string,
      name: string
    ) =>
      import('./services').then(({ files }) =>
        files.createShortcut(filebaseId, sourcePointerId, targetFolderId, name)
      ),

    getDownloadUrl: (filebaseId: string, pointerId: string) =>
      import('./services').then(({ files }) => files.getDownloadUrl(filebaseId, pointerId)),
  },
};
