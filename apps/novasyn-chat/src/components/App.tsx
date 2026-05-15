import { useAppStore } from '../store/appStore';
import { Sidebar } from './Sidebar';
import { NavRail } from './NavRail';
import { TitleBar } from './TitleBar';
import { ChatView } from './ChatView';
import { TerminalView } from './TerminalView';
import { FolderPanel } from './FolderPanel';
import { TagManager } from './TagManager';
import { ExchangeLibrary } from './ExchangeLibrary';
import { DocumentEditor } from './DocumentEditor';
import { SettingsView } from './SettingsView';
import { WorkflowView } from './WorkflowView';
import { getPopoutView } from '../lib/popout';

function renderView(view: string) {
  switch (view) {
    case 'ChatView':         return <ChatView />;
    case 'TerminalView':     return <TerminalView />;
    case 'FolderPanel':      return <FolderPanel />;
    case 'TagManager':       return <TagManager />;
    case 'ExchangeLibrary':  return <ExchangeLibrary />;
    case 'DocumentEditor':   return <DocumentEditor />;
    case 'SettingsView':     return <SettingsView />;
    case 'WorkflowView':     return <WorkflowView />;
    default:                 return <div className="p-6 text-gray-500">Unknown view</div>;
  }
}

// Popout windows: just the view, no NavRail / Sidebar / TitleBar
const popoutView = getPopoutView();

export function App() {
  const currentView = useAppStore((s) => s.currentView);

  if (popoutView) {
    return (
      <div className="h-screen flex flex-col bg-[var(--bg-page)] text-[var(--text-primary)] overflow-hidden">
        {renderView(popoutView)}
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-page)] text-[var(--text-primary)]">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <NavRail />
        <Sidebar />
        <main className="flex-1 overflow-hidden flex flex-col">
          {renderView(currentView)}
        </main>
      </div>
    </div>
  );
}
