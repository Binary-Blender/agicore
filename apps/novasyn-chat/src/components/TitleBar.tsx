import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { Plus, Download, Settings } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { MODELS } from '../lib/models';

export function TitleBar() {
  const win = getCurrentWindow();
  const currentView = useAppStore((s) => s.currentView);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const createDefaultSession = useAppStore((s) => s.createDefaultSession);
  const selectedModel = useAppStore((s) => s.selectedModel);
  const councilModels = useAppStore((s) => s.councilModels);
  const currentSessionId = useAppStore((s) => s.currentSessionId);
  const sessions = useAppStore((s) => s.sessions);

  const mode: 'chat' | 'terminal' = currentView === 'TerminalView' ? 'terminal' : 'chat';
  const allSelected = [selectedModel, ...councilModels];
  const modelBadge = allSelected.length === 1
    ? (MODELS.find((m) => m.id === selectedModel)?.label ?? selectedModel)
    : `${allSelected.length} models`;

  async function handleNewChat() {
    await createDefaultSession();
    setCurrentView('ChatView');
  }

  async function handleExport() {
    if (!currentSessionId) return;
    try {
      const markdown = await invoke<string>('export_session_md', { sessionId: currentSessionId });
      const session = sessions.find((s) => s.id === currentSessionId);
      const safeName = (session?.name ?? 'session').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeName}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) { console.error('Export failed:', err); }
  }

  return (
    <div
      data-tauri-drag-region
      className="h-9 bg-[var(--bg-titlebar)] flex items-center justify-between px-3 select-none shrink-0"
    >
      <div className="flex items-center gap-3 min-w-0" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <span className="text-sm font-medium text-[var(--text-primary)] pointer-events-none">
          NovaSyn Chat
        </span>
        <div className="flex items-center bg-slate-900/70 border border-slate-700 rounded-md p-0.5">
          <button
            onClick={() => setCurrentView('ChatView')}
            className={`px-2.5 py-0.5 text-xs rounded transition ${
              mode === 'chat' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setCurrentView('TerminalView')}
            className={`px-2.5 py-0.5 text-xs rounded transition ${
              mode === 'terminal' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Terminal
          </button>
        </div>
        {mode === 'chat' && (
          <span className="text-xs text-gray-400 bg-slate-700/60 px-2 py-0.5 rounded-full truncate max-w-[12rem]" title={allSelected.join(', ')}>
            {modelBadge}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {mode === 'chat' && (
          <>
            <button
              onClick={handleNewChat}
              className="text-xs text-white bg-blue-600 hover:bg-blue-500 px-2.5 py-1 rounded transition font-medium flex items-center gap-1"
              title="New chat (Ctrl+N)"
            >
              <Plus size={12} /> New Chat
            </button>
            <button
              onClick={handleExport}
              disabled={!currentSessionId}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/10 w-7 h-7 flex items-center justify-center rounded transition disabled:opacity-30"
              title="Export session as Markdown"
            >
              <Download size={13} />
            </button>
          </>
        )}
        <button
          onClick={() => setCurrentView('SettingsView')}
          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/10 w-7 h-7 flex items-center justify-center rounded transition"
          title="Settings (Ctrl+,)"
        >
          <Settings size={13} />
        </button>
        <div className="w-2" />
        <button
          onClick={() => win.minimize()}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          aria-label="Minimize"
        >
          <svg width="12" height="2" viewBox="0 0 12 2" fill="currentColor">
            <rect width="12" height="2" rx="1" />
          </svg>
        </button>
        <button
          onClick={() => win.toggleMaximize()}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          aria-label="Maximize"
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="0.75" y="0.75" width="9.5" height="9.5" rx="1.25" />
          </svg>
        </button>
        <button
          onClick={() => win.close()}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-500/80 text-[var(--text-secondary)] hover:text-white transition-colors"
          aria-label="Close"
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="1" y1="1" x2="10" y2="10" />
            <line x1="10" y1="1" x2="1" y2="10" />
          </svg>
        </button>
      </div>
    </div>
  );
}
