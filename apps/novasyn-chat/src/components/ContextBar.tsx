import { useState } from 'react';
import type { FolderItem } from '../lib/types';

interface Props {
  selectedFolderItems: string[];
  folderItemsMap: Record<string, FolderItem>;
  onRemove: (id: string) => void;
}

function itemIcon(sourceType: string | null | undefined): string {
  if (sourceType === 'chat') return '💬';
  if (sourceType === 'file') return '📄';
  return '📝';
}

function itemLabel(item: FolderItem): string {
  if (item.filename) return item.filename;
  if (item.itemType && item.itemType !== 'document') return item.itemType;
  return 'untitled';
}

function PreviewModal({ item, onClose }: { item: FolderItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-800 border border-slate-600 rounded-xl w-[680px] max-h-[80vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base">{itemIcon(item.sourceType)}</span>
            <span className="text-sm font-medium text-white truncate">{itemLabel(item)}</span>
            <span className="text-xs text-gray-500 flex-shrink-0">{item.tokens} tokens</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none transition ml-4 flex-shrink-0">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap leading-relaxed break-words">{item.content}</pre>
        </div>
      </div>
    </div>
  );
}

export function ContextBar({ selectedFolderItems, folderItemsMap, onRemove }: Props) {
  const [previewItem, setPreviewItem] = useState<FolderItem | null>(null);

  if (selectedFolderItems.length === 0) return null;
  const knownItems = selectedFolderItems.filter((id) => folderItemsMap[id]);
  if (knownItems.length === 0) return null;

  return (
    <>
      <div className="mx-4 mb-1 px-3 py-1.5 bg-slate-800/60 border border-slate-700 rounded-lg flex items-center gap-1.5 flex-wrap">
        <span className="text-xs text-gray-500 flex-shrink-0">Context:</span>
        {knownItems.map((id) => {
          const item = folderItemsMap[id];
          return (
            <span key={id} className="inline-flex items-center gap-1 bg-blue-900/50 border border-blue-700/50 text-blue-300 text-xs px-2 py-0.5 rounded-full">
              <span>{itemIcon(item.sourceType)}</span>
              <button onClick={() => setPreviewItem(item)} className="max-w-[160px] truncate hover:text-white transition" title="Click to preview content">
                {itemLabel(item)}
              </button>
              <button onClick={() => onRemove(id)} className="text-blue-400 hover:text-white ml-0.5 leading-none transition" title="Remove from context">×</button>
            </span>
          );
        })}
      </div>
      {previewItem && <PreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />}
    </>
  );
}
