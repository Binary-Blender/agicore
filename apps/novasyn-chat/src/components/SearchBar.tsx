import { useState, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import { invoke } from '@tauri-apps/api/core';
import type { ChatMessage } from '../lib/types';

interface Props {
  onResults: (results: ChatMessage[]) => void;
  onClear: () => void;
}

export function SearchBar({ onResults, onClear }: Props) {
  const sessions = useAppStore((s) => s.sessions);
  const tags = useAppStore((s) => s.tags);

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultCount, setResultCount] = useState<number | null>(null);
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [showSessionDropdown, setShowSessionDropdown] = useState(false);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasFilters = selectedSessionIds.length > 0 || selectedTagIds.length > 0;
  const hasQuery = query.trim().length > 0;
  const canSearch = hasQuery || hasFilters;

  async function handleSearch(q: string) {
    if (!q.trim() && !hasFilters) {
      onClear();
      setResultCount(null);
      return;
    }
    setLoading(true);
    try {
      // TODO: Wire to Tauri search command with filters
      const results = await invoke<ChatMessage[]>('list_chat_messages');
      const filtered = results.filter((m) => {
        const matchesQuery = !q.trim() || m.userMessage.toLowerCase().includes(q.toLowerCase()) || m.aiMessage.toLowerCase().includes(q.toLowerCase());
        return matchesQuery;
      });
      setResultCount(filtered.length);
      onResults(filtered);
    } catch (err) {
      console.error('Search failed:', err);
    }
    setLoading(false);
  }

  function handleClearAll() {
    setQuery('');
    setSelectedSessionIds([]);
    setSelectedTagIds([]);
    setResultCount(null);
    onClear();
    inputRef.current?.focus();
  }

  function toggleSession(id: string) {
    setSelectedSessionIds((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  }

  function toggleTag(id: string) {
    setSelectedTagIds((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]);
  }

  const sessionLabel = selectedSessionIds.length === 0 ? 'All Sessions'
    : selectedSessionIds.length === 1 ? sessions.find((s) => s.id === selectedSessionIds[0])?.name || '1 session'
    : `${selectedSessionIds.length} sessions`;

  const tagLabel = selectedTagIds.length === 0 ? 'All Tags'
    : selectedTagIds.length === 1 ? tags.find((t) => t.id === selectedTagIds[0])?.name || '1 tag'
    : `${selectedTagIds.length} tags`;

  return (
    <div className="border-b border-slate-700 bg-slate-800/50">
      <div className="flex items-center gap-2 px-4 py-2">
        <span className="text-gray-500 text-sm">🔍</span>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); if (!e.target.value.trim() && !hasFilters) { onClear(); setResultCount(null); } }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(query); if (e.key === 'Escape') handleClearAll(); }}
          placeholder="Search messages... (Enter to search, Esc to clear)"
          className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none"
        />
        {loading && <span className="text-xs text-gray-500 animate-pulse">Searching...</span>}
        {resultCount !== null && !loading && <span className="text-xs text-gray-400">{resultCount} result{resultCount !== 1 ? 's' : ''}</span>}
        {(hasQuery || hasFilters || resultCount !== null) && (
          <button onClick={handleClearAll} className="text-gray-500 hover:text-white text-sm transition" title="Clear">✕</button>
        )}
      </div>

      <div className="flex items-center gap-2 px-4 pb-2">
        {/* Session filter */}
        <div className="relative">
          <button onClick={() => { setShowSessionDropdown(!showSessionDropdown); setShowTagDropdown(false); }} className={`text-xs px-2 py-1 rounded border transition ${selectedSessionIds.length > 0 ? 'border-blue-500/50 bg-blue-500/10 text-blue-300' : 'border-slate-600 bg-slate-700/50 text-gray-400 hover:text-gray-300'}`}>
            {sessionLabel} ▾
          </button>
          {showSessionDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowSessionDropdown(false)} />
              <div className="absolute left-0 top-full mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-xl z-20 w-56 max-h-60 overflow-y-auto py-1">
                {sessions.map((session) => (
                  <button key={session.id} onClick={() => toggleSession(session.id)} className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-600 transition flex items-center gap-2">
                    <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-xs ${selectedSessionIds.includes(session.id) ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-500'}`}>
                      {selectedSessionIds.includes(session.id) && '✓'}
                    </span>
                    <span className="truncate text-gray-200">{session.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Tag filter */}
        {tags.length > 0 && (
          <div className="relative">
            <button onClick={() => { setShowTagDropdown(!showTagDropdown); setShowSessionDropdown(false); }} className={`text-xs px-2 py-1 rounded border transition ${selectedTagIds.length > 0 ? 'border-blue-500/50 bg-blue-500/10 text-blue-300' : 'border-slate-600 bg-slate-700/50 text-gray-400 hover:text-gray-300'}`}>
              {tagLabel} ▾
            </button>
            {showTagDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowTagDropdown(false)} />
                <div className="absolute left-0 top-full mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-xl z-20 w-56 max-h-60 overflow-y-auto py-1">
                  {tags.map((tag) => (
                    <button key={tag.id} onClick={() => toggleTag(tag.id)} className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-600 transition flex items-center gap-2">
                      <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-xs ${selectedTagIds.includes(tag.id) ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-500'}`}>
                        {selectedTagIds.includes(tag.id) && '✓'}
                      </span>
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                      <span className="truncate text-gray-200">{tag.name}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <div className="h-4 w-px bg-slate-600" />

        <button onClick={() => handleSearch(query)} disabled={!canSearch || loading} className={`text-xs px-2.5 py-1 rounded border transition ${canSearch && !loading ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20' : 'border-slate-600 bg-slate-700/50 text-gray-500 cursor-not-allowed'}`}>
          Apply
        </button>

        {(hasQuery || hasFilters || resultCount !== null) && (
          <button onClick={handleClearAll} className="text-xs px-2.5 py-1 rounded border border-slate-600 bg-slate-700/50 text-gray-400 hover:text-gray-300 hover:bg-slate-600 transition">Clear</button>
        )}
      </div>
    </div>
  );
}
