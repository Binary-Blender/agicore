import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useCouncilStore } from '../store/councilStore';
import type { SearchResult } from '../../shared/types';

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  persona: { label: 'Persona', color: 'bg-primary-600/30 text-primary-300' },
  conversation: { label: 'Chat', color: 'bg-blue-600/30 text-blue-300' },
  meeting: { label: 'Meeting', color: 'bg-yellow-600/30 text-yellow-300' },
  memory: { label: 'Memory', color: 'bg-green-600/30 text-green-300' },
  skilldoc: { label: 'Skill Doc', color: 'bg-cyan-600/30 text-cyan-300' },
  action_item: { label: 'Action', color: 'bg-orange-600/30 text-orange-300' },
};

export default function SearchPanel() {
  const {
    searchResults,
    searching,
    personas,
    meetings,
    globalSearch,
    setShowSearchPanel,
    selectPersona,
    selectConversation,
    selectMeeting,
    setActivePersonaTab,
  } = useCouncilStore();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      globalSearch(query);
      setSelectedIndex(0);
    }, 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  // Navigate to result
  const navigateTo = useCallback((result: SearchResult) => {
    setShowSearchPanel(false);

    switch (result.type) {
      case 'persona': {
        const persona = personas.find(p => p.id === result.id);
        if (persona) selectPersona(persona);
        break;
      }
      case 'conversation': {
        // Navigate to the persona first, then select the conversation
        const personaId = result.parentId;
        const persona = personas.find(p => p.id === personaId);
        if (persona) {
          selectPersona(persona);
          // Load conversation after persona is selected
          setTimeout(async () => {
            const conversations = await window.electronAPI.getConversations(persona.id);
            const conv = conversations.find((c: any) => c.id === result.id);
            if (conv) {
              useCouncilStore.getState().selectConversation(conv);
            }
          }, 100);
        }
        break;
      }
      case 'meeting': {
        const meeting = meetings.find(m => m.id === result.id);
        if (meeting) {
          selectMeeting(meeting);
        } else {
          // Meeting might not be loaded yet, reload and try
          useCouncilStore.getState().loadMeetings().then(() => {
            const m = useCouncilStore.getState().meetings.find(m => m.id === result.id);
            if (m) selectMeeting(m);
          });
        }
        break;
      }
      case 'memory': {
        const personaId = result.parentId;
        const persona = personas.find(p => p.id === personaId);
        if (persona) {
          selectPersona(persona);
          setTimeout(() => setActivePersonaTab('memories'), 100);
        }
        break;
      }
      case 'skilldoc': {
        const personaId = result.parentId;
        const persona = personas.find(p => p.id === personaId);
        if (persona) {
          selectPersona(persona);
          setTimeout(() => setActivePersonaTab('skilldocs'), 100);
        }
        break;
      }
      case 'action_item': {
        // Navigate to the meeting
        const meetingId = result.parentId;
        if (meetingId) {
          const meeting = meetings.find(m => m.id === meetingId);
          if (meeting) selectMeeting(meeting);
        }
        break;
      }
    }
  }, [personas, meetings, selectPersona, selectMeeting, setShowSearchPanel, setActivePersonaTab]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, searchResults.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (searchResults[selectedIndex]) {
          navigateTo(searchResults[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSearchPanel(false);
        break;
    }
  };

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  // Group results by type
  const grouped = new Map<string, SearchResult[]>();
  for (const r of searchResults) {
    const arr = grouped.get(r.type) || [];
    arr.push(r);
    grouped.set(r.type, arr);
  }

  // Flat list for keyboard nav
  let flatIndex = 0;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-[15vh]" onClick={() => setShowSearchPanel(false)}>
      <div className="w-[560px] max-h-[60vh] flex flex-col bg-[#16213e] rounded-lg border border-white/10 shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-surface-500 shrink-0">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search personas, conversations, meetings, memories..."
            className="flex-1 bg-transparent text-sm text-surface-200 placeholder:text-surface-500 outline-none"
          />
          {searching && (
            <span className="text-[10px] text-surface-500 animate-pulse">Searching...</span>
          )}
          <span className="text-[10px] text-surface-600 px-1.5 py-0.5 bg-white/5 rounded">ESC</span>
        </div>

        {/* Results */}
        <div ref={listRef} className="overflow-y-auto flex-1">
          {query.length >= 2 && searchResults.length === 0 && !searching && (
            <div className="text-center py-8">
              <p className="text-sm text-surface-500">No results found</p>
              <p className="text-xs text-surface-600 mt-1">Try a different search term</p>
            </div>
          )}

          {query.length < 2 && (
            <div className="text-center py-8">
              <p className="text-sm text-surface-500">Type to search across everything</p>
              <p className="text-xs text-surface-600 mt-1">
                Personas, conversations, meetings, memories, skill docs, action items
              </p>
            </div>
          )}

          {Array.from(grouped.entries()).map(([type, results]) => {
            const config = TYPE_CONFIG[type] || { label: type, color: 'bg-white/10 text-surface-400' };

            return (
              <div key={type}>
                <div className="px-4 py-1.5 text-[10px] text-surface-500 uppercase tracking-wider font-medium bg-white/[0.02]">
                  {config.label}
                </div>
                {results.map((result) => {
                  const thisIndex = flatIndex++;
                  const isSelected = thisIndex === selectedIndex;

                  return (
                    <button
                      key={`${result.type}-${result.id}-${thisIndex}`}
                      onClick={() => navigateTo(result)}
                      onMouseEnter={() => setSelectedIndex(thisIndex)}
                      className={`w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors ${
                        isSelected ? 'bg-primary-600/10' : 'hover:bg-white/[0.03]'
                      }`}
                    >
                      <span className="text-lg shrink-0 mt-0.5">{result.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${isSelected ? 'text-surface-200' : 'text-surface-300'} truncate`}>
                            {result.title}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded shrink-0 ${config.color}`}>
                            {config.label}
                          </span>
                        </div>
                        <p className="text-xs text-surface-500 truncate">{result.subtitle}</p>
                        {result.snippet && (
                          <p className="text-xs text-surface-400 mt-0.5 line-clamp-2 leading-relaxed">{result.snippet}</p>
                        )}
                      </div>
                      {isSelected && (
                        <span className="text-[10px] text-surface-500 shrink-0 mt-1">Enter ↵</span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer hint */}
        {searchResults.length > 0 && (
          <div className="px-4 py-2 border-t border-white/5 flex items-center gap-3 text-[10px] text-surface-600">
            <span>↑↓ Navigate</span>
            <span>↵ Open</span>
            <span>ESC Close</span>
          </div>
        )}
      </div>
    </div>
  );
}
