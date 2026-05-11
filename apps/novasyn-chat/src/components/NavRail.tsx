import { MessageSquare, Terminal, FolderOpen, Tags, BookMarked, FileText, Settings } from 'lucide-react';
import { useAppStore } from '../store/appStore';

const NAV_ITEMS = [
  { view: 'ChatView', icon: MessageSquare, title: 'Chat' },
  { view: 'TerminalView', icon: Terminal, title: 'Terminal' },
  { view: 'FolderPanel', icon: FolderOpen, title: 'Folders' },
  { view: 'TagManager', icon: Tags, title: 'Tags' },
  { view: 'ExchangeLibrary', icon: BookMarked, title: 'Exchanges' },
  { view: 'DocumentEditor', icon: FileText, title: 'Documents' },
  { view: 'SettingsView', icon: Settings, title: 'Settings' },
];

export function NavRail() {
  const currentView = useAppStore((s) => s.currentView);
  const setCurrentView = useAppStore((s) => s.setCurrentView);

  return (
    <nav className="w-14 bg-[var(--bg-sidebar)] border-r border-[var(--border)] flex flex-col items-center py-2 gap-1 flex-shrink-0">
      {NAV_ITEMS.map(({ view, icon: Icon, title }) => (
        <button
          key={view}
          onClick={() => setCurrentView(view)}
          title={title}
          className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
            currentView === view
              ? 'bg-[var(--bg-active)] text-[var(--text-primary)]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
          }`}
        >
          <Icon size={20} />
        </button>
      ))}
    </nav>
  );
}
