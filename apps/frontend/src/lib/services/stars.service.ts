import { fetchApi } from './fetchApi';

export const stars = {
  list: (filebaseId: string) =>
    fetchApi<
      Array<{
        id: string;
        filebaseId: string;
        folderId: string;
        userId: string;
        createdAt: string;
        folderName: string;
        parentId: string | null;
      }>
    >(`/filebases/${filebaseId}/stars`),

  star: (filebaseId: string, folderId: string) =>
    fetchApi<{
      id: string;
      filebaseId: string;
      folderId: string;
      userId: string;
      createdAt: string;
    }>(`/filebases/${filebaseId}/folders/${folderId}/star`, { method: 'POST' }),

  unstar: (filebaseId: string, folderId: string) =>
    fetchApi<{ success: boolean }>(`/filebases/${filebaseId}/folders/${folderId}/star`, {
      method: 'DELETE',
    }),
};
