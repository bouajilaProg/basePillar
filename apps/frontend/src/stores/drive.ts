import { create } from 'zustand';
import type { FilePointer, Filebase, Folder, SortDirection, SortKey } from '@/lib/drive-types';

type ToastVariant = 'success' | 'error' | 'info';

export type ToastMessage = {
  id: number;
  text: string;
  variant: ToastVariant;
};

type Selection = {
  itemId: string;
  itemType: 'folder' | 'file';
};

type DriveState = {
  filebase: Filebase | null;
  currentFolder: Folder | null;
  breadcrumb: Folder[];
  folders: Folder[];
  files: FilePointer[];
  starredFolderIds: Set<string>;
  sortKey: SortKey;
  sortDirection: SortDirection;
  loading: boolean;
  selected: Selection | null;
  toasts: ToastMessage[];
  renameTarget: Selection | null;
  deleteTarget: Selection | null;
  shortcutSource: Selection | null;
  previewFileUrl: string | null;
  uploadBusy: boolean;
  actionBusy: boolean;
  renameDriveOpen: boolean;
  setFilebase: (filebase: Filebase | null) => void;
  setCurrentFolder: (folder: Folder | null) => void;
  setBreadcrumb: (folders: Folder[]) => void;
  setFolders: (folders: Folder[]) => void;
  setFiles: (files: FilePointer[]) => void;
  setStarredFolderIds: (ids: Set<string>) => void;
  toggleStarFolder: (folderId: string) => void;
  toggleSort: (key: SortKey) => void;
  setLoading: (loading: boolean) => void;
  setSelected: (selected: Selection | null) => void;
  enqueueToast: (text: string, variant?: ToastVariant) => void;
  dismissToast: (id: number) => void;
  openRenameModal: (target: Selection | null) => void;
  openDeleteModal: (target: Selection | null) => void;
  openShortcutModal: (target: Selection | null) => void;
  openPreview: (url: string | null) => void;
  setUploadBusy: (busy: boolean) => void;
  setActionBusy: (busy: boolean) => void;
  setRenameDriveOpen: (open: boolean) => void;
  resetDrive: () => void;
};

let toastId = 1;

const initialState = {
  filebase: null,
  currentFolder: null,
  breadcrumb: [],
  folders: [],
  files: [],
  starredFolderIds: new Set<string>(),
  sortKey: 'name' as SortKey,
  sortDirection: 'asc' as SortDirection,
  loading: true,
  selected: null,
  toasts: [],
  renameTarget: null,
  deleteTarget: null,
  shortcutSource: null,
  previewFileUrl: null,
  uploadBusy: false,
  actionBusy: false,
  renameDriveOpen: false,
};

export const useDriveStore = create<DriveState>((set) => ({
  ...initialState,
  setFilebase: (filebase) => set({ filebase }),
  setCurrentFolder: (currentFolder) => set({ currentFolder }),
  setBreadcrumb: (breadcrumb) => set({ breadcrumb }),
  setFolders: (folders) => set({ folders }),
  setFiles: (files) => set({ files }),
  setLoading: (loading) => set({ loading }),
  setSelected: (selected) => set({ selected }),
  setUploadBusy: (uploadBusy) => set({ uploadBusy }),
  setActionBusy: (actionBusy) => set({ actionBusy }),
  setRenameDriveOpen: (renameDriveOpen) => set({ renameDriveOpen }),
  setStarredFolderIds: (starredFolderIds) => set({ starredFolderIds }),
  toggleStarFolder: (folderId) =>
    set((state) => {
      const newSet = new Set(state.starredFolderIds);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return { starredFolderIds: newSet };
    }),
  toggleSort: (sortKey) =>
    set((state) => {
      if (state.sortKey !== sortKey) {
        return { sortKey, sortDirection: 'asc' as SortDirection };
      }

      return {
        sortDirection:
          state.sortDirection === 'asc' ? ('desc' as SortDirection) : ('asc' as SortDirection),
      };
    }),
  enqueueToast: (text, variant = 'info') =>
    set((state) => ({
      toasts: [...state.toasts, { id: toastId++, text, variant }],
    })),
  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
  openRenameModal: (renameTarget) => set({ renameTarget }),
  openDeleteModal: (deleteTarget) => set({ deleteTarget }),
  openShortcutModal: (shortcutSource) => set({ shortcutSource }),
  openPreview: (previewFileUrl) => set({ previewFileUrl }),
  resetDrive: () => set({ ...initialState, starredFolderIds: new Set() }),
}));
