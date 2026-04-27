import type { Folder } from '../drive-types';
import { fetchApi } from './fetchApi';

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
