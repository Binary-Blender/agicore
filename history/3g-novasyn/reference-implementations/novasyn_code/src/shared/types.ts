// NovaSyn Code — Shared types

// ─── Data Models ─────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  path: string;           // Filesystem path to project root
  shell: 'wsl' | 'bash' | 'powershell' | 'cmd';
  lastOpenedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  projectId: string | null;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  userMessage: string;
  aiMessage: string;
  userTokens: number;
  aiTokens: number;
  totalTokens: number;
  model: string;
  provider: string;
  systemPrompt: string | null;
  contextFiles: string[];   // File paths included in context
  isExcluded: boolean;
  timestamp: string;
  createdAt: string;
  updatedAt: string;
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  expanded?: boolean;
}

export interface TerminalInstance {
  id: string;
  name: string;
  shell: string;
  cwd: string;
  isActive: boolean;
}

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  contextWindow: number;
  isDefault?: boolean;
  requiresKey: boolean;
}

// ─── IPC Channels ────────────────────────────────────────────────────────────

export const IPC_CHANNELS = {
  // Chat
  SEND_CHAT: 'send-chat',
  LOAD_CHATS: 'load-chats',
  DELETE_CHAT_MESSAGE: 'delete-chat-message',
  SEARCH_CHATS: 'search-chats',

  // Sessions
  GET_SESSIONS: 'get-sessions',
  CREATE_SESSION: 'create-session',
  UPDATE_SESSION: 'update-session',
  DELETE_SESSION: 'delete-session',

  // Projects
  GET_PROJECTS: 'get-projects',
  CREATE_PROJECT: 'create-project',
  UPDATE_PROJECT: 'update-project',
  DELETE_PROJECT: 'delete-project',
  OPEN_PROJECT: 'open-project',
  SELECT_PROJECT_DIR: 'select-project-dir',

  // File Tree
  GET_FILE_TREE: 'get-file-tree',
  READ_FILE: 'read-file',
  WRITE_FILE: 'write-file',
  CREATE_FILE: 'create-file',
  DELETE_FILE: 'delete-file',
  RENAME_FILE: 'rename-file',

  // Terminal
  TERMINAL_CREATE: 'terminal-create',
  TERMINAL_WRITE: 'terminal-write',
  TERMINAL_RESIZE: 'terminal-resize',
  TERMINAL_CLOSE: 'terminal-close',
  TERMINAL_LIST: 'terminal-list',

  // Settings & API Keys
  GET_SETTINGS: 'get-settings',
  SAVE_SETTINGS: 'save-settings',
  GET_API_KEYS: 'get-api-keys',
  SET_API_KEY: 'set-api-key',
  GET_MODELS: 'get-models',

  // NS Vault
  VAULT_LIST: 'vault-list',
  VAULT_STORE: 'vault-store',
  VAULT_SEARCH: 'vault-search',
  VAULT_GET_TAGS: 'vault-get-tags',

  // Macro Queue
  MACRO_GET_AVAILABLE: 'macro-get-available',
  MACRO_INVOKE: 'macro-invoke',
  MACRO_GET_PENDING: 'macro-get-pending',

  // Window
  MINIMIZE_WINDOW: 'minimize-window',
  MAXIMIZE_WINDOW: 'maximize-window',
  CLOSE_WINDOW: 'close-window',
} as const;

// ─── Electron API ────────────────────────────────────────────────────────────

export interface ElectronAPI {
  // Chat
  sendChat: (userMessage: string, model: string, context: {
    sessionId: string;
    chatHistory: ChatMessage[];
    contextFiles: string[];
    systemPrompt?: string;
  }) => Promise<ChatMessage>;
  loadChats: (options?: { sessionId?: string; limit?: number }) => Promise<ChatMessage[]>;
  deleteChatMessage: (id: string) => Promise<void>;
  searchChats: (query: string) => Promise<ChatMessage[]>;
  onChatDelta: (callback: (text: string) => void) => () => void;

  // Sessions
  getSessions: () => Promise<Session[]>;
  createSession: (name: string, projectId?: string) => Promise<Session>;
  updateSession: (id: string, updates: { name: string }) => Promise<Session>;
  deleteSession: (id: string) => Promise<void>;

  // Projects
  getProjects: () => Promise<Project[]>;
  createProject: (name: string, projectPath: string, shell?: string) => Promise<Project>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  openProject: (id: string) => Promise<FileNode>;
  selectProjectDir: () => Promise<string | null>;

  // File Tree
  getFileTree: (rootPath: string) => Promise<FileNode>;
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, content: string) => Promise<void>;
  createFile: (filePath: string, content?: string) => Promise<void>;
  deleteFile: (filePath: string) => Promise<void>;
  renameFile: (oldPath: string, newPath: string) => Promise<void>;
  onFileTreeChanged: (callback: (tree: FileNode) => void) => () => void;

  // Terminal
  terminalCreate: (options?: { shell?: string; cwd?: string; name?: string }) => Promise<TerminalInstance>;
  terminalWrite: (id: string, data: string) => void;
  terminalResize: (id: string, cols: number, rows: number) => void;
  terminalClose: (id: string) => Promise<void>;
  terminalList: () => Promise<TerminalInstance[]>;
  onTerminalData: (callback: (id: string, data: string) => void) => () => void;
  onTerminalExit: (callback: (id: string) => void) => () => void;

  // Settings & API Keys
  getSettings: () => Promise<{ selectedModels: string[]; tokenBudget: number; systemPrompt: string; defaultShell: string }>;
  saveSettings: (updates: Record<string, unknown>) => Promise<void>;
  getApiKeys: () => Promise<Record<string, string>>;
  setApiKey: (provider: string, key: string) => Promise<void>;
  getModels: () => Promise<AIModel[]>;

  // NS Vault
  vaultList: (options?: { limit?: number }) => Promise<any[]>;
  vaultStore: (input: any) => Promise<any>;
  vaultSearch: (options: any) => Promise<any[]>;
  vaultGetTags: () => Promise<any[]>;

  // Macro Queue
  macroGetAvailable: () => Promise<any>;
  macroInvoke: (targetApp: string, macro: string, input: any) => Promise<any>;
  macroGetPending: () => Promise<any[]>;
  onMacroFileApplied: (callback: (data: { filePath: string }) => void) => () => void;

  // Window
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
