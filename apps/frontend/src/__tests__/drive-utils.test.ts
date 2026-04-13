import { describe, expect, it } from 'vitest';
import { filterDriveItems, sortDriveItems, toDriveItems } from '../lib/drive-utils';

describe('drive-utils', () => {
  it('maps folders and files to drive items', () => {
    const items = toDriveItems(
      [
        {
          id: 'folder-1',
          filebaseId: 'fb1',
          parentId: 'root',
          name: 'Design',
          createdAt: '2025-01-01',
          updatedAt: '2025-01-02',
        },
      ],
      [
        {
          id: 'pointer-1',
          fileId: 'f1',
          folderId: 'root',
          name: 'notes.txt',
          isShortcut: false,
          createdAt: '2025-01-01',
          updatedAt: '2025-01-03',
        },
      ]
    );

    expect(items).toHaveLength(2);
    expect(items[0].type).toBe('folder');
    expect(items[1].type).toBe('file');
  });

  it('keeps folders above files when sorting', () => {
    const sorted = sortDriveItems(
      [
        { id: '1', type: 'file', name: 'z.txt', updatedAt: '2025-01-02' },
        { id: '2', type: 'folder', name: 'a', updatedAt: '2025-01-03', folderId: '2' },
      ],
      'name',
      'asc'
    );

    expect(sorted[0].type).toBe('folder');
  });

  it('filters items by name', () => {
    const filtered = filterDriveItems(
      [
        { id: '1', type: 'folder', name: 'Contracts', updatedAt: '2025-01-01', folderId: '1' },
        { id: '2', type: 'file', name: 'roadmap.txt', updatedAt: '2025-01-01', pointerId: '2' },
      ],
      'road'
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toContain('road');
  });
});
