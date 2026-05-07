import React from 'react';
import { useSocialStore } from '../store/socialStore';

type ViewType = 'dashboard' | 'inbox' | 'accounts' | 'spc' | 'knowledge-base' | 'settings';

interface NavItem {
  view: ViewType;
  label: string;
  icon: React.ReactNode;
  position?: 'bottom';
}

const Sidebar: React.FC = () => {
  const currentView = useSocialStore((s) => s.currentView);
  const setCurrentView = useSocialStore((s) => s.setCurrentView);
  const inboxStats = useSocialStore((s) => s.inboxStats);

  const unreadCount = inboxStats?.unreadCount ?? 0;

  const navItems: NavItem[] = [
    {
      view: 'dashboard',
      label: 'Dashboard',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      ),
    },
    {
      view: 'inbox',
      label: 'Inbox',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="M22 7l-10 7L2 7" />
        </svg>
      ),
    },
    {
      view: 'accounts',
      label: 'Accounts',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      view: 'spc',
      label: 'SPC Dashboard',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v18h18" />
          <path d="M7 16l4-8 4 4 4-6" />
        </svg>
      ),
    },
    {
      view: 'knowledge-base',
      label: 'Knowledge Base',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          <line x1="8" y1="7" x2="16" y2="7" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
      ),
    },
    {
      view: 'settings',
      label: 'Settings',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1.08 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1.08z" />
        </svg>
      ),
      position: 'bottom',
    },
  ];

  const topItems = navItems.filter((item) => item.position !== 'bottom');
  const bottomItems = navItems.filter((item) => item.position === 'bottom');

  const isActive = (view: ViewType) => {
    if (view === 'inbox' && currentView === 'message-detail') return true;
    return currentView === view;
  };

  const renderItem = (item: NavItem) => (
    <button
      key={item.view}
      onClick={() => setCurrentView(item.view)}
      title={item.label}
      className={`
        relative w-10 h-10 flex items-center justify-center rounded-lg transition-all
        ${
          isActive(item.view)
            ? 'bg-[var(--bg-hover)] ring-2 ring-indigo-500 text-indigo-400'
            : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
        }
      `}
    >
      {item.icon}
      {/* Unread badge on Inbox */}
      {item.view === 'inbox' && unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );

  return (
    <div className="w-14 flex flex-col items-center py-3 gap-2 bg-[var(--bg-panel)] border-r border-[var(--border)]">
      {/* Top nav items */}
      <div className="flex flex-col items-center gap-2 flex-1">
        {topItems.map(renderItem)}
      </div>

      {/* Bottom nav items */}
      <div className="flex flex-col items-center gap-2">
        {bottomItems.map(renderItem)}
      </div>
    </div>
  );
};

export default Sidebar;
