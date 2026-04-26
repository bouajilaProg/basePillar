import React, { useState, useEffect, useRef } from 'react';
import type { DriveItem } from '@/lib/drive-types';
import { 
  Folder, 
  FileText, 
  Link as LinkIcon, 
  MoreVertical, 
  Eye, 
  Edit2, 
  Trash2, 
  CornerUpRight,
  ArrowUp,
  ArrowDown,
  Star
} from 'lucide-react';

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
  sortKey: 'name' | 'date';
  sortDirection: 'asc' | 'desc';
  onSort: (key: 'name' | 'date') => void;
};

function ItemIcon({ item }: { item: DriveItem }) {
  if (item.type === 'folder') return <Folder className="h-4 w-4 text-slate-400" />;
  if (item.isShortcut) return <LinkIcon className="h-4 w-4 text-sky-500" />;
  return <FileText className="h-4 w-4 text-slate-400" />;
}

type DriveTableRowProps = {
  item: DriveItem;
  selected: boolean;
  onSelect: (item: DriveItem) => void;
  onOpen: (item: DriveItem) => void;
  onPreview: (item: DriveItem) => void;
  onRename: (item: DriveItem) => void;
  onDelete: (item: DriveItem) => void;
  onShortcut: (item: DriveItem) => void;
  onDropMove: (dragged: DriveItem, targetFolder: DriveItem) => void;
  formatDate: (value: string) => string;
  actionBusy: boolean;
  activeMenuId: string | null;
  setActiveMenuId: (id: string | null) => void;
};

function DriveTableRow({
  item,
  selected,
  onSelect,
  onOpen,
  onPreview,
  onRename,
  onDelete,
  onShortcut,
  onDropMove,
  formatDate,
  actionBusy,
  activeMenuId,
  setActiveMenuId,
}: DriveTableRowProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        if (activeMenuId === item.id) {
          setActiveMenuId(null);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeMenuId, item.id, setActiveMenuId]);

  return (
    <tr
      className={`border-b border-slate-100/60 transition-colors cursor-pointer ${
        selected ? 'bg-sky-50/60' : 'hover:bg-slate-100/40'
      }`}
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
        <div className="flex items-center group">
          <span className="mr-2"><ItemIcon item={item} /></span>
          <span className="font-medium">{item.name}</span>
          {item.isShortcut && (
            <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] uppercase text-sky-700">
              shortcut
            </span>
          )}
          {item.type === 'folder' && (
            <button
              type="button"
              className="ml-2 p-1 rounded-full text-slate-300 opacity-0 group-hover:opacity-100 hover:text-amber-400 hover:bg-slate-100 transition-all"
              onClick={(e) => {
                e.stopPropagation();
                alert('Star feature coming soon!');
              }}
              title="Star folder"
            >
              <Star className="h-4 w-4" />
            </button>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-slate-500">
        {item.type === 'folder' ? 'Folder' : 'File'}
      </td>
      <td className="px-4 py-3 text-slate-500">{formatDate(item.updatedAt)}</td>
      <td className="px-4 py-3 text-right relative">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setActiveMenuId(activeMenuId === item.id ? null : item.id);
          }}
          className="p-1 rounded hover:bg-slate-200 text-slate-500 transition-colors"
        >
          <MoreVertical className="h-4 w-4" />
        </button>

        {activeMenuId === item.id && (
          <div 
            ref={menuRef}
            className="absolute right-8 top-10 z-50 w-48 rounded-md border border-slate-200 bg-white shadow-lg py-1 text-left text-sm"
            onClick={(e) => e.stopPropagation()}
          >
            {item.type === 'file' && (
              <button
                type="button"
                disabled={actionBusy}
                onClick={(e) => {
                  e.stopPropagation();
                  onPreview(item);
                  setActiveMenuId(null);
                }}
                className="flex w-full items-center px-4 py-2 hover:bg-slate-100 text-slate-700"
              >
                <Eye className="mr-2 h-4 w-4" /> Preview
              </button>
            )}
            
            {item.type === 'folder' && (
              <button
                type="button"
                disabled={actionBusy}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen(item);
                  setActiveMenuId(null);
                }}
                className="flex w-full items-center px-4 py-2 hover:bg-slate-100 text-slate-700"
              >
                <Folder className="mr-2 h-4 w-4" /> Open
              </button>
            )}

            <button
              type="button"
              disabled={actionBusy}
              onClick={(e) => {
                e.stopPropagation();
                onRename(item);
                setActiveMenuId(null);
              }}
              className="flex w-full items-center px-4 py-2 hover:bg-slate-100 text-slate-700"
            >
              <Edit2 className="mr-2 h-4 w-4" /> Rename
            </button>
            
            <button
              type="button"
              disabled={actionBusy}
              onClick={(e) => {
                e.stopPropagation();
                onShortcut(item);
                setActiveMenuId(null);
              }}
              className="flex w-full items-center px-4 py-2 hover:bg-slate-100 text-slate-700"
            >
              <CornerUpRight className="mr-2 h-4 w-4" /> Add shortcut
            </button>

            <div className="my-1 border-t border-slate-200" />
            
            <button
              type="button"
              disabled={actionBusy}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item);
                setActiveMenuId(null);
              }}
              className="flex w-full items-center px-4 py-2 hover:bg-rose-50 text-rose-600"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </button>
          </div>
        )}
      </td>
    </tr>
  );
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
  sortKey,
  sortDirection,
  onSort,
}: DriveTableProps) {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  return (
    <div className="overflow-visible pb-20">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
            <th 
              className="px-4 py-3 cursor-pointer hover:bg-slate-100/50 transition-colors"
              onClick={() => onSort('name')}
            >
              <div className="flex items-center gap-1">
                Name
                {sortKey === 'name' && (
                  sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                )}
              </div>
            </th>
            <th className="px-4 py-3">Type</th>
            <th 
              className="px-4 py-3 cursor-pointer hover:bg-slate-100/50 transition-colors"
              onClick={() => onSort('date')}
            >
              <div className="flex items-center gap-1">
                Modified
                {sortKey === 'date' && (
                  sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                )}
              </div>
            </th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <DriveTableRow
              key={item.id}
              item={item}
              selected={selectedId === item.id}
              onSelect={onSelect}
              onOpen={onOpen}
              onPreview={onPreview}
              onRename={onRename}
              onDelete={onDelete}
              onShortcut={onShortcut}
              onDropMove={onDropMove}
              formatDate={formatDate}
              actionBusy={actionBusy}
              activeMenuId={activeMenuId}
              setActiveMenuId={setActiveMenuId}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
