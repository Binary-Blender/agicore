import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Key, MessageSquare } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../store/appStore';
import { ModelPicker } from './ModelPicker';
import { ApiKeyModal } from './ApiKeyModal';
import type { Session } from '../lib/types';

interface SessionItemProps {
  session: Session;
  isActive: boolean;
  onSelect: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}

function SessionItem({ session, isActive, onSelect, onRename, onDelete }: SessionItemProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(session.name);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (editing) {
    return (
      <div className="px-2 py-1">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { onRename(name); setEditing(false); }
            if (e.key === 'Escape') { setName(session.name); setEditing(false); }
          }}
          onBlur={() => { onRename(name); setEditing(false); }}
          className="w-full bg-slate-700 border border-blue-500 rounded px-2 py-1 text-sm text-white focus:outline-none"
          autoFocus
        />
      </div>
    );
  }

  if (confirmDelete) {
    return (
      <div className="px-2 py-1.5 bg-red-900/20 border border-red-800/30 rounded mx-1 mb-0.5">
        <p className="text-xs text-red-300 mb-1.5">Delete "{session.name}"?</p>
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
      <MessageSquare size={14} className="flex-shrink-0 opacity-60" />
      <span className="text-sm flex-1 truncate">{session.name}</span>
      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition">
        <button
          onClick={(e) => { e.stopPropagation(); setEditing(true); }}
          className="text-gray-500 hover:text-white p-0.5 rounded hover:bg-slate-600 transition"
          title="Rename"
        >
          <Pencil size={11} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
          className="text-gray-500 hover:text-red-400 p-0.5 rounded hover:bg-slate-600 transition"
          title="Delete"
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
}

export function Sidebar() {
  const sessions = useAppStore((s) => s.sessions);
  const loadSessions = useAppStore((s) => s.loadSessions);
  const currentSessionId = useAppStore((s) => s.currentSessionId);
  const setCurrentSessionId = useAppStore((s) => s.setCurrentSessionId);
  const [showApiKeys, setShowApiKeys] = useState(false);

  useEffect(() => { loadSessions(); }, []);

  useEffect(() => {
    if (!currentSessionId && sessions.length > 0) {
      setCurrentSessionId(sessions[0].id);
    }
  }, [sessions, currentSessionId]);

  async function handleNewSession() {
    const name = `New Session ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    try {
      await invoke('create_session', { input: { name, userId: 'default-user' } });
      await loadSessions();
    } catch (err) { console.error('Create session failed:', err); }
  }

  async function handleRenameSession(id: string, name: string) {
    if (!name.trim()) return;
    try {
      await invoke('update_session', { id, input: { name: name.trim() } });
      await loadSessions();
    } catch (err) { console.error('Rename failed:', err); }
  }

  async function handleDeleteSession(id: string) {
    try {
      await invoke('delete_session', { id });
      await loadSessions();
      if (currentSessionId === id) setCurrentSessionId(null);
    } catch (err) { console.error('Delete failed:', err); }
  }

  return (
    <>
      {showApiKeys && <ApiKeyModal onClose={() => setShowApiKeys(false)} />}
      <aside className="w-64 bg-slate-900/50 border-r border-slate-700 flex flex-col flex-shrink-0">
        <div className="px-3 py-3 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">NovaSyn Chat</h2>
          <button
            onClick={() => setShowApiKeys(true)}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-slate-700 transition"
            title="API Keys"
          >
            <Key size={14} />
          </button>
        </div>
        <ModelPicker />
        <div className="flex-1 overflow-y-auto py-2">
          <div className="px-3 mb-1 flex items-center justify-between">
            <span className="text-xs text-gray-500 uppercase tracking-wide">Conversations</span>
            <button
              onClick={handleNewSession}
              className="text-gray-400 hover:text-white p-0.5 rounded hover:bg-slate-700 transition"
              title="New Session"
            >
              <Plus size={14} />
            </button>
          </div>
          {sessions.length === 0 && (
            <p className="text-xs text-gray-600 px-3 py-4 text-center">
              No conversations yet.<br />Click + to start one.
            </p>
          )}
          {sessions.map((session) => (
            <SessionItem
              key={session.id}
              session={session}
              isActive={currentSessionId === session.id}
              onSelect={() => setCurrentSessionId(session.id)}
              onRename={(name) => handleRenameSession(session.id, name)}
              onDelete={() => handleDeleteSession(session.id)}
            />
          ))}
        </div>
        <div className="px-3 py-2 border-t border-slate-700 text-xs text-gray-600">
          <span>Built on Agicore</span>
        </div>
      </aside>
    </>
  );
}
