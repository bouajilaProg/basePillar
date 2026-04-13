import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError } from '../lib/api';

describe('api client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn();
  });

  it('register sends payload and includes credentials', async () => {
    const mockFetch = global.fetch as unknown as ReturnType<typeof vi.fn>;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { id: 'u1', email: 'a@b.com', name: 'Alex' } }),
    });

    await api.register({ email: 'a@b.com', password: 'password123', name: 'Alex' });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/auth/register',
      expect.objectContaining({ method: 'POST', credentials: 'include' })
    );
  });

  it('creates filebase and reads root', async () => {
    const mockFetch = global.fetch as unknown as ReturnType<typeof vi.fn>;

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'fb1',
          ownerId: 'u1',
          name: "Alex's Drive",
          createdAt: '',
          updatedAt: '',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'root1',
          filebaseId: 'fb1',
          parentId: null,
          name: 'root',
          createdAt: '',
          updatedAt: '',
        }),
      });

    const filebase = await api.createFilebase("Alex's Drive");
    const root = await api.getFilebaseRoot('fb1');

    expect(filebase.id).toBe('fb1');
    expect(root.id).toBe('root1');
  });

  it('upload file sends multipart form data', async () => {
    const mockFetch = global.fetch as unknown as ReturnType<typeof vi.fn>;
    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        file: { id: 'f1' },
        pointer: {
          id: 'p1',
          fileId: 'f1',
          folderId: 'root1',
          name: 'hello.txt',
          isShortcut: false,
          createdAt: '',
          updatedAt: '',
        },
      }),
    });

    await api.uploadFile('fb1', 'root1', file);

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/filebases/fb1/files',
      expect.objectContaining({ method: 'POST', body: expect.any(FormData) })
    );
  });

  it('throws ApiError with backend message', async () => {
    const mockFetch = global.fetch as unknown as ReturnType<typeof vi.fn>;

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({
        code: 'RESOURCE_CONFLICT',
        message: 'File with this name already exists in folder',
      }),
    });

    await expect(api.createFolder('fb1', 'Docs', 'root1')).rejects.toBeInstanceOf(ApiError);
  });
});
