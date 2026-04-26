import type { Filebase, Folder } from '../drive-types';

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

export const filebases = {
  create: (name: string) =>
    fetchApi<Filebase>('/filebases', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  getMy: () => fetchApi<Filebase | null>('/filebases/mine'),

  getById: (filebaseId: string) => fetchApi<Filebase>(`/filebases/${filebaseId}`),

  getRoot: (filebaseId: string) => fetchApi<Folder>(`/filebases/${filebaseId}/root`),

  updateName: (filebaseId: string, name: string) =>
    fetchApi<Filebase>(`/filebases/${filebaseId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),

  delete: (filebaseId: string) =>
    fetchApi<void>(`/filebases/${filebaseId}`, {
      method: 'DELETE',
    }),
};
