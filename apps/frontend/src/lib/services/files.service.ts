import type { FilePointer } from '../drive-types';

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

export const files = {
  listInFolder: (filebaseId: string, folderId: string) =>
    fetchApi<FilePointer[]>(`/filebases/${filebaseId}/files/folder/${folderId}`),

  getPointer: (filebaseId: string, pointerId: string) =>
    fetchApi<FilePointer>(`/filebases/${filebaseId}/files/${pointerId}`),

  upload: (filebaseId: string, folderId: string, file: File, name?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folderId', folderId);
    if (name) formData.append('name', name);

    return fetchApi<{ file: unknown; pointer: FilePointer }>(`/filebases/${filebaseId}/files`, {
      method: 'POST',
      body: formData,
    });
  },

  rename: (filebaseId: string, pointerId: string, name: string) =>
    fetchApi<FilePointer>(`/filebases/${filebaseId}/files/${pointerId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),

  move: (filebaseId: string, pointerId: string, folderId: string) =>
    fetchApi<FilePointer>(`/filebases/${filebaseId}/files/${pointerId}/move`, {
      method: 'PATCH',
      body: JSON.stringify({ folderId }),
    }),

  delete: (filebaseId: string, pointerId: string) =>
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
