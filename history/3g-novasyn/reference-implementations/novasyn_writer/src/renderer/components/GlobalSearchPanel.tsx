import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useWriterStore } from '../store/writerStore';

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  chapter: { label: 'Chapter', color: 'bg-blue-600/30 text-blue-300' },
  encyclopedia: { label: 'Encyclopedia', color: 'bg-purple-600/30 text-purple-300' },
  kb: { label: 'Knowledge', color: 'bg-green-600/30 text-green-300' },
  note: { label: 'Note', color: 'bg-orange-600/30 text-orange-300' },
  timeline: { label: 'Timeline', color: 'bg-cyan-600/30 text-cyan-300' },
};

export default function GlobalSearchPanel() {
  const {
    globalSearchResults,
    globalSearchLoading,
    setShowGlobalSearch,
    performGlobalSearch,
    selectChapter,
    chapters,
    setShowEncyclopediaEditor,
    encyclopediaEntries,
    setShowKnowledgeBase,
    setShowTimeline,
  } = useWriterStore();

  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearch = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      performGlobalSearch(q);
    }, 300);
  }, [performGlobalSearch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    handleSearch(val);
  };

  const handleResultClick = (result: any) => {
    switch (result.type) {
      case 'chapter':
      case 'note': {
        const ch = chapters.find(c => c.id === (result.chapterId || result.id));
        if (ch) selectChapter(ch);
        setShowGlobalSearch(false);
        break;
      }
      case 'encyclopedia': {
        const entry = encyclopediaEntries.find(e => e.id === result.id);
        if (entry) setShowEncyclopediaEditor(true, entry);
        setShowGlobalSearch(false);
        break;
      }
      case 'kb':
        setShowKnowledgeBase(true);
        setShowGlobalSearch(false);
        break;
      case 'timeline':
        setShowTimeline(true);
        setShowGlobalSearch(false);
        break;
    }
  };

  const filtered = filterType === 'all'
    ? globalSearchResults
    : globalSearchResults.filter(r => r.type === filterType);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-[10vh]">
      <div className="w-[640px] max-h-[70vh] flex flex-col bg-[#16213e] rounded-lg border border-white/10 shadow-2xl">
        {/* Search input */}
        <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-surface-400 shrink-0">
            <circle cx="7" cy="7" r="5" />
            <line x1="11" y1="11" x2="15" y2="15" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={handleChange}
            placeholder="Search chapters, encyclopedia, knowledge base, notes, timeline..."
            className="flex-1 bg-transparent text-surface-200 text-sm focus:outline-none placeholder:text-surface-600"
            onKeyDown={(e) => { if (e.key === 'Escape') setShowGlobalSearch(false); }}
          />
          <button
            onClick={() => setShowGlobalSearch(false)}
            className="text-surface-500 hover:text-surface-300 text-lg leading-none"
          >
            &times;
          </button>
        </div>

        {/* Filter pills */}
        {globalSearchResults.length > 0 && (
          <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setFilterType('all')}
              className={`text-xs px-2 py-0.5 rounded-full ${filterType === 'all' ? 'bg-primary-600/30 text-primary-300' : 'text-surface-500 hover:text-surface-300'}`}
            >
              All ({globalSearchResults.length})
            </button>
            {Object.entries(TYPE_LABELS).map(([type, cfg]) => {
              const count = globalSearchResults.filter(r => r.type === type).length;
              if (count === 0) return null;
              return (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`text-xs px-2 py-0.5 rounded-full ${filterType === type ? cfg.color : 'text-surface-500 hover:text-surface-300'}`}
                >
                  {cfg.label} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Results */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {!query && (
            <div className="px-4 py-8 text-center text-surface-500 text-sm">
              Type to search across your entire project
            </div>
          )}
          {query && !globalSearchLoading && filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-surface-500 text-sm">
              No results found for "{query}"
            </div>
          )}
          {globalSearchLoading && (
            <div className="px-4 py-4 text-center text-surface-500 text-sm">
              Searching...
            </div>
          )}
          {filtered.map((result, i) => {
            const cfg = TYPE_LABELS[result.type] || { label: result.type, color: 'bg-white/10 text-surface-300' };
            return (
              <button
                key={`${result.type}-${result.id}-${i}`}
                onClick={() => handleResultClick(result)}
                className="w-full text-left px-4 py-3 hover:bg-white/5 border-b border-white/5 last:border-0"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${cfg.color}`}>{cfg.label}</span>
                  <span className="text-sm text-surface-200 truncate">{result.title}</span>
                </div>
                <div className="text-xs text-surface-500 truncate">{result.snippet}</div>
              </button>
            );
          })}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-white/5 text-[10px] text-surface-600">
          Esc to close. Click a result to navigate.
        </div>
      </div>
    </div>
  );
}
