import { useEffect, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, Key, MessageSquare, Download, SlidersHorizontal, Search, X, Archive, ArchiveRestore, Copy, ChevronDown, ChevronRight } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../store/appStore';
import { ModelPicker } from './ModelPicker';
import { ApiKeyModal } from './ApiKeyModal';
import type { Session } from '../lib/types';

interface SessionItemProps {
  session: Session;
  isActive: boolean;
  msgCount: number;
  allSessions: Session[];
  onSelect: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onArchive: () => void;
  onCopyTo: (targetId: string) => void;
  onSystemPromptSave: (prompt: string | null) => void;
}

function SessionItem({ session, isActive, msgCount, allSessions, onSelect, onRename, onDelete, onArchive, onCopyTo, onSystemPromptSave }: SessionItemProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(session.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptDraft, setPromptDraft] = useState(session.systemPrompt ?? '');
  const [showCopyMenu, setShowCopyMenu] = useState(false);
  const copyTargets = allSessions.filter((s) => s.id !== session.id && !s.isArchived);

  async function handleExport() {
    try {
      const markdown = await invoke<string>('export_session_md', { sessionId: session.id });
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = session.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') + '.md';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) { console.error('Export failed:', err); }
  }

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
    <div className="mx-1 mb-0.5">
      <div
        onClick={onSelect}
        className={`group flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition ${
          isActive ? 'bg-blue-600/20 text-blue-200' : 'text-gray-300 hover:bg-slate-700/50 hover:text-white'
        }`}
      >
        <MessageSquare size={14} className="flex-shrink-0 opacity-60" />
        <span className="text-sm flex-1 truncate">{session.name}</span>
        {msgCount > 0 && (
          <span className="text-xs text-gray-600 flex-shrink-0 tabular-nums">{msgCount}</span>
        )}
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition">
          <button
            onClick={(e) => { e.stopPropagation(); handleExport(); }}
            className="text-gray-500 hover:text-blue-400 p-0.5 rounded hover:bg-slate-600 transition"
            title="Export as Markdown"
          >
            <Download size={11} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setShowPrompt((v) => !v); }}
            className={`p-0.5 rounded hover:bg-slate-600 transition ${showPrompt || session.systemPrompt ? 'text-amber-400' : 'text-gray-500 hover:text-amber-400'}`}
            title="System prompt"
          >
            <SlidersHorizontal size={11} />
          </button>
          {copyTargets.length > 0 && (
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowCopyMenu((v) => !v); }}
                className="text-gray-500 hover:text-green-400 p-0.5 rounded hover:bg-slate-600 transition"
                title="Copy messages to…"
              >
                <Copy size={11} />
              </button>
              {showCopyMenu && (
                <div className="absolute left-0 top-full mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-xl z-20 min-w-[160px] py-1">
                  <p className="text-xs text-gray-500 px-3 py-1">Copy to session:</p>
                  {copyTargets.map((t) => (
                    <button
                      key={t.id}
                      onClick={(e) => { e.stopPropagation(); onCopyTo(t.id); setShowCopyMenu(false); }}
                      className="w-full text-left px-3 py-1.5 text-xs text-blue-300 hover:bg-slate-600 transition truncate"
                    >{t.name}</button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onArchive(); }}
            className={`p-0.5 rounded hover:bg-slate-600 transition ${session.isArchived ? 'text-amber-400 hover:text-amber-300' : 'text-gray-500 hover:text-amber-400'}`}
            title={session.isArchived ? 'Unarchive' : 'Archive'}
          >
            {session.isArchived ? <ArchiveRestore size={11} /> : <Archive size={11} />}
          </button>
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
      {showPrompt && (
        <div className="mt-0.5 px-2 pb-1.5">
          <textarea
            value={promptDraft}
            onChange={(e) => setPromptDraft(e.target.value)}
            onBlur={() => onSystemPromptSave(promptDraft.trim() || null)}
            placeholder="System prompt for this session…"
            rows={3}
            className="w-full bg-slate-800 border border-slate-600 text-xs text-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-amber-500 resize-none placeholder-gray-600"
          />
          <div className="flex justify-between items-center mt-0.5">
            <span className="text-xs text-gray-600">{promptDraft.length > 0 ? `${promptDraft.length} chars` : 'No prompt set'}</span>
            {promptDraft.trim() && (
              <button
                onClick={() => { setPromptDraft(''); onSystemPromptSave(null); }}
                className="text-xs text-gray-500 hover:text-red-400 transition"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const sessions = useAppStore((s) => s.sessions);
  const loadSessions = useAppStore((s) => s.loadSessions);
  const currentSessionId = useAppStore((s) => s.currentSessionId);
  const setCurrentSessionId = useAppStore((s) => s.setCurrentSessionId);
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [msgCounts, setMsgCounts] = useState<Record<string, number>>({});
  const [showArchived, setShowArchived] = useState(false);
  const filterRef = useRef<HTMLInputElement>(null);

  const activeSessions = sessions.filter((s) => !s.isArchived);
  const archivedSessions = sessions.filter((s) => s.isArchived);
  const filteredSessions = filterText.trim()
    ? activeSessions.filter((s) => s.name.toLowerCase().includes(filterText.toLowerCase()))
    : activeSessions;

  function openFilter() {
    setShowFilter(true);
    setTimeout(() => filterRef.current?.focus(), 0);
  }

  function clearFilter() {
    setFilterText('');
    setShowFilter(false);
  }

  async function loadMsgCounts() {
    try {
      const counts = await invoke<Record<string, number>>('get_session_message_counts');
      setMsgCounts(counts);
    } catch { /* non-critical */ }
  }

  useEffect(() => { loadSessions(); loadMsgCounts(); }, []);

  useEffect(() => {
    if (!currentSessionId && activeSessions.length > 0) {
      setCurrentSessionId(activeSessions[0].id);
    }
  }, [sessions, currentSessionId]);

  async function handleNewSession() {
    const name = `New Session ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    try {
      await invoke('create_session', { input: { name, userId: 'default-user' } });
      await loadSessions();
      await loadMsgCounts();
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
      await loadMsgCounts();
      if (currentSessionId === id) setCurrentSessionId(null);
    } catch (err) { console.error('Delete failed:', err); }
  }

  async function handleArchiveSession(id: string, archive: boolean) {
    try {
      await invoke('update_session', { id, input: { isArchived: archive } });
      await loadSessions();
      if (archive && currentSessionId === id) setCurrentSessionId(null);
    } catch (err) { console.error('Archive failed:', err); }
  }

  async function handleCopyTo(sourceId: string, targetId: string) {
    try {
      await invoke('copy_session_messages', { sourceSessionId: sourceId, targetSessionId: targetId });
      await loadMsgCounts();
    } catch (err) { console.error('Copy failed:', err); }
  }

  async function handleSystemPromptSave(id: string, prompt: string | null) {
    try {
      await invoke('update_session', { id, input: { systemPrompt: prompt } });
      await loadSessions();
    } catch (err) { console.error('System prompt save failed:', err); }
  }

  const sessionItemProps = (session: Session) => ({
    session,
    isActive: currentSessionId === session.id,
    msgCount: msgCounts[session.id] ?? 0,
    allSessions: sessions,
    onSelect: () => setCurrentSessionId(session.id),
    onRename: (name: string) => handleRenameSession(session.id, name),
    onDelete: () => handleDeleteSession(session.id),
    onArchive: () => handleArchiveSession(session.id, !session.isArchived),
    onCopyTo: (targetId: string) => handleCopyTo(session.id, targetId),
    onSystemPromptSave: (prompt: string | null) => handleSystemPromptSave(session.id, prompt),
  });

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
            {showFilter ? (
              <div className="flex items-center gap-1 flex-1 mr-1">
                <Search size={11} className="text-gray-500 flex-shrink-0" />
                <input
                  ref={filterRef}
                  type="text"
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Escape') clearFilter(); }}
                  placeholder="Filter sessions…"
                  className="flex-1 bg-transparent text-xs text-white placeholder-gray-600 focus:outline-none min-w-0"
                />
                {filterText && (
                  <span className="text-xs text-gray-600 flex-shrink-0">
                    {filteredSessions.length}/{activeSessions.length}
                  </span>
                )}
                <button onClick={clearFilter} className="text-gray-500 hover:text-white transition flex-shrink-0">
                  <X size={11} />
                </button>
              </div>
            ) : (
              <span className="text-xs text-gray-500 uppercase tracking-wide">Conversations</span>
            )}
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {!showFilter && (
                <button
                  onClick={openFilter}
                  className="text-gray-500 hover:text-white p-0.5 rounded hover:bg-slate-700 transition"
                  title="Filter sessions"
                >
                  <Search size={12} />
                </button>
              )}
              <button
                onClick={handleNewSession}
                className="text-gray-400 hover:text-white p-0.5 rounded hover:bg-slate-700 transition"
                title="New Session"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          {activeSessions.length === 0 && (
            <p className="text-xs text-gray-600 px-3 py-4 text-center">
              No conversations yet.<br />Click + to start one.
            </p>
          )}
          {activeSessions.length > 0 && filteredSessions.length === 0 && (
            <p className="text-xs text-gray-600 px-3 py-4 text-center">
              No sessions match "{filterText}".
            </p>
          )}
          {filteredSessions.map((session) => (
            <SessionItem key={session.id} {...sessionItemProps(session)} />
          ))}

          {archivedSessions.length > 0 && (
            <div className="mt-2 border-t border-slate-700/50 pt-2">
              <button
                onClick={() => setShowArchived((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-1 w-full text-left text-xs text-gray-600 hover:text-gray-400 transition"
              >
                {showArchived ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                <Archive size={11} />
                <span>Archived ({archivedSessions.length})</span>
              </button>
              {showArchived && archivedSessions.map((session) => (
                <SessionItem key={session.id} {...sessionItemProps(session)} />
              ))}
            </div>
          )}
        </div>
        <div className="px-3 py-2 border-t border-slate-700 text-xs text-gray-600">
          <span>Built on Agicore</span>
        </div>
      </aside>
    </>
  );
}
