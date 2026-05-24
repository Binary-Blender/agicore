import React from 'react';
import { useAppStore } from '../store/appStore';
import ConversationList from './ConversationList';

const Sidebar: React.FC = () => {
  const { createConversation, setCurrentView, currentView } = useAppStore();

  return (
    <div className="w-64 flex flex-col bg-[var(--bg-panel)] border-r border-[var(--border)] h-full">
      <div className="p-3">
        <button
          onClick={createConversation}
          className="w-full py-2.5 px-4 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="7" y1="1" x2="7" y2="13" />
            <line x1="1" y1="7" x2="13" y2="7" />
          </svg>
          New Conversation
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <ConversationList />
      </div>

      <div className="border-t border-[var(--border)] p-3 space-y-2">
        <button
          onClick={() => setCurrentView('stats')}
          className={`w-full py-2 px-3 rounded-lg text-sm text-left flex items-center gap-2 transition-colors ${
            currentView === 'stats'
              ? 'bg-[var(--bg-active)] text-[var(--text-primary)]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <rect x="1" y="7" width="3" height="6" rx="0.5" />
            <rect x="5.5" y="4" width="3" height="9" rx="0.5" />
            <rect x="10" y="1" width="3" height="12" rx="0.5" />
          </svg>
          Statistics
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
