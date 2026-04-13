import type { Filebase, FilePointer, Folder, User } from './drive-types';

const API_BASE = '/api';

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

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const isFormData = options.body instanceof FormData;

  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      data.code || 'UNKNOWN_ERROR',
      data.message || 'Request failed',
      response.status
    );
  }

  return data as T;
}

type RegisterPayload = {
  email: string;
  password: string;
  name: string;
  organizationName?: string;
};

type LoginPayload = {
  email: string;
  password: string;
};

type AuthResponse = {
  user: User;
};

type MeResponse = User;

export const api = {
  register: (payload: RegisterPayload) =>
    fetchApi<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: LoginPayload) =>
    fetchApi<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  logout: () =>
    fetchApi<{ message: string }>('/auth/logout', {
      method: 'POST',
    }),

  me: () => fetchApi<MeResponse>('/auth/me'),

  createFilebase: (name: string) =>
    fetchApi<Filebase>('/filebases', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  getMyFilebase: () => fetchApi<Filebase | null>('/filebases/mine'),

  getFilebaseById: (filebaseId: string) => fetchApi<Filebase>(`/filebases/${filebaseId}`),

  getFilebaseRoot: (filebaseId: string) => fetchApi<Folder>(`/filebases/${filebaseId}/root`),

  updateFilebaseName: (filebaseId: string, name: string) =>
    fetchApi<Filebase>(`/filebases/${filebaseId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),

  deleteFilebase: (filebaseId: string) =>
    fetchApi<void>(`/filebases/${filebaseId}`, {
      method: 'DELETE',
    }),

  listChildFolders: (filebaseId: string, folderId: string) =>
    fetchApi<Folder[]>(`/filebases/${filebaseId}/folders/${folderId}/children`),

  getFolder: (filebaseId: string, folderId: string) =>
    fetchApi<Folder>(`/filebases/${filebaseId}/folders/${folderId}`),

  createFolder: (filebaseId: string, name: string, parentId: string | null) =>
    fetchApi<Folder>(`/filebases/${filebaseId}/folders`, {
      method: 'POST',
      body: JSON.stringify({ name, parentId }),
    }),

  renameFolder: (filebaseId: string, folderId: string, name: string) =>
    fetchApi<Folder>(`/filebases/${filebaseId}/folders/${folderId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),

  moveFolder: (filebaseId: string, folderId: string, parentId: string) =>
    fetchApi<Folder>(`/filebases/${filebaseId}/folders/${folderId}/move`, {
      method: 'PATCH',
      body: JSON.stringify({ parentId }),
    }),

  deleteFolder: (filebaseId: string, folderId: string) =>
    fetchApi<void>(`/filebases/${filebaseId}/folders/${folderId}`, {
      method: 'DELETE',
    }),

  getFolderPath: (filebaseId: string, folderId: string) =>
    fetchApi<Folder[]>(`/filebases/${filebaseId}/folders/${folderId}/path`),

  listFilesInFolder: (filebaseId: string, folderId: string) =>
    fetchApi<FilePointer[]>(`/filebases/${filebaseId}/files/folder/${folderId}`),

  getFilePointer: (filebaseId: string, pointerId: string) =>
    fetchApi<FilePointer>(`/filebases/${filebaseId}/files/${pointerId}`),

  uploadFile: (filebaseId: string, folderId: string, file: File, name?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folderId', folderId);
    if (name) formData.append('name', name);

    return fetchApi<{ file: unknown; pointer: FilePointer }>(`/filebases/${filebaseId}/files`, {
      method: 'POST',
      body: formData,
    });
  },

  renameFile: (filebaseId: string, pointerId: string, name: string) =>
    fetchApi<FilePointer>(`/filebases/${filebaseId}/files/${pointerId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),

  moveFile: (filebaseId: string, pointerId: string, folderId: string) =>
    fetchApi<FilePointer>(`/filebases/${filebaseId}/files/${pointerId}/move`, {
      method: 'PATCH',
      body: JSON.stringify({ folderId }),
    }),

  deleteFile: (filebaseId: string, pointerId: string) =>
    fetchApi<void>(`/filebases/${filebaseId}/files/${pointerId}`, {
      method: 'DELETE',
    }),

  createShortcut: (
    filebaseId: string,
    sourcePointerId: string,
    targetFolderId: string,
    name: string
  ) =>
    fetchApi<FilePointer>(`/filebases/${filebaseId}/files/${sourcePointerId}/shortcut`, {
      method: 'POST',
      body: JSON.stringify({ targetFolderId, name }),
    }),

  getDownloadUrl: (filebaseId: string, pointerId: string) =>
    fetchApi<{ url: string }>(`/filebases/${filebaseId}/files/${pointerId}/download`),
};
