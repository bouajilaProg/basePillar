import type { DriveItem, FilePointer, Folder, SortDirection, SortKey } from './drive-types';

export function toDriveItems(folders: Folder[], files: FilePointer[]): DriveItem[] {
  const folderItems: DriveItem[] = folders.map((folder) => ({
    id: folder.id,
    type: 'folder',
    name: folder.name,
    updatedAt: folder.updatedAt,
    folderId: folder.id,
  }));

  const fileItems: DriveItem[] = files.map((file) => ({
    id: file.id,
    type: 'file',
    name: file.name,
    updatedAt: file.updatedAt,
    pointerId: file.id,
    isShortcut: file.isShortcut,
  }));

  return [...folderItems, ...fileItems];
}

export function sortDriveItems(
  items: DriveItem[],
  key: SortKey,
  direction: SortDirection
): DriveItem[] {
  const sorted = [...items].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'folder' ? -1 : 1;
    }

    if (key === 'name') {
      return a.name.localeCompare(b.name);
    }

    return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
  });

  if (direction === 'desc') {
    sorted.reverse();
  }

  return sorted;
}

export function filterDriveItems(items: DriveItem[], query: string): DriveItem[] {
  const value = query.trim().toLowerCase();
  if (!value) return items;

  return items.filter((item) => item.name.toLowerCase().includes(value));
}

export function formatDate(value: string): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(date);
}
