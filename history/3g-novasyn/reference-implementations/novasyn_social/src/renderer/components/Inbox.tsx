import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSocialStore } from '../store/socialStore';
import type { MessageFilters } from '../../shared/types';

const CHANNEL_COLORS: Record<string, string> = {
  email: 'bg-blue-500',
  linkedin_dm: 'bg-blue-700',
  linkedin_comment: 'bg-blue-700',
  youtube_comment: 'bg-red-500',
  twitter_dm: 'bg-sky-500',
  manual: 'bg-gray-500',
};

const CHANNEL_LABELS: Record<string, string> = {
  email: 'Email',
  linkedin_dm: 'LinkedIn DM',
  linkedin_comment: 'LinkedIn Comment',
  youtube_comment: 'YouTube',
  twitter_dm: 'Twitter',
  manual: 'Manual',
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return `${Math.floor(diffDay / 30)}mo ago`;
}

function priorityColor(score: number): string {
  if (score >= 75) return 'bg-red-500/20 text-red-400 border-red-500/30';
  if (score >= 50) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  return 'bg-green-500/20 text-green-400 border-green-500/30';
}

const Inbox: React.FC = () => {
  const messages = useSocialStore((s) => s.messages);
  const inboxFilters = useSocialStore((s) => s.inboxFilters);
  const setInboxFilters = useSocialStore((s) => s.setInboxFilters);
  const loadMessages = useSocialStore((s) => s.loadMessages);
  const searchMessages = useSocialStore((s) => s.searchMessages);
  const updateMessage = useSocialStore((s) => s.updateMessage);
  const deleteMessage = useSocialStore((s) => s.deleteMessage);
  const selectMessage = useSocialStore((s) => s.selectMessage);
  const setCurrentView = useSocialStore((s) => s.setCurrentView);
  const isLoading = useSocialStore((s) => s.isLoading);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'priority' | 'date'>('priority');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
  }, [inboxFilters]);

  // Sort messages
  const sortedMessages = [...messages].sort((a, b) => {
    if (sortBy === 'priority') {
      return (b.priorityScore ?? 0) - (a.priorityScore ?? 0);
    }
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });

  // ─── Keyboard shortcuts ──────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;

      switch (e.key) {
        case 'j': // Next message
          e.preventDefault();
          setFocusedIndex((prev) => Math.min(prev + 1, sortedMessages.length - 1));
          break;
        case 'k': // Previous message
          e.preventDefault();
          setFocusedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter': // Open focused message
          if (focusedIndex >= 0 && focusedIndex < sortedMessages.length) {
            e.preventDefault();
            handleMessageClick(sortedMessages[focusedIndex].id);
          }
          break;
        case 'a': // Archive focused
          if (focusedIndex >= 0 && focusedIndex < sortedMessages.length) {
            e.preventDefault();
            updateMessage(sortedMessages[focusedIndex].id, { isArchived: true });
          }
          break;
        case 's': // Star/unstar focused
          if (focusedIndex >= 0 && focusedIndex < sortedMessages.length) {
            e.preventDefault();
            const msg = sortedMessages[focusedIndex];
            updateMessage(msg.id, { isStarred: !msg.isStarred });
          }
          break;
        case 'x': // Toggle select focused
          if (focusedIndex >= 0 && focusedIndex < sortedMessages.length) {
            e.preventDefault();
            toggleSelect(sortedMessages[focusedIndex].id);
          }
          break;
        case 'Escape':
          if (selectedIds.size > 0) {
            e.preventDefault();
            setSelectedIds(new Set());
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedIndex, sortedMessages, selectedIds]);

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[focusedIndex] as HTMLElement;
      if (item) item.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedIndex]);

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (query.trim()) {
          searchMessages(query.trim());
        } else {
          loadMessages();
        }
      }, 300);
    },
    [searchMessages, loadMessages],
  );

  const handleFilterChange = (updates: Partial<MessageFilters>) => {
    setInboxFilters({ ...inboxFilters, ...updates });
  };

  const handleMessageClick = async (id: string) => {
    const msg = messages.find((m) => m.id === id);
    if (msg && !msg.isRead) {
      await updateMessage(id, { isRead: true });
    }
    selectMessage(id);
    setCurrentView('message-detail');
  };

  const handleStar = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const msg = messages.find((m) => m.id === id);
    if (msg) {
      await updateMessage(id, { isStarred: !msg.isStarred });
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteMessage(id);
  };

  const handleArchive = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await updateMessage(id, { isArchived: true });
  };

  // ─── Bulk actions ─────────────────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === sortedMessages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedMessages.map((m) => m.id)));
    }
  };

  const bulkArchive = async () => {
    for (const id of selectedIds) {
      await updateMessage(id, { isArchived: true });
    }
    setSelectedIds(new Set());
  };

  const bulkMarkRead = async () => {
    for (const id of selectedIds) {
      await updateMessage(id, { isRead: true });
    }
    setSelectedIds(new Set());
  };

  const bulkDelete = async () => {
    for (const id of selectedIds) {
      await deleteMessage(id);
    }
    setSelectedIds(new Set());
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-[var(--bg-panel)] border-b border-[var(--border)]">
        {/* Channel filter */}
        <select
          value={inboxFilters.channelType || ''}
          onChange={(e) => handleFilterChange({ channelType: (e.target.value || undefined) as any })}
          className="bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Channels</option>
          <option value="email">Email</option>
          <option value="linkedin_dm">LinkedIn DM</option>
          <option value="linkedin_comment">LinkedIn Comment</option>
          <option value="youtube_comment">YouTube</option>
          <option value="twitter_dm">Twitter</option>
          <option value="manual">Manual</option>
        </select>

        {/* Read/Unread toggle */}
        <select
          value={
            inboxFilters.isRead === undefined ? '' : inboxFilters.isRead ? 'read' : 'unread'
          }
          onChange={(e) => {
            const val = e.target.value;
            handleFilterChange({
              isRead: val === '' ? undefined : val === 'read',
            });
          }}
          className="bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All</option>
          <option value="unread">Unread</option>
          <option value="read">Read</option>
        </select>

        {/* Priority filter */}
        <select
          value={inboxFilters.minPriority ?? ''}
          onChange={(e) => {
            const val = e.target.value;
            handleFilterChange({
              minPriority: val === '' ? undefined : parseInt(val, 10),
            });
          }}
          className="bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Priorities</option>
          <option value="75">High (75+)</option>
          <option value="50">Medium (50+)</option>
        </select>

        {/* Star filter */}
        <button
          onClick={() =>
            handleFilterChange({
              isStarred: inboxFilters.isStarred ? undefined : true,
            })
          }
          className={`
            px-3 py-1.5 rounded-lg border text-sm transition-colors
            ${
              inboxFilters.isStarred
                ? 'border-amber-500 bg-amber-500/20 text-amber-400'
                : 'border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }
          `}
          title="Filter starred"
        >
          &#9733; Starred
        </button>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'priority' | 'date')}
          className="bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="priority">Sort: Priority</option>
          <option value="date">Sort: Date</option>
        </select>

        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search messages..."
            className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-indigo-600/10 border-b border-indigo-500/30">
          <span className="text-sm text-indigo-400 font-medium">
            {selectedIds.size} selected
          </span>
          <button
            onClick={bulkMarkRead}
            className="px-3 py-1 text-xs font-medium bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] rounded hover:bg-[var(--bg-hover)] transition-colors"
          >
            Mark Read
          </button>
          <button
            onClick={bulkArchive}
            className="px-3 py-1 text-xs font-medium bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] rounded hover:bg-[var(--bg-hover)] transition-colors"
          >
            Archive
          </button>
          <button
            onClick={bulkDelete}
            className="px-3 py-1 text-xs font-medium bg-red-600/20 border border-red-500/30 text-red-400 rounded hover:bg-red-600/30 transition-colors"
          >
            Delete
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="px-3 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors ml-auto"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Message list */}
      <div className="flex-1 overflow-y-auto" ref={listRef}>
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && sortedMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <svg
              className="w-12 h-12 text-[var(--text-muted)] mb-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M22 7l-10 7L2 7" />
            </svg>
            <p className="text-[var(--text-muted)] text-sm mb-2">
              No messages match your filters
            </p>
            <p className="text-[var(--text-muted)] text-xs">
              Try adjusting your filters or compose a new message
            </p>
          </div>
        )}

        {!isLoading &&
          sortedMessages.map((msg, idx) => (
            <div
              key={msg.id}
              onClick={() => handleMessageClick(msg.id)}
              className={`flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] hover:bg-[var(--bg-hover)] cursor-pointer transition-colors group ${
                focusedIndex === idx ? 'bg-[var(--bg-hover)] ring-1 ring-inset ring-indigo-500/50' : ''
              } ${selectedIds.has(msg.id) ? 'bg-indigo-500/5' : ''}`}
            >
              {/* Select checkbox */}
              <input
                type="checkbox"
                checked={selectedIds.has(msg.id)}
                onChange={(e) => {
                  e.stopPropagation();
                  toggleSelect(msg.id);
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-4 h-4 rounded border-[var(--border)] text-indigo-600 focus:ring-indigo-500 bg-[var(--bg-input)] flex-shrink-0"
              />

              {/* Unread dot */}
              <div className="w-2.5 flex-shrink-0">
                {!msg.isRead && (
                  <span className="block w-2.5 h-2.5 rounded-full bg-blue-500" />
                )}
              </div>

              {/* Star */}
              <button
                onClick={(e) => handleStar(e, msg.id)}
                className={`flex-shrink-0 text-lg leading-none transition-colors ${
                  msg.isStarred
                    ? 'text-amber-400'
                    : 'text-[var(--text-muted)] opacity-0 group-hover:opacity-100'
                }`}
                title={msg.isStarred ? 'Unstar' : 'Star'}
              >
                {msg.isStarred ? '\u2605' : '\u2606'}
              </button>

              {/* Message content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className={`text-sm truncate ${
                      msg.isRead
                        ? 'text-[var(--text-primary)]'
                        : 'text-[var(--text-heading)] font-semibold'
                    }`}
                  >
                    {msg.senderName || msg.senderHandle || 'Unknown'}
                  </span>
                  {/* Channel badge */}
                  <span
                    className={`
                      inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium text-white flex-shrink-0
                      ${CHANNEL_COLORS[msg.channelType] || 'bg-gray-500'}
                    `}
                  >
                    {CHANNEL_LABELS[msg.channelType] || msg.channelType}
                  </span>
                  {/* Classification badge */}
                  {msg.classification?.opportunityType && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex-shrink-0">
                      {msg.classification.opportunityType}
                    </span>
                  )}
                </div>
                {/* Subject */}
                <p
                  className={`text-sm truncate ${
                    msg.isRead ? 'text-[var(--text-primary)]' : 'font-bold text-[var(--text-heading)]'
                  }`}
                >
                  {msg.subject || 'No subject'}
                </p>
                {/* Body preview */}
                <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                  {msg.body?.slice(0, 80) || ''}
                </p>
              </div>

              {/* Priority badge */}
              <span
                className={`
                  inline-flex items-center px-2 py-0.5 rounded border text-xs font-semibold flex-shrink-0
                  ${priorityColor(msg.priorityScore ?? 0)}
                `}
              >
                {msg.priorityScore ?? 0}
              </span>

              {/* Time */}
              <span className="text-xs text-[var(--text-muted)] whitespace-nowrap flex-shrink-0 w-16 text-right">
                {msg.createdAt ? timeAgo(msg.createdAt) : ''}
              </span>

              {/* Hover actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button
                  onClick={(e) => handleArchive(e, msg.id)}
                  className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--bg-input)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  title="Archive"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="21 8 21 21 3 21 3 8" />
                    <rect x="1" y="3" width="22" height="5" />
                    <line x1="10" y1="12" x2="14" y2="12" />
                  </svg>
                </button>
                <button
                  onClick={(e) => handleDelete(e, msg.id)}
                  className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-500/20 text-[var(--text-muted)] hover:text-red-400 transition-colors"
                  title="Delete"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6" />
                    <path d="M14 11v6" />
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="flex items-center gap-4 px-4 py-1.5 bg-[var(--bg-panel)] border-t border-[var(--border)] text-[10px] text-[var(--text-muted)]">
        <span><kbd className="px-1 py-0.5 bg-[var(--bg-input)] rounded text-[9px] font-mono">j</kbd>/<kbd className="px-1 py-0.5 bg-[var(--bg-input)] rounded text-[9px] font-mono">k</kbd> navigate</span>
        <span><kbd className="px-1 py-0.5 bg-[var(--bg-input)] rounded text-[9px] font-mono">Enter</kbd> open</span>
        <span><kbd className="px-1 py-0.5 bg-[var(--bg-input)] rounded text-[9px] font-mono">s</kbd> star</span>
        <span><kbd className="px-1 py-0.5 bg-[var(--bg-input)] rounded text-[9px] font-mono">a</kbd> archive</span>
        <span><kbd className="px-1 py-0.5 bg-[var(--bg-input)] rounded text-[9px] font-mono">x</kbd> select</span>
        <span className="ml-auto">{sortedMessages.length} messages</span>
      </div>
    </div>
  );
};

export default Inbox;
