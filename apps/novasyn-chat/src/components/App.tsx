import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { check as checkUpdate } from '@tauri-apps/plugin-updater';
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
import { ReasonerView } from './ReasonerView';
import { ChannelView } from './ChannelView';
import { IdentityView } from './IdentityView';
import { OnboardingScreen } from './OnboardingScreen';
import { DocumentSidePanel } from './DocumentSidePanel';
import { getPopoutView } from '../lib/popout';

// "Main" views fill the chat area. Everything else opens as a modal overlay.
const MAIN_VIEWS = new Set(['ChatView', 'TerminalView']);

function renderMainView(view: string) {
  switch (view) {
    case 'TerminalView': return <TerminalView />;
    default:             return <ChatView />;
  }
}

const MODAL_TITLES: Record<string, string> = {
  FolderPanel:      'Folders',
  TagManager:       'Tags',
  ExchangeLibrary:  'Exchange Library',
  DocumentEditor:   'Documents',
  SettingsView:     'Settings',
  WorkflowView:     'Workflows',
  ReasonerView:     'Reasoners',
  ChannelView:      'Channels',
  IdentityView:     'Identity',
};

function renderModalView(view: string) {
  switch (view) {
    case 'FolderPanel':      return <FolderPanel />;
    case 'TagManager':       return <TagManager />;
    case 'ExchangeLibrary':  return <ExchangeLibrary />;
    case 'DocumentEditor':   return <DocumentEditor />;
    case 'SettingsView':     return <SettingsView />;
    case 'WorkflowView':     return <WorkflowView />;
    case 'ReasonerView':     return <ReasonerView />;
    case 'ChannelView':      return <ChannelView />;
    case 'IdentityView':     return <IdentityView />;
    default:                 return null;
  }
}

// Popout windows: just the view, no NavRail / Sidebar / TitleBar
const popoutView = getPopoutView();

