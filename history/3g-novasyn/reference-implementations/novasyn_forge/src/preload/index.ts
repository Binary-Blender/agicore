import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI } from '../shared/types';
import { IPC_CHANNELS } from '../shared/types';

const electronAPI: ElectronAPI = {
  // Projects
  getProjects: () => ipcRenderer.invoke(IPC_CHANNELS.GET_PROJECTS),
  getProject: (id) => ipcRenderer.invoke(IPC_CHANNELS.GET_PROJECT, id),
  createProject: (input) => ipcRenderer.invoke(IPC_CHANNELS.CREATE_PROJECT, input),
  updateProject: (id, updates) => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_PROJECT, id, updates),
  deleteProject: (id) => ipcRenderer.invoke(IPC_CHANNELS.DELETE_PROJECT, id),
  openProjectDir: (projectPath) => ipcRenderer.invoke(IPC_CHANNELS.OPEN_PROJECT_DIR, projectPath),
  selectProjectDir: () => ipcRenderer.invoke(IPC_CHANNELS.SELECT_PROJECT_DIR),

  // Settings
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS),
  saveSettings: (updates) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_SETTINGS, updates),

  // API Keys
  getApiKeys: () => ipcRenderer.invoke(IPC_CHANNELS.GET_API_KEYS),
  setApiKey: (provider, key) => ipcRenderer.invoke(IPC_CHANNELS.SET_API_KEY, provider, key),

  // Models
  getModels: () => ipcRenderer.invoke(IPC_CHANNELS.GET_MODELS),

  // Conversations
  getConversations: (projectId) => ipcRenderer.invoke(IPC_CHANNELS.GET_CONVERSATIONS, projectId),
  getConversation: (id) => ipcRenderer.invoke(IPC_CHANNELS.GET_CONVERSATION, id),
  createConversation: (projectId, role, title) => ipcRenderer.invoke(IPC_CHANNELS.CREATE_CONVERSATION, projectId, role, title),
  deleteConversation: (id) => ipcRenderer.invoke(IPC_CHANNELS.DELETE_CONVERSATION, id),

  // AI Chat
  sendChat: (conversationId, message, model) => ipcRenderer.invoke(IPC_CHANNELS.SEND_CHAT, conversationId, message, model),
  onChatDelta: (callback) => {
    const handler = (_event: any, text: string) => callback(text);
    ipcRenderer.on('chat-delta', handler);
    return () => { ipcRenderer.removeListener('chat-delta', handler); };
  },

  // Decisions
  getDecisions: (projectId) => ipcRenderer.invoke(IPC_CHANNELS.GET_DECISIONS, projectId),
  createDecision: (input) => ipcRenderer.invoke(IPC_CHANNELS.CREATE_DECISION, input),
  deleteDecision: (id) => ipcRenderer.invoke(IPC_CHANNELS.DELETE_DECISION, id),

  // Scaffolding
  scaffoldProject: (projectId) => ipcRenderer.invoke(IPC_CHANNELS.SCAFFOLD_PROJECT, projectId),

  // Features & Pipeline
  getFeatures: (projectId) => ipcRenderer.invoke(IPC_CHANNELS.GET_FEATURES, projectId),
  getFeature: (id) => ipcRenderer.invoke(IPC_CHANNELS.GET_FEATURE, id),
  createFeature: (input) => ipcRenderer.invoke(IPC_CHANNELS.CREATE_FEATURE, input),
  updateFeature: (id, updates) => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_FEATURE, id, updates),
  deleteFeature: (id) => ipcRenderer.invoke(IPC_CHANNELS.DELETE_FEATURE, id),
  getFeatureSteps: (featureId) => ipcRenderer.invoke(IPC_CHANNELS.GET_FEATURE_STEPS, featureId),
  generateStep: (featureId, stepNumber) => ipcRenderer.invoke(IPC_CHANNELS.GENERATE_STEP, featureId, stepNumber),
  applyStep: (stepId) => ipcRenderer.invoke(IPC_CHANNELS.APPLY_STEP, stepId),

  // Window
  minimizeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.MINIMIZE_WINDOW),
  maximizeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.MAXIMIZE_WINDOW),
  closeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.CLOSE_WINDOW),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
console.log('Preload script loaded, electronAPI exposed');
