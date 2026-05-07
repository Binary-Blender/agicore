import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI } from '../shared/types';
import { IPC_CHANNELS } from '../shared/types';

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
const electronAPI: ElectronAPI = {
  // Workflows
  workflowList: () =>
    ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_LIST),
  workflowCreate: (data) =>
    ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_CREATE, data),
  workflowUpdate: (id, updates) =>
    ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_UPDATE, id, updates),
  workflowDelete: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_DELETE, id),
  workflowGet: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_GET, id),

  // Runs
  workflowRun: (workflowId, manualInput?) =>
    ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_RUN, workflowId, manualInput),
  workflowResume: (runId, decision) =>
    ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_RESUME, runId, decision),
  workflowGetRuns: (workflowId) =>
    ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_GET_RUNS, workflowId),
  workflowGetRun: (runId) =>
    ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_GET_RUN, runId),

  // Cross-app discovery
  macroGetRegistry: () =>
    ipcRenderer.invoke(IPC_CHANNELS.MACRO_GET_REGISTRY),
  macroGetAvailable: () =>
    ipcRenderer.invoke(IPC_CHANNELS.MACRO_GET_AVAILABLE),

  // Vault
  vaultList: (options?) =>
    ipcRenderer.invoke(IPC_CHANNELS.VAULT_LIST, options),
  vaultStore: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.VAULT_STORE, input),
  vaultGet: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.VAULT_GET, id),
  vaultDelete: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.VAULT_DELETE, id),
  vaultSearch: (options) =>
    ipcRenderer.invoke(IPC_CHANNELS.VAULT_SEARCH, options),
  vaultGetTags: () =>
    ipcRenderer.invoke(IPC_CHANNELS.VAULT_GET_TAGS),
  vaultAddTag: (itemId, tagName, color?) =>
    ipcRenderer.invoke(IPC_CHANNELS.VAULT_ADD_TAG, itemId, tagName, color),
  vaultAnnotate: (itemId, content) =>
    ipcRenderer.invoke(IPC_CHANNELS.VAULT_ANNOTATE, itemId, content),
  vaultGetAnnotations: (itemId) =>
    ipcRenderer.invoke(IPC_CHANNELS.VAULT_GET_ANNOTATIONS, itemId),
  vaultGetProvenance: (itemId) =>
    ipcRenderer.invoke(IPC_CHANNELS.VAULT_GET_PROVENANCE, itemId),

  // Settings
  getSettings: () =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS),
  saveSettings: (updates) =>
    ipcRenderer.invoke(IPC_CHANNELS.SAVE_SETTINGS, updates),
  getApiKeys: () =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_API_KEYS),
  setApiKey: (provider, key) =>
    ipcRenderer.invoke(IPC_CHANNELS.SET_API_KEY, provider, key),

  // Window controls
  minimizeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.MINIMIZE_WINDOW),
  maximizeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.MAXIMIZE_WINDOW),
  closeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.CLOSE_WINDOW),

  // Events — workflow step progress
  onWorkflowStepProgress: (callback) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('workflow-step-progress', handler);
    return () => ipcRenderer.removeListener('workflow-step-progress', handler);
  },

  // Events — tray menu "New Workflow"
  onTrayNewWorkflow: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('tray-new-workflow', handler);
    return () => ipcRenderer.removeListener('tray-new-workflow', handler);
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

console.log('Preload script loaded, electronAPI exposed');
