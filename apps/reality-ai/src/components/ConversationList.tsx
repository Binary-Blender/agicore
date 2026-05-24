import React from 'react';
import { useAppStore } from '../store/appStore';

const ConversationList: React.FC = () => {
  const {
    conversations, currentConversationId,
    selectConversation, deleteConversation,
  } = useAppStore();

  if (conversations.length === 0) {
    return (
      <div className="px-4 py-6 text-xs text-[var(--text-muted)] text-center">
        No conversations yet.
      </div>
    );
  }

  return (
    <ul className="px-2 py-1 space-y-0.5">
      {conversations.map((c) => {
        const active = c.id === currentConversationId;
        return (
          <li key={c.id}>
            <div
              className={`group flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors ${
                active
                  ? 'bg-[var(--bg-active)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
              }`}
              onClick={() => selectConversation(c.id)}
            >
              <span className="flex-1 truncate text-sm">{c.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete "${c.title}"?`)) deleteConversation(c.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--accent)] transition-opacity"
                title="Delete"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <line x1="3" y1="3" x2="9" y2="9" />
                  <line x1="9" y1="3" x2="3" y2="9" />
                </svg>
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export default ConversationList;
