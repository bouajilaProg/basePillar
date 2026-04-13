import type { DriveItem } from '@/lib/drive-types';

type DriveTableProps = {
  items: DriveItem[];
  selectedId: string | null;
  onSelect: (item: DriveItem | null) => void;
  onOpen: (item: DriveItem) => void;
  onPreview: (item: DriveItem) => void;
  onRename: (item: DriveItem) => void;
  onDelete: (item: DriveItem) => void;
  onShortcut: (item: DriveItem) => void;
  onDropMove: (dragged: DriveItem, targetFolder: DriveItem) => void;
  formatDate: (value: string) => string;
  actionBusy: boolean;
};

function iconFor(item: DriveItem): string {
  if (item.type === 'folder') return '📁';
  if (item.isShortcut) return '🔗';
  return '📄';
}

export function DriveTable({
  items,
  selectedId,
  onSelect,
  onOpen,
  onPreview,
  onRename,
  onDelete,
  onShortcut,
  onDropMove,
  formatDate,
  actionBusy,
}: DriveTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Modified</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const selected = selectedId === item.id;
            return (
              <tr
                key={item.id}
                className={`border-t border-slate-100 ${selected ? 'bg-sky-50/60' : 'hover:bg-slate-50'}`}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData('application/json', JSON.stringify(item));
                }}
                onDragOver={(event) => {
                  if (item.type === 'folder') {
                    event.preventDefault();
                  }
                }}
                onDrop={(event) => {
                  if (item.type !== 'folder') return;
                  event.preventDefault();
                  try {
                    const dragged = JSON.parse(
                      event.dataTransfer.getData('application/json')
                    ) as DriveItem;
                    if (dragged.id === item.id) return;
                    onDropMove(dragged, item);
                  } catch {
                    return;
                  }
                }}
                onClick={() => onSelect(item)}
                onDoubleClick={() => {
                  if (item.type === 'folder') {
                    onOpen(item);
                  } else {
                    onPreview(item);
                  }
                }}
              >
                <td className="px-4 py-3 text-slate-700">
                  <span className="mr-2">{iconFor(item)}</span>
                  <span className="font-medium">{item.name}</span>
                  {item.isShortcut && (
                    <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] uppercase text-sky-700">
                      shortcut
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {item.type === 'folder' ? 'Folder' : 'File'}
                </td>
                <td className="px-4 py-3 text-slate-500">{formatDate(item.updatedAt)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {item.type === 'file' && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onPreview(item);
                        }}
                        disabled={actionBusy}
                        className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                      >
                        Preview
                      </button>
                    )}
                    {item.type === 'file' && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onShortcut(item);
                        }}
                        disabled={actionBusy}
                        className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                      >
                        Shortcut
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onRename(item);
                      }}
                      disabled={actionBusy}
                      className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDelete(item);
                      }}
                      disabled={actionBusy}
                      className="rounded px-2 py-1 text-xs text-rose-500 hover:bg-rose-50"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
