import type { Folder } from '../drive-types';

const API_BASE = '/api';

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
    throw {
      code: data.code || 'UNKNOWN_ERROR',
      message: data.message || 'Request failed',
      statusCode: response.status,
    };
  }

  return data as T;
}

export const folders = {
  listChildren: (filebaseId: string, folderId: string) =>
    fetchApi<Folder[]>(`/filebases/${filebaseId}/folders/${folderId}/children`),

  get: (filebaseId: string, folderId: string) =>
    fetchApi<Folder>(`/filebases/${filebaseId}/folders/${folderId}`),

  create: (filebaseId: string, name: string, parentId: string | null) =>
    fetchApi<Folder>(`/filebases/${filebaseId}/folders`, {
      method: 'POST',
      body: JSON.stringify({ name, parentId }),
    }),

  rename: (filebaseId: string, folderId: string, name: string) =>
    fetchApi<Folder>(`/filebases/${filebaseId}/folders/${folderId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),

  move: (filebaseId: string, folderId: string, parentId: string) =>
    fetchApi<Folder>(`/filebases/${filebaseId}/folders/${folderId}/move`, {
      method: 'PATCH',
      body: JSON.stringify({ parentId }),
    }),

  delete: (filebaseId: string, folderId: string) =>
    fetchApi<void>(`/filebases/${filebaseId}/folders/${folderId}`, {
      method: 'DELETE',
    }),

  getPath: (filebaseId: string, folderId: string) =>
    fetchApi<Folder[]>(`/filebases/${filebaseId}/folders/${folderId}/path`),
};
