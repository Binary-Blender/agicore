import React, { useEffect } from 'react';
import { useCodeStore } from './store/codeStore';
import TitleBar from './components/TitleBar';
import Sidebar from './components/Sidebar';
import ChatPanel from './components/ChatPanel';
import TerminalPanel from './components/TerminalPanel';
import StatusBar from './components/StatusBar';
import SettingsPanel from './components/SettingsPanel';
import EditorPanel from './components/EditorPanel';
import ContextPanel from './components/ContextPanel';
import OnboardingScreen from './components/OnboardingScreen';

export default function App() {
  const {
    currentView, isLoading, error, setIsLoading, setError,
    setModels, setApiKeys, setSessions, setProjects, setMessages,
    currentSessionId, setCurrentSessionId, currentProjectId,
    setFileTree,
    apiKeys, hasCompletedOnboarding,
    setCurrentView, setShowTerminal, setShowSidebar, addSession,
  } = useCodeStore();

  // Bootstrap: load initial data
  useEffect(() => {
    async function init() {
      try {
        const [models, apiKeys, sessions, projects] = await Promise.all([
          window.electronAPI.getModels(),
          window.electronAPI.getApiKeys(),
          window.electronAPI.getSessions(),
          window.electronAPI.getProjects(),
        ]);

        setModels(models);
        setApiKeys(apiKeys);
        setSessions(sessions);
        setProjects(projects);

        // Auto-select first session if available
        if (sessions.length > 0 && !currentSessionId) {
          setCurrentSessionId(sessions[0].id);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to initialize');
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  // Load messages when session changes
  useEffect(() => {
    if (!currentSessionId) return;
    window.electronAPI.loadChats({ sessionId: currentSessionId }).then((msgs) => {
      useCodeStore.getState().setMessages(msgs);
    });
  }, [currentSessionId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+Shift+P — toggle between chat and editor
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        const view = useCodeStore.getState().currentView;
        setCurrentView(view === 'chat' ? 'editor' : 'chat');
        return;
      }
      // Ctrl+` — toggle terminal
      if (e.ctrlKey && e.key === '`') {
        e.preventDefault();
        const show = useCodeStore.getState().showTerminal;
        setShowTerminal(!show);
        return;
      }
      // Ctrl+B — toggle sidebar
      if (e.ctrlKey && !e.shiftKey && e.key === 'b') {
        e.preventDefault();
        const show = useCodeStore.getState().showSidebar;
        setShowSidebar(!show);
        return;
      }
      // Ctrl+N — new session
      if (e.ctrlKey && !e.shiftKey && e.key === 'n') {
        e.preventDefault();
        window.electronAPI.createSession('New Chat').then((session) => {
          addSession(session);
          setCurrentSessionId(session.id);
          setCurrentView('chat');
        });
        return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setCurrentView, setShowTerminal, setShowSidebar, addSession, setCurrentSessionId]);

  // Load file tree when project changes
  useEffect(() => {
    if (!currentProjectId) {
      useCodeStore.getState().setFileTree(null);
      return;
    }
    const project = useCodeStore.getState().projects.find((p) => p.id === currentProjectId);
    if (project) {
      window.electronAPI.getFileTree(project.path).then((tree) => {
        useCodeStore.getState().setFileTree(tree);
      });
    }
  }, [currentProjectId]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-400 mb-2">NovaSyn Code</div>
          <div className="text-sm text-slate-500">Loading...</div>
        </div>
      </div>
    );
  }

  // Show onboarding if no API keys and user hasn't completed onboarding
  if (Object.keys(apiKeys).length === 0 && !hasCompletedOnboarding) {
    return <OnboardingScreen />;
  }

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-200">
      <TitleBar />

      {error && (
        <div className="bg-red-900/30 border-b border-red-800 px-4 py-2 flex items-center justify-between">
          <span className="text-xs text-red-400">{error}</span>
          <button onClick={() => setError(null)} className="text-xs text-red-500 hover:text-red-400">×</button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Main content area */}
          <div className="flex-1 overflow-hidden">
            {currentView === 'chat' && <ChatPanel />}
            {currentView === 'editor' && <EditorPanel />}
            {currentView === 'settings' && <SettingsPanel />}
          </div>

          {/* Terminal at the bottom */}
          <TerminalPanel />
        </div>

        <ContextPanel />
      </div>

      <StatusBar />
    </div>
  );
}
