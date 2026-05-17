import { useEffect, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { useAppStore } from '../store/appStore';
import type { FolderItem, Folder } from '../lib/types';

interface Props {
  folder: Folder;
  onClose: () => void;
  onChanged: () => void;
}

function fmtTokens(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function sourceLabel(item: FolderItem) {
  if (item.filename) return item.filename;
  if (item.sourceType === 'epub') return 'EPUB';
  if (item.sourceType === 'markdown') return 'Markdown';
  if (item.itemType === 'ai-response') return 'AI response';
  if (item.itemType === 'chat-export') return 'Chat export';
  return item.itemType ?? 'text';
}

export function FolderContentModal({ folder, onClose, onChanged }: Props) {
  const folders = useAppStore((s) => s.folders);
  const [items, setItems] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [movingId, setMovingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await invoke<FolderItem[]>('list_folder_items_by_folder', { folderId: folder.id });
      setItems(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [folder.id]);

  useEffect(() => { loadItems(); }, [loadItems]);

  async function handleUpload() {
    setUploadError(null);
    try {
      const selected = await openDialog({
        multiple: false,
        filters: [{ name: 'Documents', extensions: ['txt', 'md', 'markdown', 'epub', 'rst', 'csv'] }],
      });
      if (!selected) return;
      setUploading(true);
      await invoke('upload_file_to_folder', { folderId: folder.id, filePath: selected });
      await loadItems();
      onChanged();
    } catch (e) { setUploadError(String(e)); }
    finally { setUploading(false); }
  }

  async function handleSaveEdit(item: FolderItem) {
    await invoke('update_folder_item', { id: item.id, input: { content: editDraft, tokens: Math.ceil(editDraft.length / 4) } });
    setEditingId(null);
    await loadItems();
    onChanged();
  }

  async function handleDelete(id: string) {
    await invoke('delete_folder_item', { id });
    setConfirmDeleteId(null);
    await loadItems();
    onChanged();
  }

  async function handleMove(id: string, targetFolderId: string) {
    await invoke('move_folder_item', { id, targetFolderId });
    setMovingId(null);
    await loadItems();
    onChanged();
  }

  const otherFolders = folders.filter((f) => f.id !== folder.id);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div
        className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div>
            <h2 className="text-sm font-semibold text-white">{folder.name}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{items.length} items · {fmtTokens(folder.totalTokens ?? 0)} tokens</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition disabled:opacity-50"
            >
              {uploading ? 'Uploading…' : '+ Upload file'}
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-lg leading-none transition">×</button>
          </div>
        </div>

        {uploadError && (
          <div className="mx-5 mt-3 px-3 py-2 bg-red-900/30 border border-red-700/40 rounded-lg text-xs text-red-300">
            {uploadError}
          </div>
        )}

        {/* Item list */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {loading && <p className="text-xs text-gray-500 text-center py-8">Loading…</p>}
          {!loading && items.length === 0 && (
            <div className="text-center py-12">
              <p className="text-sm text-gray-500 mb-1">No items in this folder yet.</p>
              <p className="text-xs text-gray-600">Upload a file or save content from the chat.</p>
            </div>
          )}
          {items.map((item) => (
            <div key={item.id} className="bg-slate-900/50 border border-slate-700 rounded-xl p-4">
              {editingId === item.id ? (
                <div>
                  <textarea
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    rows={8}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500 resize-none"
                  />
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => handleSaveEdit(item)} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition">Save</button>
                    <button onClick={() => setEditingId(null)} className="text-xs text-gray-400 hover:text-white bg-slate-700 px-3 py-1 rounded transition">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-blue-400 bg-blue-900/30 px-1.5 py-0.5 rounded flex-shrink-0">{sourceLabel(item)}</span>
                      <span className="text-xs text-gray-600 flex-shrink-0">{fmtTokens(item.tokens)} tokens</span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => { setEditingId(item.id); setEditDraft(item.content); }} className="text-xs text-gray-500 hover:text-white bg-slate-700 hover:bg-slate-600 px-2 py-0.5 rounded transition">Edit</button>
                      {otherFolders.length > 0 && (
                        <div className="relative">
                          <button
                            onClick={() => setMovingId(movingId === item.id ? null : item.id)}
                            className="text-xs text-gray-500 hover:text-white bg-slate-700 hover:bg-slate-600 px-2 py-0.5 rounded transition"
                          >Move</button>
                          {movingId === item.id && (
                            <div className="absolute right-0 top-full mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-xl z-10 min-w-[160px] py-1">
                              {otherFolders.map((f) => (
                                <button key={f.id} onClick={() => handleMove(item.id, f.id)} className="w-full text-left px-3 py-1.5 text-xs text-blue-300 hover:bg-slate-600 transition truncate">{f.name}</button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      <button onClick={() => setConfirmDeleteId(item.id)} className="text-xs text-gray-500 hover:text-red-400 bg-slate-700 hover:bg-slate-600 px-2 py-0.5 rounded transition">Delete</button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed line-clamp-3 font-mono whitespace-pre-wrap break-words">
                    {item.content.slice(0, 400)}{item.content.length > 400 ? '…' : ''}
                  </p>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Confirm delete overlay */}
        {confirmDeleteId && (
          <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center z-10">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-2xl w-72">
              <h3 className="text-sm font-semibold text-white mb-2">Delete item?</h3>
              <p className="text-xs text-gray-400 mb-4">This cannot be undone.</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-gray-400 bg-slate-700 hover:text-white px-3 py-1.5 rounded transition">Cancel</button>
                <button onClick={() => handleDelete(confirmDeleteId)} className="text-xs text-white bg-red-600 hover:bg-red-500 px-3 py-1.5 rounded transition">Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