export function App() {
  const currentView = useAppStore((s) => s.currentView);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const createDefaultSession = useAppStore((s) => s.createDefaultSession);
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);
  const panelDocumentId = useAppStore((s) => s.panelDocumentId);
  const [docPanelWidth, setDocPanelWidth] = useState(() => {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem('ns_doc_panel_width') : null;
    const n = raw ? parseInt(raw, 10) : NaN;
    return Number.isFinite(n) && n >= 280 && n <= 900 ? n : 400;
  });
  useEffect(() => {
    try { window.localStorage.setItem('ns_doc_panel_width', String(docPanelWidth)); } catch {}
  }, [docPanelWidth]);
  const [updateHandle, setUpdateHandle] = useState<Awaited<ReturnType<typeof checkUpdate>> | null>(null);
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const [updateDismissed, setUpdateDismissed] = useState(false);
  const [installingUpdate, setInstallingUpdate] = useState(false);

  // Silent update check on launch — if found, show a banner.
  useEffect(() => {
    let cancelled = false;
    checkUpdate()
      .then((u) => {
        if (cancelled || !u?.available) return;
        setUpdateHandle(u);
        setUpdateVersion(u.version ?? null);
      })
      .catch(() => { /* endpoint unconfigured in dev — ignore */ });
    return () => { cancelled = true; };
  }, []);

  async function handleInstallUpdate() {
    if (!updateHandle) return;
    setInstallingUpdate(true);
    try {
      await updateHandle.downloadAndInstall();
    } catch (err) {
      console.error('Update install failed:', err);
      setInstallingUpdate(false);
    }
  }

  useEffect(() => {
    invoke<Record<string, string>>('get_api_keys')
      .then((existing) => {
        const hasKey = Object.values(existing).some((v) => v && v.length > 0);
        setNeedsOnboarding(!hasKey);
      })
      .catch(() => {
        // If the command doesn't exist yet, skip onboarding
        setNeedsOnboarding(false);
      });
  }, []);

  useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      if (!e.ctrlKey || e.shiftKey || e.altKey) return;
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        await createDefaultSession();
        setCurrentView('ChatView');
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        const ta = document.querySelector<HTMLTextAreaElement>('textarea[placeholder^="Message"]');
        ta?.focus();
      } else if (e.key === ',') {
        e.preventDefault();
        setCurrentView('SettingsView');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [createDefaultSession, setCurrentView]);

  // Esc closes any modal overlay (returns to ChatView)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !MAIN_VIEWS.has(currentView)) {
        setCurrentView('ChatView');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentView, setCurrentView]);

  // System tray → New Chat
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    (async () => {
      const handle = await listen('tray-new-chat', async () => {
        await createDefaultSession();
        setCurrentView('ChatView');
      });
      unsubscribe = handle;
    })();
    return () => { if (unsubscribe) unsubscribe(); };
  }, [createDefaultSession, setCurrentView]);

  if (popoutView) {
    return (
      <div className="h-screen flex flex-col bg-[var(--bg-page)] text-[var(--text-primary)] overflow-hidden">
        {MAIN_VIEWS.has(popoutView) ? renderMainView(popoutView) : (renderModalView(popoutView) ?? <div className="p-6 text-gray-500">Unknown view</div>)}
      </div>
    );
  }

  const isModal = !MAIN_VIEWS.has(currentView) && MODAL_TITLES[currentView] !== undefined;
  const mainView = MAIN_VIEWS.has(currentView) ? currentView : 'ChatView';

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-page)] text-[var(--text-primary)] overflow-hidden">
      <TitleBar />
      {updateHandle && !updateDismissed && (
        <div className="bg-blue-900/50 border-b border-blue-700 px-4 py-1.5 flex items-center justify-between text-sm flex-shrink-0">
          <span className="text-blue-200">
            ↓ Update {updateVersion ? `v${updateVersion} ` : ''}available
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleInstallUpdate}
              disabled={installingUpdate}
              className="text-xs text-white bg-blue-600 hover:bg-blue-500 px-3 py-0.5 rounded transition disabled:opacity-50"
            >
              {installingUpdate ? 'Installing…' : 'Install & restart'}
            </button>
            <button
              onClick={() => setUpdateDismissed(true)}
              className="text-xs text-blue-300 hover:text-white transition"
            >
              Later
            </button>
          </div>
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
        <NavRail />
        <Sidebar />
        <main className="flex-1 overflow-hidden flex flex-col min-w-0">
          {renderMainView(mainView)}
        </main>
        {panelDocumentId && (
          <>
            <div
              className="w-1 cursor-col-resize bg-slate-700 hover:bg-blue-500/50 transition-colors flex-shrink-0"
              onMouseDown={(e) => {
                e.preventDefault();
                const startX = e.clientX;
                const startW = docPanelWidth;
                const onMove = (ev: MouseEvent) => {
                  setDocPanelWidth(Math.max(280, Math.min(900, startW - (ev.clientX - startX))));
                };
                const onUp = () => {
                  document.removeEventListener('mousemove', onMove);
                  document.removeEventListener('mouseup', onUp);
                };
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
              }}
            />
            <div className="flex-shrink-0" style={{ width: docPanelWidth }}>
              <DocumentSidePanel />
            </div>
          </>
        )}
      </div>
      {isModal && (
        <div
          className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-6"
          onClick={() => setCurrentView('ChatView')}
        >
          <div
            className="bg-[var(--bg-page)] border border-[var(--border)] rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)] flex-shrink-0">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">{MODAL_TITLES[currentView]}</h2>
              <button
                onClick={() => setCurrentView('ChatView')}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] w-7 h-7 flex items-center justify-center rounded transition"
                title="Close (Esc)"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {renderModalView(currentView)}
            </div>
          </div>
        </div>
      )}
      {needsOnboarding && (
        <OnboardingScreen onDone={() => setNeedsOnboarding(false)} />
      )}
    </div>
  );
}
