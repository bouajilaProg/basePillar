import type { Filebase, Folder } from '../drive-types';
import { fetchApi } from './fetchApi';

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
