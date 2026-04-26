import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Navigate } from 'react-router';
import { Button, Input } from '@repo/ui';
import { useAuth } from '@/hooks/useAuth';
import { useDrive } from '@/hooks/useDrive';
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

// Keep your original helper function
function selectionFromItem(item: DriveItem | null) {
  if (!item) return null;
  return {
    itemId: item.type === 'folder' ? (item.folderId ?? item.id) : (item.pointerId ?? item.id),
    itemType: item.type,
  };
}

export function DrivePage() {
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const drive = useDrive();

  // Extract drive properties for easier access (keeps your original naming)
  const {
    filebase, currentFolder, breadcrumb, folders, visibleItems,
    sortKey, sortDirection, loading, selected, renameTarget,
    deleteTarget, shortcutSource, previewFileUrl, uploadBusy,
    actionBusy, setSelected, toggleSort, loadFolder,
    onCreateFolder, onUpload, onRename, onDelete,
    onCreateShortcut, onMove, openRenameModal, openDeleteModal,
    openShortcutModal, openPreview, openFilePreview, formatDate
  } = drive;

  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Search handler you had originally
  const handleSearch = () => {
    alert(`Search for: ${searchQuery}`);
  };

  // Dropdown Click-Outside logic
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * STABILIZED BOOTSTRAP
   * Using user?.id or user?.name as the trigger to prevent infinite loops 
   * if the user object reference changes slightly.
   */
  useEffect(() => {
    if (isAuthenticated && user && !filebase) {
      void drive.bootstrapDrive(user.name);
    }
  }, [isAuthenticated, user?.name, !!filebase]);

  // All your original name lookup memos
  const selectedName = useMemo(() => {
    if (!selected) return '';
    const found = visibleItems.find(item =>
      item.id === selected.itemId || item.pointerId === selected.itemId || item.folderId === selected.itemId
    );
    return found?.name ?? '';
  }, [selected, visibleItems]);

  const renameTargetName = useMemo(() => {
    if (!renameTarget) return '';
    const found = visibleItems.find(item =>
      item.id === renameTarget.itemId || item.pointerId === renameTarget.itemId || item.folderId === renameTarget.itemId
    );
    return found?.name ?? '';
  }, [renameTarget, visibleItems]);

  const deleteTargetName = useMemo(() => {
    if (!deleteTarget) return '';
    const found = visibleItems.find(item =>
      item.id === deleteTarget.itemId || item.pointerId === deleteTarget.itemId || item.folderId === deleteTarget.itemId
    );
    return found?.name ?? '';
  }, [deleteTarget, visibleItems]);

  const shortcutTargetName = useMemo(() => {
    if (!shortcutSource) return '';
    const found = visibleItems.find(item =>
      item.id === shortcutSource.itemId || item.pointerId === shortcutSource.itemId || item.folderId === shortcutSource.itemId
    );
    return found?.name ?? '';
  }, [shortcutSource, visibleItems]);

  // Auth Guard
  if (authLoading) {
    return <div className="flex min-h-dvh items-center justify-center text-slate-500 bg-slate-50">Checking session...</div>;
  }
  if (!isAuthenticated || !user) {
    return <Navigate to="/auth/login" replace />;
  }

  return (
    <div className="flex h-dvh flex-col bg-slate-50 overflow-hidden">
      <DriveToastStack />

      {/* HEADER */}
      <header className="relative z-50 shrink-0 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="flex h-16 w-full items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold">D</div>
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
                <button type="button" className="w-full rounded px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100" onClick={logout}>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 w-full flex-col md:flex-row gap-2 sm:gap-6 p-4 sm:px-6 lg:px-8 overflow-hidden bg-slate-50">
        {/* ASIDE */}
        <aside className="flex flex-col w-full md:w-64 shrink-0 bg-transparent py-3 h-full overflow-y-auto">
          <div className="mb-3 space-y-2">
            <Button type="button" className="w-full" onClick={() => setCreateFolderOpen(true)} disabled={actionBusy}>
              New folder
            </Button>
            <Button type="button" variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()} disabled={uploadBusy || actionBusy}>
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
            <button type="button" className="w-full rounded-lg bg-sky-50 px-3 py-2 text-left text-sky-700">My Drive</button>
            <button type="button" className="w-full rounded-lg px-3 py-2 text-left text-slate-600 hover:bg-slate-100">Starred</button>
            <button type="button" className="w-full rounded-lg px-3 py-2 text-left text-slate-600 hover:bg-slate-100">Trash</button>
          </nav>
          <div className="mt-auto pt-4 border-t border-slate-100">
            <a href="/settings" className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100">Settings</a>
          </div>
        </aside>

        {/* MAIN */}
        <main className="flex-1 h-full overflow-hidden flex flex-col py-3">
          {/* Always show Search & Breadcrumbs to avoid layout flicker */}
          <div className="mb-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1 text-sm">
                {breadcrumb.map((folder, index) => (
                  <React.Fragment key={folder.id}>
                    {index > 0 && <span className="text-slate-400">/</span>}
                    <button
                      type="button"
                      onClick={() => filebase && void loadFolder(filebase.id, folder.id)}
                      className={`px-1 py-0.5 border-b-2 transition-colors ${index === breadcrumb.length - 1 ? 'border-sky-500 text-sky-700' : 'border-transparent text-slate-600 hover:border-slate-300'
                        }`}
                    >
                      {folder.name === 'root' ? 'My Drive' : folder.name}
                    </button>
                  </React.Fragment>
                ))}
              </div>
            </div>

            <div className="relative flex w-full gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute inset-y-0 left-0 ml-3 flex items-center h-full w-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search drive..."
                  className="w-full pl-10"
                />
              </div>
              <Button type="button" onClick={handleSearch} disabled={actionBusy} className="shrink-0">
                Search
              </Button>
            </div>
          </div>

          {/* Table Area Loading Logic */}
          <div className="flex-1 overflow-auto">
            {loading && !filebase ? (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
                Loading folder...
              </div>
            ) : visibleItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">
                Empty folder. Upload a file or create a folder.
              </div>
            ) : (
              <DriveTable
                items={visibleItems}
                selectedId={selected?.itemId ?? null}
                onSelect={(item) => setSelected(selectionFromItem(item))}
                onOpen={(item) => {
                  if (!filebase || item.type !== 'folder') return;
                  void loadFolder(filebase.id, (item.folderId ?? item.id) as string);
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
                  void onMove(draggedSelection.itemType, draggedSelection.itemId, targetFolder.folderId);
                }}
                formatDate={formatDate}
                actionBusy={actionBusy}
                sortKey={sortKey}
                sortDirection={sortDirection}
                onSort={toggleSort}
              />
            )}
          </div>
        </main>
      </div>

      {/* MODALS - Re-linked with your original Name Memos */}
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
        folders={folders.map((folder) => ({
          id: folder.id,
          type: 'folder',
          name: folder.name,
          updatedAt: folder.updatedAt,
          folderId: folder.id,
        }))}
        defaultName={shortcutTargetName}
        onClose={() => openShortcutModal(null)}
        onCreate={(targetFolderId, name) => void onCreateShortcut(targetFolderId, name)}
      />

      <PreviewModal url={previewFileUrl} onClose={() => openPreview(null)} />
    </div>
  );
}
