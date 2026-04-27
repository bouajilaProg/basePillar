import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, Link, useNavigate } from 'react-router';
import { Button, Input } from '@repo/ui';
import { useAuth } from '@/hooks/useAuth';
import { useDrive } from '@/hooks/useDrive';
import { api } from '@/lib/api';
import type { DriveItem } from '@/lib/drive-types';
import {
  CreateFolderModal,
  DeleteModal,
  PreviewModal,
  RenameModal,
  ShortcutModal,
} from '@/components/drive/drive-modals';
import { DriveTable } from '@/components/drive/drive-table';
import { DriveToastStack } from '@/components/drive/drive-toast';
import { Search, Loader2 } from 'lucide-react';

function selectionFromItem(item: DriveItem | null) {
  if (!item) return null;
  return {
    itemId: item.type === 'folder' ? (item.folderId ?? item.id) : (item.pointerId ?? item.id),
    itemType: item.type,
  };
}

export function StarredPage() {
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const drive = useDrive();
  const navigate = useNavigate();

  const {
    filebase,
    starredFolderIds,
    sortKey,
    sortDirection,
    loading: driveLoading,
    selected,
    renameTarget,
    deleteTarget,
    shortcutSource,
    previewFileUrl,
    uploadBusy,
    actionBusy,
    setSelected,
    toggleSort,
    onCreateFolder,
    onUpload,
    onRename,
    onDelete,
    onCreateShortcut,
    onMove,
    openRenameModal,
    openDeleteModal,
    openShortcutModal,
    openPreview,
    openFilePreview,
    onToggleStar,
    formatDate,
  } = drive;

  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [starredItems, setStarredItems] = useState<DriveItem[]>([]);
  const [loadingStars, setLoadingStars] = useState(true);

  const handleSearch = () => {
    alert(`Search for: ${searchQuery}`);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isAuthenticated && user && !filebase) {
      void drive.bootstrapDrive(user.name);
    }
  }, [isAuthenticated, user?.name, !!filebase]);

  useEffect(() => {
    async function fetchStarred() {
      if (!filebase) return;
      setLoadingStars(true);
      try {
        const stars = await api.stars.list(filebase.id);
        const items: DriveItem[] = stars.map(s => ({
          id: s.id, // Or use folderId? Wait, the table uses folderId for folders
          type: 'folder',
          name: s.folderName,
          updatedAt: s.createdAt, // We can use star's createdAt or folder's updated_at
          folderId: s.folderId,
        }));
        setStarredItems(items);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingStars(false);
      }
    }
    void fetchStarred();
  }, [filebase, starredFolderIds]); // Re-fetch when starred folders change

  const visibleItems = useMemo(() => {
    const value = searchQuery.trim().toLowerCase();
    const filtered = value
      ? starredItems.filter((item) => item.name.toLowerCase().includes(value))
      : starredItems;
    
    return [...filtered].sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      if (sortKey === 'name') {
        return a.name.localeCompare(b.name);
      }
      return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
    })[sortDirection === 'desc' ? 'reverse' : 'slice']();
  }, [starredItems, searchQuery, sortKey, sortDirection]);

  const selectedName = useMemo(() => {
    if (!selected) return '';
    const found = visibleItems.find(
      (item) =>
        item.id === selected.itemId ||
        item.pointerId === selected.itemId ||
        item.folderId === selected.itemId
    );
    return found?.name ?? '';
  }, [selected, visibleItems]);

  const renameTargetName = useMemo(() => {
    if (!renameTarget) return '';
    const found = visibleItems.find(
      (item) =>
        item.id === renameTarget.itemId ||
        item.pointerId === renameTarget.itemId ||
        item.folderId === renameTarget.itemId
    );
    return found?.name ?? '';
  }, [renameTarget, visibleItems]);

  const deleteTargetName = useMemo(() => {
    if (!deleteTarget) return '';
    const found = visibleItems.find(
      (item) =>
        item.id === deleteTarget.itemId ||
        item.pointerId === deleteTarget.itemId ||
        item.folderId === deleteTarget.itemId
    );
    return found?.name ?? '';
  }, [deleteTarget, visibleItems]);

  const shortcutTargetName = useMemo(() => {
    if (!shortcutSource) return '';
    const found = visibleItems.find(
      (item) =>
        item.id === shortcutSource.itemId ||
        item.pointerId === shortcutSource.itemId ||
        item.folderId === shortcutSource.itemId
    );
    return found?.name ?? '';
  }, [shortcutSource, visibleItems]);

  if (authLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-slate-500 bg-slate-50">
        Checking session...
      </div>
    );
  }
  if (!isAuthenticated || !user) {
    return <Navigate to="/auth/login" replace />;
  }

  return (
    <div className="flex h-dvh flex-col bg-slate-50 overflow-hidden">
      <DriveToastStack />

      <header className="relative z-50 shrink-0 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="flex h-16 w-full items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold">
              D
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Drive</p>
              <p className="text-xs text-slate-500">{filebase?.name ?? 'Connecting...'}</p>
            </div>
          </div>

          <div className="relative flex items-center gap-4" ref={userDropdownRef}>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 font-semibold text-sky-700 hover:bg-sky-200"
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            >
              {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
            </button>
            {userDropdownOpen && (
              <div className="absolute right-0 top-12 z-50 w-48 rounded-md border border-slate-200 bg-white p-2 shadow-lg">
                <div className="mb-2 px-2 pb-2 border-b border-slate-100">
                  <p className="text-sm font-medium text-slate-800">{user.name || 'User'}</p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                </div>
                <button
                  type="button"
                  className="w-full rounded px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100"
                  onClick={logout}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 w-full flex-col md:flex-row gap-2 sm:gap-6 p-4 sm:px-6 lg:px-8 overflow-hidden bg-slate-50">
        <aside className="flex flex-col w-full md:w-64 shrink-0 bg-transparent py-3 h-full overflow-y-auto">
          <div className="mb-3 space-y-2">
            <Button
              type="button"
              className="w-full"
              onClick={() => setCreateFolderOpen(true)}
              disabled={actionBusy}
            >
              New folder
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadBusy || actionBusy}
            >
              {uploadBusy ? 'Uploading...' : 'Upload file'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                void onUpload(file);
                event.target.value = '';
              }}
            />
          </div>

          <nav className="flex-1 space-y-1 text-sm pt-4">
            <Link
              to="/drive"
              className="block w-full rounded-lg px-3 py-2 text-left text-slate-600 hover:bg-slate-100"
            >
              My Drive
            </Link>
            <Link
              to="/starred"
              className="block w-full rounded-lg bg-sky-50 px-3 py-2 text-left text-sky-700"
            >
              Starred
            </Link>
            <button
              type="button"
              className="w-full rounded-lg px-3 py-2 text-left text-slate-600 hover:bg-slate-100"
            >
              Trash
            </button>
          </nav>
          <div className="mt-auto pt-4 border-t border-slate-100">
            <Link
              to="/settings"
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100"
            >
              Settings
            </Link>
          </div>
        </aside>

        <main className="flex-1 h-full overflow-hidden flex flex-col py-3">
          <div className="mb-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1 text-sm">
                <span className="font-semibold text-slate-800 text-lg">Starred</span>
              </div>
            </div>

            <div className="relative flex w-full gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute inset-y-0 left-0 ml-3 flex items-center h-full w-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search starred items..."
                  className="w-full pl-10"
                />
              </div>
              <Button
                type="button"
                onClick={handleSearch}
                disabled={actionBusy}
                className="shrink-0"
              >
                Search
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {loadingStars || (!filebase && driveLoading) ? (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
                Loading starred items...
              </div>
            ) : visibleItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">
                No starred items yet.
              </div>
            ) : (
              <DriveTable
                items={visibleItems}
                selectedId={selected?.itemId ?? null}
                onSelect={(item) => setSelected(selectionFromItem(item))}
                onOpen={(item) => {
                  if (!filebase || item.type !== 'folder') return;
                  // Navigate to drive and load folder? Wait, DriveTable can just redirect to /drive with the folder selected.
                  // For now, we can manually change current folder and navigate to /drive.
                  drive.loadFolder(filebase.id, (item.folderId ?? item.id) as string).then(() => {
                    navigate('/drive');
                  });
                }}
                onPreview={(item) => {
                  if (item.type !== 'file') return;
                  void openFilePreview(item.pointerId as string);
                }}
                onRename={(item) => openRenameModal(selectionFromItem(item))}
                onDelete={(item) => openDeleteModal(selectionFromItem(item))}
                onShortcut={(item) => openShortcutModal(selectionFromItem(item))}
                onDropMove={(dragged, targetFolder) => {
                  if (!targetFolder.folderId) return;
                  const draggedSelection = selectionFromItem(dragged);
                  if (!draggedSelection) return;
                  void onMove(
                    draggedSelection.itemType,
                    draggedSelection.itemId,
                    targetFolder.folderId
                  );
                }}
                onToggleStar={(item) => {
                  if (item.type !== 'folder') return;
                  const folderId = item.folderId ?? item.id;
                  void onToggleStar(folderId);
                }}
                formatDate={formatDate}
                actionBusy={actionBusy}
                starredFolderIds={starredFolderIds}
                sortKey={sortKey}
                sortDirection={sortDirection}
                onSort={toggleSort}
              />
            )}
          </div>
        </main>
      </div>

      <CreateFolderModal
        open={createFolderOpen}
        busy={actionBusy}
        onClose={() => setCreateFolderOpen(false)}
        onCreate={(name) => {
          void onCreateFolder(name);
          setCreateFolderOpen(false);
        }}
      />

      <RenameModal
        open={Boolean(renameTarget)}
        itemName={renameTargetName}
        busy={actionBusy}
        onClose={() => openRenameModal(null)}
        onSubmit={(name) => void onRename(name)}
      />

      <DeleteModal
        open={Boolean(deleteTarget)}
        itemName={deleteTargetName}
        busy={actionBusy}
        onClose={() => openDeleteModal(null)}
        onConfirm={() => void onDelete()}
      />

      <ShortcutModal
        open={Boolean(shortcutSource)}
        busy={actionBusy}
        folders={[]}
        defaultName={shortcutTargetName}
        onClose={() => openShortcutModal(null)}
        onCreate={(targetFolderId, name) => void onCreateShortcut(targetFolderId, name)}
      />

      <PreviewModal url={previewFileUrl} onClose={() => openPreview(null)} />
    </div>
  );
}
