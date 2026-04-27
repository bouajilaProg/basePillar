import { useMemo } from 'react';
import { api, ApiError } from '@/lib/api';
import { filterDriveItems, formatDate, sortDriveItems, toDriveItems } from '@/lib/drive-utils';
import { useDriveStore } from '@/stores/drive';

export function useDrive() {
  const {
    filebase,
    currentFolder,
    breadcrumb,
    folders,
    files,
    starredFolderIds,
    sortKey,
    sortDirection,
    loading,
    selected,
    renameTarget,
    deleteTarget,
    shortcutSource,
    previewFileUrl,
    uploadBusy,
    actionBusy,
    renameDriveOpen,
    toasts,
    setFilebase,
    setCurrentFolder,
    setBreadcrumb,
    setFolders,
    setFiles,
    setLoading,
    setSelected,
    toggleSort,
    enqueueToast,
    dismissToast,
    openRenameModal,
    openDeleteModal,
    openShortcutModal,
    openPreview,
    setUploadBusy,
    setActionBusy,
    setRenameDriveOpen,
    setStarredFolderIds,
    toggleStarFolder,
  } = useDriveStore();

  const visibleItems = useMemo(() => {
    const all = toDriveItems(folders, files);
    return sortDriveItems(filterDriveItems(all, ''), sortKey, sortDirection);
  }, [folders, files, sortKey, sortDirection]);

  const loadFolder = async (filebaseId: string, folderId: string) => {
    setLoading(true);
    try {
      const [childrenFolders, filePointers, path, current] = await Promise.all([
        api.folders.listChildren(filebaseId, folderId),
        api.files.listInFolder(filebaseId, folderId),
        api.folders.getPath(filebaseId, folderId),
        api.folders.get(filebaseId, folderId),
      ]);

      setFolders(childrenFolders);
      setFiles(filePointers);
      setBreadcrumb(path);
      setCurrentFolder(current ?? path[path.length - 1] ?? null);
    } catch (error) {
      const err = error as ApiError;
      enqueueToast(err.message || 'Failed to load folder', 'error');
    } finally {
      setLoading(false);
    }
  };

  const bootstrapDrive = async (userName: string | null) => {
    setLoading(true);
    try {
      let currentFilebase = await api.filebases.getMy();

      if (!currentFilebase) {
        const baseName = (userName && userName.trim()) || 'User';
        currentFilebase = await api.filebases.create(`${baseName}'s Drive`);
        enqueueToast('Drive created', 'success');
      }

      setFilebase(currentFilebase);
      const confirmed = await api.filebases.getById(currentFilebase.id);
      setFilebase(confirmed);
      const root = await api.filebases.getRoot(currentFilebase.id);

      const stars = await api.stars.list(currentFilebase.id);
      setStarredFolderIds(new Set(stars.map((s) => s.folderId)));

      await loadFolder(currentFilebase.id, root.id);
    } catch (error) {
      const err = error as ApiError;
      enqueueToast(err.message || 'Failed to initialize drive', 'error');
    } finally {
      setLoading(false);
    }
  };

  const refreshCurrent = async () => {
    if (!filebase || !currentFolder) return;
    await loadFolder(filebase.id, currentFolder.id);
  };

  const onCreateFolder = async (name: string) => {
    if (!filebase || !currentFolder) return;
    setActionBusy(true);
    try {
      await api.folders.create(filebase.id, name, currentFolder.id);
      enqueueToast('Folder created', 'success');
      await refreshCurrent();
    } catch (error) {
      const err = error as ApiError;
      enqueueToast(err.message, 'error');
    } finally {
      setActionBusy(false);
    }
  };

  const onUpload = async (file: File) => {
    if (!filebase || !currentFolder) return;
    setUploadBusy(true);
    try {
      await api.files.upload(filebase.id, currentFolder.id, file);
      enqueueToast('File uploaded', 'success');
      await refreshCurrent();
    } catch (error) {
      const err = error as ApiError;
      enqueueToast(err.message, 'error');
    } finally {
      setUploadBusy(false);
    }
  };

  const onRename = async (name: string) => {
    if (!filebase || !renameTarget) return;
    setActionBusy(true);
    try {
      if (renameTarget.itemType === 'folder') {
        await api.folders.rename(filebase.id, renameTarget.itemId, name);
      } else {
        await api.files.rename(filebase.id, renameTarget.itemId, name);
      }
      openRenameModal(null);
      enqueueToast('Renamed successfully', 'success');
      await refreshCurrent();
    } catch (error) {
      const err = error as ApiError;
      enqueueToast(err.message, 'error');
    } finally {
      setActionBusy(false);
    }
  };

  const onDelete = async () => {
    if (!filebase || !deleteTarget) return;
    setActionBusy(true);
    try {
      if (deleteTarget.itemType === 'folder') {
        await api.folders.delete(filebase.id, deleteTarget.itemId);
      } else {
        await api.files.delete(filebase.id, deleteTarget.itemId);
      }
      openDeleteModal(null);
      enqueueToast('Deleted successfully', 'success');
      await refreshCurrent();
    } catch (error) {
      const err = error as ApiError;
      enqueueToast(err.message, 'error');
    } finally {
      setActionBusy(false);
    }
  };

  const onCreateShortcut = async (targetFolderId: string, name: string) => {
    if (!filebase || !shortcutSource) return;
    setActionBusy(true);
    try {
      await api.files.createShortcut(filebase.id, shortcutSource.itemId, targetFolderId, name);
      openShortcutModal(null);
      enqueueToast('Shortcut created', 'success');
    } catch (error) {
      const err = error as ApiError;
      enqueueToast(err.message, 'error');
    } finally {
      setActionBusy(false);
    }
  };

  const onToggleStar = async (folderId: string) => {
    if (!filebase) return;
    const isStarred = starredFolderIds.has(folderId);
    setActionBusy(true);
    try {
      if (isStarred) {
        await api.stars.unstar(filebase.id, folderId);
        enqueueToast('Folder unstarred', 'success');
      } else {
        await api.stars.star(filebase.id, folderId);
        enqueueToast('Folder starred', 'success');
      }
      toggleStarFolder(folderId);
    } catch (error) {
      const err = error as ApiError;
      enqueueToast(err.message, 'error');
    } finally {
      setActionBusy(false);
    }
  };

  const onMove = async (itemType: 'folder' | 'file', itemId: string, targetFolderId: string) => {
    if (!filebase) return;
    setActionBusy(true);
    try {
      if (itemType === 'folder') {
        await api.folders.move(filebase.id, itemId, targetFolderId);
      } else {
        await api.files.move(filebase.id, itemId, targetFolderId);
      }
      enqueueToast('Moved successfully', 'success');
      await refreshCurrent();
    } catch (error) {
      const err = error as ApiError;
      enqueueToast(err.message, 'error');
    } finally {
      setActionBusy(false);
    }
  };

  const onRenameDrive = async (name: string) => {
    if (!filebase) return;
    setActionBusy(true);
    try {
      const updated = await api.filebases.updateName(filebase.id, name);
      setFilebase(updated);
      setRenameDriveOpen(false);
      enqueueToast('Drive renamed', 'success');
    } catch (error) {
      const err = error as ApiError;
      enqueueToast(err.message, 'error');
    } finally {
      setActionBusy(false);
    }
  };

  const onDeleteDrive = async (userName: string | null) => {
    if (!filebase) return;
    setActionBusy(true);
    try {
      await api.filebases.delete(filebase.id);
      enqueueToast('Drive deleted', 'success');
      setFilebase(null);
      setCurrentFolder(null);
      setFolders([]);
      setFiles([]);
      setBreadcrumb([]);
      await bootstrapDrive(userName);
    } catch (error) {
      const err = error as ApiError;
      enqueueToast(err.message, 'error');
    } finally {
      setActionBusy(false);
    }
  };

  const openFilePreview = async (pointerId: string) => {
    if (!filebase) return;
    try {
      await api.files.getPointer(filebase.id, pointerId);
      const { url } = await api.files.getDownloadUrl(filebase.id, pointerId);
      openPreview(url);
    } catch (error) {
      const err = error as ApiError;
      enqueueToast(err.message, 'error');
    }
  };

  return {
    filebase,
    currentFolder,
    breadcrumb,
    folders,
    files,
    starredFolderIds,
    visibleItems,
    sortKey,
    sortDirection,
    loading,
    selected,
    renameTarget,
    deleteTarget,
    shortcutSource,
    previewFileUrl,
    uploadBusy,
    actionBusy,
    renameDriveOpen,
    toasts,
    setSelected,
    toggleSort,
    enqueueToast,
    dismissToast,
    openRenameModal,
    openDeleteModal,
    openShortcutModal,
    openPreview,
    setRenameDriveOpen,
    bootstrapDrive,
    loadFolder,
    refreshCurrent,
    onCreateFolder,
    onUpload,
    onRename,
    onDelete,
    onCreateShortcut,
    onMove,
    onToggleStar,
    onRenameDrive,
    onDeleteDrive,
    openFilePreview,
    formatDate,
  };
}
