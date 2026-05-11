import { useState, useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import { invoke } from '@tauri-apps/api/core';

interface Props {
  messageId?: string;
  onClose?: () => void;
  onTagged?: () => void;
}

export function TagPicker({ messageId, onClose, onTagged }: Props) {
  const tags = useAppStore((s) => s.tags);
  const chatMessages = useAppStore((s) => s.chatMessages);
  const loadTags = useAppStore((s) => s.loadTags);
  const loadChatMessages = useAppStore((s) => s.loadChatMessages);

  const targetMessage = messageId ? chatMessages.find((m) => m.id === messageId) : null;

  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#FCD34D');
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editTagName, setEditTagName] = useState('');
  const [editTagColor, setEditTagColor] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const sortedTags = useMemo(() => [...tags].sort((a, b) => a.name.localeCompare(b.name)), [tags]);

  function isTagActive(tagId: string): boolean {
    const selected = targetMessage?.selectedTags;
    if (!selected) return false;
    if (Array.isArray(selected)) return selected.includes(tagId);
    return false;
  }

  async function handleToggleTag(tagId: string) {
    if (!targetMessage) return;
    const currentTags: string[] = Array.isArray(targetMessage.selectedTags) ? targetMessage.selectedTags : [];
    const newTags = currentTags.includes(tagId)
      ? currentTags.filter((t) => t !== tagId)
      : [...currentTags, tagId];
    await invoke('update_chat_message', { id: targetMessage.id, input: { selectedTags: newTags } });
    await loadChatMessages();
    onTagged?.();
  }

  async function handleCreateTag() {
    const name = newTagName.trim();
    if (!name) return;
    await invoke('create_tag', { input: { name, color: newTagColor, userId: 'default-user' } });
    await loadTags();
    setNewTagName('');
    setNewTagColor('#FCD34D');
  }

  async function handleSaveTagEdit(tagId: string) {
    const name = editTagName.trim();
    if (!name) return;
    await invoke('update_tag', { id: tagId, input: { name, color: editTagColor } });
    await loadTags();
    setEditingTagId(null);
  }

  async function handleDeleteTag(tagId: string) {
    await invoke('delete_tag', { id: tagId });
    await loadTags();
    setConfirmDeleteId(null);
    onTagged?.();
  }

  const title = messageId ? 'Tag Message' : 'Manage Tags';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-2xl w-[28rem] max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700">
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-sm">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {sortedTags.length === 0 && (
            <p className="text-xs text-gray-500 py-4 text-center">No tags yet. Create one below.</p>
          )}
          <div className="space-y-0.5">
            {sortedTags.map((tag) => {
              const active = isTagActive(tag.id);
              const isEditing = editingTagId === tag.id;

              if (isEditing) {
                return (
                  <div key={tag.id} className="flex items-center gap-2 py-2 px-2 rounded-lg bg-slate-700/50">
                    <input type="color" value={editTagColor} onChange={(e) => setEditTagColor(e.target.value)} className="w-6 h-6 cursor-pointer bg-transparent border-0 rounded" />
                    <input type="text" value={editTagName} onChange={(e) => setEditTagName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTagEdit(tag.id); if (e.key === 'Escape') setEditingTagId(null); }} className="flex-1 bg-slate-600 text-white text-xs px-2 py-1.5 rounded border border-slate-500 focus:outline-none focus:border-blue-500" autoFocus />
                    <button onClick={() => handleSaveTagEdit(tag.id)} className="text-xs text-green-400 hover:text-green-300 bg-green-900/30 px-2 py-1 rounded">Save</button>
                    <button onClick={() => setEditingTagId(null)} className="text-xs text-gray-400 hover:text-white px-2 py-1">Cancel</button>
                  </div>
                );
              }

              if (confirmDeleteId === tag.id) {
                return (
                  <div key={tag.id} className="py-2 px-2 rounded-lg bg-red-900/20 border border-red-800/30">
                    <p className="text-xs text-red-300 mb-2">Delete tag "{tag.name}"?</p>
                    <div className="flex gap-2">
                      <button onClick={() => handleDeleteTag(tag.id)} className="text-xs text-white bg-red-600 hover:bg-red-700 px-3 py-1 rounded transition">Delete</button>
                      <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-gray-400 hover:text-white bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded transition">Cancel</button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={tag.id} className="group flex items-center gap-2.5 py-2 px-2 rounded-lg hover:bg-slate-700/50 transition">
                  {targetMessage && (
                    <input type="checkbox" checked={active} onChange={() => handleToggleTag(tag.id)} className="rounded cursor-pointer accent-blue-500 flex-shrink-0" />
                  )}
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                  <span className="text-sm text-gray-200 flex-1 truncate">{tag.name}</span>
                  <div className="hidden group-hover:flex items-center gap-1">
                    <button onClick={() => { setEditingTagId(tag.id); setEditTagName(tag.name); setEditTagColor(tag.color); }} className="text-gray-500 hover:text-white text-xs px-1.5 py-0.5 rounded hover:bg-slate-600 transition">✎</button>
                    <button onClick={() => setConfirmDeleteId(tag.id)} className="text-gray-500 hover:text-red-400 text-xs px-1.5 py-0.5 rounded hover:bg-slate-600 transition">🗑</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-slate-700">
          <div className="flex items-center gap-2">
            <input type="color" value={newTagColor} onChange={(e) => setNewTagColor(e.target.value)} className="w-6 h-6 cursor-pointer bg-transparent border-0 rounded" />
            <input type="text" value={newTagName} onChange={(e) => setNewTagName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleCreateTag(); }} placeholder="New tag name..." className="flex-1 bg-slate-700 text-white text-xs px-3 py-1.5 rounded border border-slate-600 focus:outline-none focus:border-blue-500 placeholder-gray-500" />
            <button onClick={handleCreateTag} disabled={!newTagName.trim()} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded transition disabled:opacity-30">Add</button>
          </div>
        </div>
      </div>
    </div>
  );
}
