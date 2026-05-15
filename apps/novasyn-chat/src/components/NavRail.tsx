import { MessageSquare, Terminal, FolderOpen, Tags, BookMarked, FileText, Settings, GitBranch, ExternalLink } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { openViewWindow } from '../lib/popout';

const NAV_ITEMS = [
  { view: 'ChatView',       icon: MessageSquare, title: 'Chat' },
  { view: 'TerminalView',   icon: Terminal,      title: 'Terminal' },
  { view: 'FolderPanel',    icon: FolderOpen,    title: 'Folders' },
  { view: 'TagManager',     icon: Tags,          title: 'Tags' },
  { view: 'ExchangeLibrary',icon: BookMarked,    title: 'Exchanges' },
  { view: 'DocumentEditor', icon: FileText,      title: 'Documents' },
  { view: 'WorkflowView',   icon: GitBranch,     title: 'Workflows' },
  { view: 'SettingsView',   icon: Settings,      title: 'Settings' },
];

export function NavRail() {
  const currentView = useAppStore((s) => s.currentView);
  const setCurrentView = useAppStore((s) => s.setCurrentView);

  return (
    <nav className="w-14 bg-[var(--bg-sidebar)] border-r border-[var(--border)] flex flex-col items-center py-2 gap-1 flex-shrink-0">
      {NAV_ITEMS.map(({ view, icon: Icon, title }) => (
        <div key={view} className="relative group w-10">
          <button
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
          {/* Pop-out button — appears on hover in top-right corner */}
          <button
            onClick={(e) => { e.stopPropagation(); openViewWindow(view, title); }}
            title={`Open ${title} in new window`}
            className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded flex items-center justify-center bg-slate-700 border border-slate-600 text-gray-400 hover:text-white hover:bg-slate-600 transition opacity-0 group-hover:opacity-100"
          >
            <ExternalLink size={8} />
          </button>
        </div>
      ))}
    </nav>
  );
}
