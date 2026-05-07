import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI } from '../shared/types';
import { IPC_CHANNELS } from '../shared/types';

const electronAPI: ElectronAPI = {
  // Chat
  sendChat: (userMessage, model, context) =>
    ipcRenderer.invoke(IPC_CHANNELS.SEND_CHAT, userMessage, model, context),
  loadChats: (options) =>
    ipcRenderer.invoke(IPC_CHANNELS.LOAD_CHATS, options),
  deleteChatMessage: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_CHAT_MESSAGE, id),
  searchChats: (query) =>
    ipcRenderer.invoke(IPC_CHANNELS.SEARCH_CHATS, query),
  onChatDelta: (callback) => {
    const handler = (_event: any, text: string) => callback(text);
    ipcRenderer.on('chat-stream-delta', handler);
    return () => ipcRenderer.removeListener('chat-stream-delta', handler);
  },

  // Sessions
  getSessions: () => ipcRenderer.invoke(IPC_CHANNELS.GET_SESSIONS),
  createSession: (name, projectId) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_SESSION, name, projectId),
  updateSession: (id, updates) =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_SESSION, id, updates),
  deleteSession: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_SESSION, id),

  // Projects
  getProjects: () => ipcRenderer.invoke(IPC_CHANNELS.GET_PROJECTS),
  createProject: (name, projectPath, shell) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_PROJECT, name, projectPath, shell),
  updateProject: (id, updates) =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_PROJECT, id, updates),
  deleteProject: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_PROJECT, id),
  openProject: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.OPEN_PROJECT, id),
  selectProjectDir: () =>
    ipcRenderer.invoke(IPC_CHANNELS.SELECT_PROJECT_DIR),

  // File Tree
  getFileTree: (rootPath) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_FILE_TREE, rootPath),
  readFile: (filePath) =>
    ipcRenderer.invoke(IPC_CHANNELS.READ_FILE, filePath),
  writeFile: (filePath, content) =>
    ipcRenderer.invoke(IPC_CHANNELS.WRITE_FILE, filePath, content),
  createFile: (filePath, content) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_FILE, filePath, content),
  deleteFile: (filePath) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_FILE, filePath),
  renameFile: (oldPath, newPath) =>
    ipcRenderer.invoke(IPC_CHANNELS.RENAME_FILE, oldPath, newPath),
  onFileTreeChanged: (callback) => {
    const handler = (_event: any, tree: any) => callback(tree);
    ipcRenderer.on('file-tree-changed', handler);
    return () => ipcRenderer.removeListener('file-tree-changed', handler);
  },

  // Terminal
  terminalCreate: (options) =>
    ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_CREATE, options),
  terminalWrite: (id, data) =>
    ipcRenderer.send(IPC_CHANNELS.TERMINAL_WRITE, id, data),
  terminalResize: (id, cols, rows) =>
    ipcRenderer.send(IPC_CHANNELS.TERMINAL_RESIZE, id, cols, rows),
  terminalClose: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_CLOSE, id),
  terminalList: () =>
    ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_LIST),
  onTerminalData: (callback) => {
    const handler = (_event: any, id: string, data: string) => callback(id, data);
    ipcRenderer.on('terminal-data', handler);
    return () => ipcRenderer.removeListener('terminal-data', handler);
  },
  onTerminalExit: (callback) => {
    const handler = (_event: any, id: string) => callback(id);
    ipcRenderer.on('terminal-exit', handler);
    return () => ipcRenderer.removeListener('terminal-exit', handler);
  },

  // Settings & API Keys
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS),
  saveSettings: (updates) =>
    ipcRenderer.invoke(IPC_CHANNELS.SAVE_SETTINGS, updates),
  getApiKeys: () => ipcRenderer.invoke(IPC_CHANNELS.GET_API_KEYS),
  setApiKey: (provider, key) =>
    ipcRenderer.invoke(IPC_CHANNELS.SET_API_KEY, provider, key),
  getModels: () => ipcRenderer.invoke(IPC_CHANNELS.GET_MODELS),

  // NS Vault
  vaultList: (options) =>
    ipcRenderer.invoke(IPC_CHANNELS.VAULT_LIST, options),
  vaultStore: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.VAULT_STORE, input),
  vaultSearch: (options) =>
    ipcRenderer.invoke(IPC_CHANNELS.VAULT_SEARCH, options),
  vaultGetTags: () =>
    ipcRenderer.invoke(IPC_CHANNELS.VAULT_GET_TAGS),

  // Macro Queue
  macroGetAvailable: () =>
    ipcRenderer.invoke(IPC_CHANNELS.MACRO_GET_AVAILABLE),
  macroInvoke: (targetApp, macro, input) =>
    ipcRenderer.invoke(IPC_CHANNELS.MACRO_INVOKE, targetApp, macro, input),
  macroGetPending: () =>
    ipcRenderer.invoke(IPC_CHANNELS.MACRO_GET_PENDING),
  onMacroFileApplied: (callback) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('macro-file-applied', handler);
    return () => ipcRenderer.removeListener('macro-file-applied', handler);
  },

  // Window
  minimizeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.MINIMIZE_WINDOW),
  maximizeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.MAXIMIZE_WINDOW),
  closeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.CLOSE_WINDOW),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
console.log('NovaSyn Code: preload script loaded');
