import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { FileText, Plus, Trash2 } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { MarkdownRenderer } from './MarkdownRenderer';
import type { Document } from '../lib/types';

export function DocumentEditor() {
  const documents = useAppStore((s) => s.documents);
  const loadDocuments = useAppStore((s) => s.loadDocuments);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftDocumentTitle, setDraftDocumentTitle] = useState('');

  useEffect(() => { loadDocuments(); }, []);

  const selected = documents.find((d) => d.id === selectedId) ?? null;

  useEffect(() => {
    if (selected) setDraftDocumentTitle(selected.title);
  }, [selected]);

  async function handleNew() {
    const name = `Untitled ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    try {
      await invoke('create_document', { input: { title: name, filePath: name, language: 'markdown' } });
      await loadDocuments();
    } catch (err) { console.error('Create failed:', err); }
  }

  async function handleDelete(id: string) {
    try {
      await invoke('delete_document', { id });
      await loadDocuments();
      if (selectedId === id) setSelectedId(null);
    } catch (err) { console.error('Delete failed:', err); }
  }

  async function handleSave() {
    if (!selected) return;
    try {
      await invoke('update_document', { id: selected.id, input: { title: draftDocumentTitle } });
      await loadDocuments();
      setEditing(false);
    } catch (err) { console.error('Save failed:', err); }
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <aside className="w-64 border-r border-slate-700 bg-slate-900/40 flex flex-col flex-shrink-0">
        <div className="px-3 py-3 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Documents</h2>
          <button onClick={handleNew} className="text-gray-400 hover:text-white p-1 rounded hover:bg-slate-700 transition" title="New">
            <Plus size={14} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {documents.length === 0 && (
            <p className="text-xs text-gray-600 px-3 py-4 text-center">No items yet.<br />Click + to create one.</p>
          )}
          {documents.map((item) => (
            <DocumentListItem
              key={item.id}
              item={item}
              isActive={selectedId === item.id}
              onSelect={() => setSelectedId(item.id)}
              onDelete={() => handleDelete(item.id)}
            />
          ))}
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        {selected ? (
          <>
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
              {editing ? (
                <input
                  type="text"
                  value={draftDocumentTitle}
                  onChange={(e) => setDraftDocumentTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
                  className="flex-1 bg-slate-700 border border-blue-500 rounded px-3 py-1.5 text-sm text-white focus:outline-none mr-3"
                  autoFocus
                />
              ) : (
                <h2 className="text-lg font-semibold text-white cursor-pointer" onClick={() => setEditing(true)}>{selected.title}</h2>
              )}
              <div className="flex items-center gap-2">
                {editing ? (
                  <>
                    <button onClick={handleSave} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition">Save</button>
                    <button onClick={() => setEditing(false)} className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded transition">Cancel</button>
                  </>
                ) : (
                  <button onClick={() => setEditing(true)} className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded transition">Edit Title</button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 max-w-4xl">
              <MarkdownRenderer content={`# ${selected.title}`} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileText size={32} className="text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Select a document to view</p>
              <p className="text-xs text-gray-700 mt-1">or click + to create a new one</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function DocumentListItem({ item, isActive, onSelect, onDelete }: {
  item: Document; isActive: boolean; onSelect: () => void; onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  if (confirmDelete) {
    return (
      <div className="px-2 py-1.5 bg-red-900/20 border border-red-800/30 rounded mx-1 mb-0.5">
        <p className="text-xs text-red-300 mb-1.5 truncate">Delete "{item.title}"?</p>
        <div className="flex gap-1">
          <button onClick={onDelete} className="text-xs text-white bg-red-600 hover:bg-red-700 px-2 py-0.5 rounded transition">Delete</button>
          <button onClick={() => setConfirmDelete(false)} className="text-xs text-gray-400 bg-slate-700 hover:bg-slate-600 px-2 py-0.5 rounded transition">Cancel</button>
        </div>
      </div>
    );
  }
  return (
    <div
      onClick={onSelect}
      className={`group flex items-center gap-2 px-2 py-1.5 rounded mx-1 mb-0.5 cursor-pointer transition ${
        isActive ? 'bg-blue-600/20 text-blue-200' : 'text-gray-300 hover:bg-slate-700/50 hover:text-white'
      }`}
    >
      <FileText size={14} className="flex-shrink-0 opacity-60" />
      <span className="text-sm flex-1 truncate">{item.title}</span>
      <button
        onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
        className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 p-0.5 rounded hover:bg-slate-600 transition"
        title="Delete"
      >
        <Trash2 size={11} />
      </button>
    </div>
  );
}
