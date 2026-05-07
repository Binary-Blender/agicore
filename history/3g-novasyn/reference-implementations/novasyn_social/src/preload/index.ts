// NovaSyn Social — Preload Script
// Bridges renderer ↔ main via contextBridge + ipcRenderer

import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/types';

contextBridge.exposeInMainWorld('electronAPI', {
  // Messages
  getMessages: (...args: unknown[]) => ipcRenderer.invoke(IPC_CHANNELS.GET_MESSAGES, ...args),
  getMessage: (...args: unknown[]) => ipcRenderer.invoke(IPC_CHANNELS.GET_MESSAGE, ...args),
  createMessage: (...args: unknown[]) => ipcRenderer.invoke(IPC_CHANNELS.CREATE_MESSAGE, ...args),
  updateMessage: (...args: unknown[]) => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_MESSAGE, ...args),
  deleteMessage: (...args: unknown[]) => ipcRenderer.invoke(IPC_CHANNELS.DELETE_MESSAGE, ...args),
  searchMessages: (...args: unknown[]) => ipcRenderer.invoke(IPC_CHANNELS.SEARCH_MESSAGES, ...args),

  // Classifications
  getClassification: (...args: unknown[]) => ipcRenderer.invoke(IPC_CHANNELS.GET_CLASSIFICATION, ...args),
  classifyMessage: (...args: unknown[]) => ipcRenderer.invoke(IPC_CHANNELS.CLASSIFY_MESSAGE, ...args),

  // Drafts
  getDrafts: (...args: unknown[]) => ipcRenderer.invoke(IPC_CHANNELS.GET_DRAFTS, ...args),
  generateDraft: (...args: unknown[]) => ipcRenderer.invoke(IPC_CHANNELS.GENERATE_DRAFT, ...args),
  updateDraft: (...args: unknown[]) => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_DRAFT, ...args),
  sendDraft: (...args: unknown[]) => ipcRenderer.invoke(IPC_CHANNELS.SEND_DRAFT, ...args),
  getAutomationTierFor: (...args: unknown[]) => ipcRenderer.invoke(IPC_CHANNELS.GET_AUTOMATION_TIER_FOR, ...args),

  // Feedback
  submitFeedback: (...args: unknown[]) => ipcRenderer.invoke(IPC_CHANNELS.SUBMIT_FEEDBACK, ...args),

  // SPC
  getSpcMetrics: (...args: unknown[]) => ipcRenderer.invoke(IPC_CHANNELS.GET_SPC_METRICS, ...args),
  getAutomationTiers: (...args: unknown[]) => ipcRenderer.invoke(IPC_CHANNELS.GET_AUTOMATION_TIERS, ...args),
  calculateSpcMetrics: () => ipcRenderer.invoke(IPC_CHANNELS.CALCULATE_SPC_METRICS),
  updateAutomationTier: (...args: unknown[]) => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_AUTOMATION_TIER, ...args),
  getRedlineTopics: () => ipcRenderer.invoke(IPC_CHANNELS.GET_REDLINE_TOPICS),
  saveRedlineTopics: (...args: unknown[]) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_REDLINE_TOPICS, ...args),

  // Accounts
  getAccounts: (...args: unknown[]) => ipcRenderer.invoke(IPC_CHANNELS.GET_ACCOUNTS, ...args),
  createAccount: (...args: unknown[]) => ipcRenderer.invoke(IPC_CHANNELS.CREATE_ACCOUNT, ...args),
  updateAccount: (...args: unknown[]) => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_ACCOUNT, ...args),
  deleteAccount: (...args: unknown[]) => ipcRenderer.invoke(IPC_CHANNELS.DELETE_ACCOUNT, ...args),
  connectPlatform: (...args: unknown[]) => ipcRenderer.invoke(IPC_CHANNELS.CONNECT_PLATFORM, ...args),
  disconnectAccount: (...args: unknown[]) => ipcRenderer.invoke(IPC_CHANNELS.DISCONNECT_ACCOUNT, ...args),

  // Sync
  syncAccount: (...args: unknown[]) => ipcRenderer.invoke(IPC_CHANNELS.SYNC_ACCOUNT, ...args),
  syncAll: () => ipcRenderer.invoke(IPC_CHANNELS.SYNC_ALL),
  getSyncStatus: () => ipcRenderer.invoke(IPC_CHANNELS.GET_SYNC_STATUS),
  setAutoSync: (...args: unknown[]) => ipcRenderer.invoke(IPC_CHANNELS.SET_AUTO_SYNC, ...args),

  // Stats
  getInboxStats: (...args: unknown[]) => ipcRenderer.invoke(IPC_CHANNELS.GET_INBOX_STATS, ...args),

  // Settings & Config
  getSettings: (...args: unknown[]) => ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS, ...args),
  saveSettings: (...args: unknown[]) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_SETTINGS, ...args),
  getApiKeys: (...args: unknown[]) => ipcRenderer.invoke(IPC_CHANNELS.GET_API_KEYS, ...args),
  setApiKey: (...args: unknown[]) => ipcRenderer.invoke(IPC_CHANNELS.SET_API_KEY, ...args),
  getModels: (...args: unknown[]) => ipcRenderer.invoke(IPC_CHANNELS.GET_MODELS, ...args),
  discoverModels: (forceRefresh?: boolean) => ipcRenderer.invoke(IPC_CHANNELS.DISCOVER_MODELS, forceRefresh),

  // Export
  exportMessagesCsv: () => ipcRenderer.invoke(IPC_CHANNELS.EXPORT_MESSAGES_CSV),
  exportSpcJson: () => ipcRenderer.invoke(IPC_CHANNELS.EXPORT_SPC_JSON),

  // Knowledge Base
  getKBEntries: (...args: unknown[]) => ipcRenderer.invoke(IPC_CHANNELS.GET_KB_ENTRIES, ...args),
  getKBEntry: (...args: unknown[]) => ipcRenderer.invoke(IPC_CHANNELS.GET_KB_ENTRY, ...args),
  createKBEntry: (...args: unknown[]) => ipcRenderer.invoke(IPC_CHANNELS.CREATE_KB_ENTRY, ...args),
  updateKBEntry: (...args: unknown[]) => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_KB_ENTRY, ...args),
  deleteKBEntry: (...args: unknown[]) => ipcRenderer.invoke(IPC_CHANNELS.DELETE_KB_ENTRY, ...args),
  searchKB: (...args: unknown[]) => ipcRenderer.invoke(IPC_CHANNELS.SEARCH_KB, ...args),
  embedKBEntries: () => ipcRenderer.invoke(IPC_CHANNELS.EMBED_KB_ENTRIES),

  // Window (fire-and-forget)
  minimizeWindow: () => ipcRenderer.send(IPC_CHANNELS.MINIMIZE_WINDOW),
  maximizeWindow: () => ipcRenderer.send(IPC_CHANNELS.MAXIMIZE_WINDOW),
  closeWindow: () => ipcRenderer.send(IPC_CHANNELS.CLOSE_WINDOW),

  // System
  ping: (...args: unknown[]) => ipcRenderer.invoke(IPC_CHANNELS.PING, ...args),

  // AI actions
  aiStopGeneration: () => ipcRenderer.invoke(IPC_CHANNELS.AI_STOP_GENERATION),

  // Streaming
  onStreamChunk: (callback: (chunk: string) => void) => {
    ipcRenderer.on('ai-stream-chunk', (_event: any, chunk: string) => callback(chunk));
  },
  onStreamDone: (callback: () => void) => {
    ipcRenderer.on('ai-stream-done', () => callback());
  },
  removeStreamListeners: () => {
    ipcRenderer.removeAllListeners('ai-stream-chunk');
    ipcRenderer.removeAllListeners('ai-stream-done');
  },

  // NS Vault
  vaultList: (options?: any) =>
    ipcRenderer.invoke(IPC_CHANNELS.VAULT_LIST, options),
  vaultStore: (input: any) =>
    ipcRenderer.invoke(IPC_CHANNELS.VAULT_STORE, input),
  vaultGet: (id: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.VAULT_GET, id),
  vaultDelete: (id: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.VAULT_DELETE, id),
  vaultSearch: (options: any) =>
    ipcRenderer.invoke(IPC_CHANNELS.VAULT_SEARCH, options),
  vaultGetTags: () =>
    ipcRenderer.invoke(IPC_CHANNELS.VAULT_GET_TAGS),
  vaultAddTag: (itemId: string, tagName: string, color?: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.VAULT_ADD_TAG, itemId, tagName, color),
  vaultAnnotate: (itemId: string, content: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.VAULT_ANNOTATE, itemId, content),
  vaultGetAnnotations: (itemId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.VAULT_GET_ANNOTATIONS, itemId),
  vaultGetProvenance: (itemId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.VAULT_GET_PROVENANCE, itemId),

  // Macro Registry
  macroGetRegistry: () =>
    ipcRenderer.invoke(IPC_CHANNELS.MACRO_GET_REGISTRY),
  macroGetAvailable: () =>
    ipcRenderer.invoke(IPC_CHANNELS.MACRO_GET_AVAILABLE),

  // Cross-App Queue
  macroInvoke: (targetApp: string, macro: string, input: any, vaultParentId?: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.MACRO_INVOKE, targetApp, macro, input, vaultParentId),
  macroInvokeStatus: (requestId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.MACRO_INVOKE_STATUS, requestId),
  macroGetPending: () =>
    ipcRenderer.invoke(IPC_CHANNELS.MACRO_GET_PENDING),

  // Orchestrations
  orchList: () => ipcRenderer.invoke(IPC_CHANNELS.ORCH_LIST),
  orchCreate: (data: any) => ipcRenderer.invoke(IPC_CHANNELS.ORCH_CREATE, data),
  orchUpdate: (id: string, updates: any) => ipcRenderer.invoke(IPC_CHANNELS.ORCH_UPDATE, id, updates),
  orchDelete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.ORCH_DELETE, id),
  orchGet: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.ORCH_GET, id),
  orchRun: (orchestrationId: string, manualInput?: string) => ipcRenderer.invoke(IPC_CHANNELS.ORCH_RUN, orchestrationId, manualInput),
  orchResume: (runId: string, decision: string) => ipcRenderer.invoke(IPC_CHANNELS.ORCH_RESUME, runId, decision),
  orchGetRuns: (orchestrationId: string) => ipcRenderer.invoke(IPC_CHANNELS.ORCH_GET_RUNS, orchestrationId),
  orchGetRun: (runId: string) => ipcRenderer.invoke(IPC_CHANNELS.ORCH_GET_RUN, runId),
  onOrchStepProgress: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('orch-step-progress', handler);
    return () => ipcRenderer.removeListener('orch-step-progress', handler);
  },
});
