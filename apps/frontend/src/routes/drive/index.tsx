import { useEffect, useMemo, useRef, useState } from 'react';
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

function selectionFromItem(item: DriveItem | null) {
  if (!item) return null;
  return {
    itemId: item.type === 'folder' ? (item.folderId ?? item.id) : (item.pointerId ?? item.id),
    itemType: item.type,
  };
}

export function DrivePage() {
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const {
    filebase,
    currentFolder,
    breadcrumb,
    folders,
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
    setSelected,
    toggleSort,
    bootstrapDrive,
    loadFolder,
    onCreateFolder,
    onUpload,
    onRename,
    onDelete,
    onCreateShortcut,
    onMove,
    onRenameDrive,
    onDeleteDrive,
    openRenameModal,
    openDeleteModal,
    openShortcutModal,
    openPreview,
    setRenameDriveOpen,
    openFilePreview,
    formatDate,
  } = useDrive();

  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [driveMenuOpen, setDriveMenuOpen] = useState(false);
  const [deleteDriveConfirmOpen, setDeleteDriveConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    if (filebase) return;
    void bootstrapDrive(user.name);
  }, [isAuthenticated, user, filebase, bootstrapDrive]);

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

  if (authLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-slate-500">
        Checking session...
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/auth/login" replace />;
  }

  return (
    <div className="min-h-dvh bg-slate-50">
      <DriveToastStack />

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-full bg-primary/15 text-center text-lg leading-8 text-primary">
              D
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Drive</p>
              <p className="text-xs text-slate-500">{filebase?.name ?? 'Loading drive...'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-slate-500 md:block">{user.email}</span>
            <Button type="button" variant="outline" onClick={logout}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-4 px-4 py-4 md:grid-cols-[240px_1fr]">
        <aside className="rounded-xl border border-slate-200 bg-white p-3">
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

          <nav className="space-y-1 text-sm">
            <button
              type="button"
              className="w-full rounded-lg bg-sky-50 px-3 py-2 text-left text-sky-700"
            >
              My Drive
            </button>

            <button
              type="button"
              className="w-full rounded-lg px-3 py-2 text-left text-slate-600 hover:bg-slate-100"
              onClick={() => setDriveMenuOpen((open) => !open)}
            >
              Drive settings
            </button>

            {driveMenuOpen && (
              <div className="space-y-1 rounded-md border border-slate-200 bg-slate-50 p-2">
                <button
                  type="button"
                  className="w-full rounded px-2 py-1 text-left text-xs text-slate-700 hover:bg-white"
                  onClick={() => setRenameDriveOpen(true)}
                >
                  Rename drive
                </button>
                <button
                  type="button"
                  className="w-full rounded px-2 py-1 text-left text-xs text-rose-600 hover:bg-rose-50"
                  onClick={() => setDeleteDriveConfirmOpen(true)}
                >
                  Delete drive
                </button>
              </div>
            )}

            <button
              type="button"
              className="w-full rounded-lg px-3 py-2 text-left text-slate-600 hover:bg-slate-100"
            >
              Starred
            </button>
            <button
              type="button"
              className="w-full rounded-lg px-3 py-2 text-left text-slate-600 hover:bg-slate-100"
            >
              Shared with me
            </button>
            <button
              type="button"
              className="w-full rounded-lg px-3 py-2 text-left text-slate-600 hover:bg-slate-100"
            >
              Trash
            </button>
          </nav>
        </aside>

        <main className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1 text-sm">
                {breadcrumb.map((folder, index) => (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => filebase && void loadFolder(filebase.id, folder.id)}
                    className={`rounded px-2 py-1 ${
                      index === breadcrumb.length - 1
                        ? 'bg-sky-100 text-sky-700'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {folder.name === 'root' ? 'My Drive' : folder.name}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={actionBusy}
                  onClick={() => toggleSort('name')}
                >
                  Name {sortKey === 'name' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={actionBusy}
                  onClick={() => toggleSort('date')}
                >
                  Date {sortKey === 'date' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                </Button>
              </div>
            </div>

            <Input
              value=""
              readOnly
              placeholder="Search is coming next sprint"
              className="max-w-md"
            />
          </div>

          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
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
                if (!filebase || item.type !== 'folder' || !item.folderId) return;
                void loadFolder(filebase.id, item.folderId);
              }}
              onPreview={(item) => {
                if (item.type !== 'file' || !item.pointerId) return;
                void openFilePreview(item.pointerId);
              }}
              onRename={(item) => openRenameModal(selectionFromItem(item))}
              onDelete={(item) => openDeleteModal(selectionFromItem(item))}
              onShortcut={(item) => {
                if (item.type !== 'file') return;
                openShortcutModal(selectionFromItem(item));
              }}
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
              formatDate={formatDate}
              actionBusy={actionBusy}
            />
          )}
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
        itemName={selectedName}
        busy={actionBusy}
        onClose={() => openRenameModal(null)}
        onSubmit={(name) => void onRename(name)}
      />

      <DeleteModal
        open={Boolean(deleteTarget)}
        itemName={selectedName}
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
        defaultName={selectedName}
        onClose={() => openShortcutModal(null)}
        onCreate={(targetFolderId, name) => void onCreateShortcut(targetFolderId, name)}
      />

      <RenameModal
        open={renameDriveOpen}
        itemName={filebase?.name ?? ''}
        busy={actionBusy}
        onClose={() => setRenameDriveOpen(false)}
        onSubmit={(name) => void onRenameDrive(name)}
      />

      <DeleteModal
        open={deleteDriveConfirmOpen}
        itemName={filebase?.name ?? 'drive'}
        busy={actionBusy}
        onClose={() => setDeleteDriveConfirmOpen(false)}
        onConfirm={() => {
          void onDeleteDrive(user.name);
          setDeleteDriveConfirmOpen(false);
        }}
      />

      <PreviewModal url={previewFileUrl} onClose={() => openPreview(null)} />

      {currentFolder && (
        <div className="fixed bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs text-sky-700">
          Current: {currentFolder.name === 'root' ? 'My Drive' : currentFolder.name}
        </div>
      )}
    </div>
  );
}
