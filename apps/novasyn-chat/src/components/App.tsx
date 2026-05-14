import { useAppStore } from '../store/appStore';
import { Sidebar } from './Sidebar';
import { TitleBar } from './TitleBar';
import { ChatView } from './ChatView';
import { TerminalView } from './TerminalView';
import { FolderPanel } from './FolderPanel';
import { TagManager } from './TagManager';
import { ExchangeLibrary } from './ExchangeLibrary';
import { DocumentEditor } from './DocumentEditor';
import { SettingsView } from './SettingsView';

export function App() {
  const currentView = useAppStore((s) => s.currentView);

  const renderView = () => {
    switch (currentView) {
      case 'ChatView': return <ChatView />;
      case 'TerminalView': return <TerminalView />;
      case 'FolderPanel': return <FolderPanel />;
      case 'TagManager': return <TagManager />;
      case 'ExchangeLibrary': return <ExchangeLibrary />;
      case 'DocumentEditor': return <DocumentEditor />;
      case 'SettingsView': return <SettingsView />;
      default: return <div className="p-6">Unknown view</div>;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-page)] text-[var(--text-primary)]">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          {renderView()}
        </main>
      </div>
    </div>
  );
}
