import { useEffect, useState, type ReactNode } from 'react';
import { Button, Input, Label } from '@repo/ui';
import type { DriveItem } from '@/lib/drive-types';

type ModalProps = {
  title: string;
  children: ReactNode;
  onClose: () => void;
};

function Modal({ title, children, onClose }: ModalProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/35 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

type RenameModalProps = {
  open: boolean;
  itemName: string;
  busy: boolean;
  onSubmit: (name: string) => void;
  onClose: () => void;
};

export function RenameModal({ open, itemName, busy, onSubmit, onClose }: RenameModalProps) {
  const [name, setName] = useState(itemName);

  useEffect(() => {
    setName(itemName);
  }, [itemName]);

  if (!open) return null;

  return (
    <Modal title="Rename" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim()) return;
          onSubmit(name.trim());
        }}
      >
        <div className="space-y-1">
          <Label htmlFor="rename">New name</Label>
          <Input id="rename" value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy || !name.trim()}>
            {busy ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

type DeleteModalProps = {
  open: boolean;
  itemName: string;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function DeleteModal({ open, itemName, busy, onConfirm, onClose }: DeleteModalProps) {
  if (!open) return null;

  return (
    <Modal title="Confirm delete" onClose={onClose}>
      <p className="text-sm text-slate-600">
        Delete `{itemName}` permanently? This cannot be undone.
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button type="button" variant="destructive" onClick={onConfirm} disabled={busy}>
          {busy ? 'Deleting...' : 'Delete'}
        </Button>
      </div>
    </Modal>
  );
}

type ShortcutModalProps = {
  open: boolean;
  busy: boolean;
  folders: DriveItem[];
  defaultName: string;
  onCreate: (targetFolderId: string, name: string) => void;
  onClose: () => void;
};

export function ShortcutModal({
  open,
  busy,
  folders,
  defaultName,
  onCreate,
  onClose,
}: ShortcutModalProps) {
  const [name, setName] = useState(defaultName);
  const [targetFolderId, setTargetFolderId] = useState('');

  useEffect(() => {
    setName(defaultName);
    const firstFolder = folders.find((item) => item.type === 'folder');
    setTargetFolderId(firstFolder?.id ?? '');
  }, [defaultName, folders]);

  if (!open) return null;

  return (
    <Modal title="Create shortcut" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!targetFolderId || !name.trim()) return;
          onCreate(targetFolderId, name.trim());
        }}
      >
        <div className="space-y-1">
          <Label htmlFor="shortcut-name">Shortcut name</Label>
          <Input
            id="shortcut-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="shortcut-folder">Target folder</Label>
          <select
            id="shortcut-folder"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={targetFolderId}
            onChange={(event) => setTargetFolderId(event.target.value)}
          >
            {folders
              .filter((item) => item.type === 'folder')
              .map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy || !targetFolderId || !name.trim()}>
            {busy ? 'Creating...' : 'Create shortcut'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

type PreviewModalProps = {
  url: string | null;
  onClose: () => void;
};

export function PreviewModal({ url, onClose }: PreviewModalProps) {
  if (!url) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
      <div className="h-[85vh] w-[92vw] max-w-5xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2">
          <h3 className="text-sm font-semibold text-slate-700">File preview</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
          >
            Close
          </button>
        </div>
        <iframe title="preview" src={url} className="h-full w-full" />
      </div>
    </div>
  );
}

type CreateFolderModalProps = {
  open: boolean;
  busy: boolean;
  onCreate: (name: string) => void;
  onClose: () => void;
};

export function CreateFolderModal({ open, busy, onCreate, onClose }: CreateFolderModalProps) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (open) {
      setName('');
    }
  }, [open]);

  if (!open) return null;

  return (
    <Modal title="New folder" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim()) return;
          onCreate(name.trim());
        }}
      >
        <div className="space-y-1">
          <Label htmlFor="folder-name">Folder name</Label>
          <Input id="folder-name" value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy || !name.trim()}>
            {busy ? 'Creating...' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
