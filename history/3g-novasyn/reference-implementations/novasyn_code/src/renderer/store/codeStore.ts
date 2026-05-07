import { create } from 'zustand';
import type { Project, Session, ChatMessage, AIModel, FileNode, TerminalInstance } from '../../shared/types';

export type MainView = 'chat' | 'editor' | 'settings';

interface CodeState {
  // Data
  projects: Project[];
  sessions: Session[];
  messages: ChatMessage[];
  models: AIModel[];
  apiKeys: Record<string, string>;

  // UI — Current selections
  currentProjectId: string | null;
  currentSessionId: string | null;
  currentView: MainView;
  selectedFilePath: string | null;

  // File tree
  fileTree: FileNode | null;

  // Terminal
  terminals: TerminalInstance[];
  activeTerminalId: string | null;

  // Chat
  systemPrompt: string;
  selectedModels: string[];
  tokenBudget: number;
  isSending: boolean;
  streamingText: string;

  // Loading
  isLoading: boolean;
  error: string | null;

  // Context
  contextFiles: string[];
  contextTokens: number;
  showContextPanel: boolean;

  // Onboarding
  hasCompletedOnboarding: boolean;

  // Sidebar
  sidebarWidth: number;
  showSidebar: boolean;
  showTerminal: boolean;
  terminalHeight: number;

  // Actions
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  removeProject: (id: string) => void;
  setCurrentProjectId: (id: string | null) => void;

  setSessions: (sessions: Session[]) => void;
  addSession: (session: Session) => void;
  updateSessionName: (id: string, name: string) => void;
  removeSession: (id: string) => void;
  setCurrentSessionId: (id: string | null) => void;

  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  removeMessage: (id: string) => void;

  setModels: (models: AIModel[]) => void;
  setApiKeys: (keys: Record<string, string>) => void;
  setSelectedModels: (ids: string[]) => void;

  setFileTree: (tree: FileNode | null) => void;
  setSelectedFilePath: (path: string | null) => void;

  setTerminals: (terminals: TerminalInstance[]) => void;
  addTerminal: (terminal: TerminalInstance) => void;
  removeTerminal: (id: string) => void;
  setActiveTerminalId: (id: string | null) => void;

  setCurrentView: (view: MainView) => void;
  setSystemPrompt: (prompt: string) => void;
  setTokenBudget: (budget: number) => void;
  setIsSending: (v: boolean) => void;
  setStreamingText: (text: string) => void;
  setIsLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
  addContextFile: (path: string) => void;
  removeContextFile: (path: string) => void;
  clearContextFiles: () => void;
  setContextTokens: (tokens: number) => void;
  setShowContextPanel: (v: boolean) => void;

  setHasCompletedOnboarding: (v: boolean) => void;
  setShowSidebar: (v: boolean) => void;
  setShowTerminal: (v: boolean) => void;
  setSidebarWidth: (w: number) => void;
  setTerminalHeight: (h: number) => void;
}

export const useCodeStore = create<CodeState>((set) => ({
  projects: [],
  sessions: [],
  messages: [],
  models: [],
  apiKeys: {},
  currentProjectId: null,
  currentSessionId: null,
  currentView: 'chat',
  selectedFilePath: null,
  fileTree: null,
  terminals: [],
  activeTerminalId: null,
  systemPrompt: '',
  selectedModels: ['claude-sonnet-4-6'],
  tokenBudget: 16000,
  isSending: false,
  streamingText: '',
  isLoading: true,
  error: null,
  contextFiles: [],
  contextTokens: 0,
  showContextPanel: false,

  hasCompletedOnboarding: false,

  sidebarWidth: 260,
  showSidebar: true,
  showTerminal: true,
  terminalHeight: 250,

  setProjects: (projects) => set({ projects }),
  addProject: (project) => set((s) => ({ projects: [...s.projects, project] })),
  removeProject: (id) => set((s) => ({ projects: s.projects.filter((p) => p.id !== id) })),
  setCurrentProjectId: (currentProjectId) => set({ currentProjectId }),

  setSessions: (sessions) => set({ sessions }),
  addSession: (session) => set((s) => ({ sessions: [session, ...s.sessions] })),
  updateSessionName: (id, name) => set((s) => ({
    sessions: s.sessions.map((sess) => sess.id === id ? { ...sess, name } : sess),
  })),
  removeSession: (id) => set((s) => ({ sessions: s.sessions.filter((sess) => sess.id !== id) })),
  setCurrentSessionId: (currentSessionId) => set({ currentSessionId }),

  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((s) => ({ messages: [...s.messages, message] })),
  removeMessage: (id) => set((s) => ({ messages: s.messages.filter((m) => m.id !== id) })),

  setModels: (models) => set({ models }),
  setApiKeys: (apiKeys) => set({ apiKeys }),
  setSelectedModels: (selectedModels) => set({ selectedModels }),

  setFileTree: (fileTree) => set({ fileTree }),
  setSelectedFilePath: (selectedFilePath) => set({ selectedFilePath }),

  setTerminals: (terminals) => set({ terminals }),
  addTerminal: (terminal) => set((s) => ({ terminals: [...s.terminals, terminal] })),
  removeTerminal: (id) => set((s) => ({
    terminals: s.terminals.filter((t) => t.id !== id),
    activeTerminalId: s.activeTerminalId === id ? (s.terminals.length > 1 ? s.terminals.find((t) => t.id !== id)?.id ?? null : null) : s.activeTerminalId,
  })),
  setActiveTerminalId: (activeTerminalId) => set({ activeTerminalId }),

  setCurrentView: (currentView) => set({ currentView }),
  setSystemPrompt: (systemPrompt) => set({ systemPrompt }),
  setTokenBudget: (tokenBudget) => set({ tokenBudget }),
  setIsSending: (isSending) => set({ isSending }),
  setStreamingText: (streamingText) => set({ streamingText }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  addContextFile: (path) => set((s) => ({
    contextFiles: s.contextFiles.includes(path) ? s.contextFiles : [...s.contextFiles, path],
  })),
  removeContextFile: (path) => set((s) => ({
    contextFiles: s.contextFiles.filter((f) => f !== path),
  })),
  clearContextFiles: () => set({ contextFiles: [], contextTokens: 0 }),
  setContextTokens: (contextTokens) => set({ contextTokens }),
  setShowContextPanel: (showContextPanel) => set({ showContextPanel }),

  setHasCompletedOnboarding: (hasCompletedOnboarding) => set({ hasCompletedOnboarding }),
  setShowSidebar: (showSidebar) => set({ showSidebar }),
  setShowTerminal: (showTerminal) => set({ showTerminal }),
  setSidebarWidth: (sidebarWidth) => set({ sidebarWidth }),
  setTerminalHeight: (terminalHeight) => set({ terminalHeight }),
}));
