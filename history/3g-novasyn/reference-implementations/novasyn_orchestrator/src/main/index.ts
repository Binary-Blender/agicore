import { app, BrowserWindow, ipcMain } from 'electron';
import { createMainWindow, closeMainWindow } from './window';
import { setupTray, destroyTray, isQuitting, setIsQuitting } from './tray';
import { getDatabase, closeDatabase, runMigrations } from './database/db';
import { IPC_CHANNELS } from '../shared/types';
import { loadApiKeys, saveApiKey } from './config/apiKeyStore';
import { loadSettings, saveSettings } from './config/settingsStore';
import {
  initVault, closeVaultDatabase,
  vaultStore, vaultGet, vaultList, vaultDelete, vaultSearch,
  vaultGetTags, vaultAddTag, vaultAnnotate, vaultGetAnnotations, vaultGetProvenance,
} from './vault/vaultService';
import { registerMacros, unregisterMacros, getRegistry, getAvailableMacros } from './vault/macroRegistry';
import { startQueueWatcher, stopQueueWatcher } from './vault/queueWatcher';
import {
  listWorkflows, getWorkflow, createWorkflow, updateWorkflow, deleteWorkflow,
  listRuns, getRun, runWorkflow, resumeWorkflow,
} from './engine/WorkflowEngine';

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// App lifecycle
app.whenReady().then(() => {
  console.log('NovaSyn Orchestrator is ready');

  try {
    getDatabase();
    runMigrations();
    initVault();
    registerMacros();
    startQueueWatcher();
    console.log('Database, vault, macros, and queue initialized');
  } catch (error) {
    console.error('Failed to initialize:', error);
    app.quit();
    return;
  }

  registerIPCHandlers();
  const mainWindow = createMainWindow();

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  setupTray(mainWindow);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  setIsQuitting(true);
  stopQueueWatcher();
  unregisterMacros();
  destroyTray();
  closeDatabase();
  closeVaultDatabase();
});


function registerIPCHandlers() {
  // ── Ping ────────────────────────────────────────────────────────────────
  ipcMain.handle('ping', () => 'pong');

  // ── Workflows ───────────────────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.WORKFLOW_LIST, () => listWorkflows());
  ipcMain.handle(IPC_CHANNELS.WORKFLOW_CREATE, (_event, data) => createWorkflow(data));
  ipcMain.handle(IPC_CHANNELS.WORKFLOW_UPDATE, (_event, id: string, updates) => updateWorkflow(id, updates));
  ipcMain.handle(IPC_CHANNELS.WORKFLOW_DELETE, (_event, id: string) => { deleteWorkflow(id); });
  ipcMain.handle(IPC_CHANNELS.WORKFLOW_GET, (_event, id: string) => getWorkflow(id));
  ipcMain.handle(IPC_CHANNELS.WORKFLOW_RUN, (_event, workflowId: string, manualInput?: string) => runWorkflow(workflowId, manualInput));
  ipcMain.handle(IPC_CHANNELS.WORKFLOW_RESUME, (_event, runId: string, decision: string) => resumeWorkflow(runId, decision as 'approved' | 'rejected'));
  ipcMain.handle(IPC_CHANNELS.WORKFLOW_GET_RUNS, (_event, workflowId: string) => listRuns(workflowId));
  ipcMain.handle(IPC_CHANNELS.WORKFLOW_GET_RUN, (_event, runId: string) => getRun(runId));

  // ── Cross-App Discovery ─────────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.MACRO_GET_REGISTRY, () => getRegistry());
  ipcMain.handle(IPC_CHANNELS.MACRO_GET_AVAILABLE, () => getAvailableMacros());

  // ── NS Vault ────────────────────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.VAULT_LIST, (_event, options) => vaultList(options));
  ipcMain.handle(IPC_CHANNELS.VAULT_STORE, (_event, input) => vaultStore(input));
  ipcMain.handle(IPC_CHANNELS.VAULT_GET, (_event, id: string) => vaultGet(id));
  ipcMain.handle(IPC_CHANNELS.VAULT_DELETE, (_event, id: string) => { vaultDelete(id); });
  ipcMain.handle(IPC_CHANNELS.VAULT_SEARCH, (_event, options) => vaultSearch(options));
  ipcMain.handle(IPC_CHANNELS.VAULT_GET_TAGS, () => vaultGetTags());
  ipcMain.handle(IPC_CHANNELS.VAULT_ADD_TAG, (_event, itemId: string, tagName: string, color?: string) => { vaultAddTag(itemId, tagName, color); });
  ipcMain.handle(IPC_CHANNELS.VAULT_ANNOTATE, (_event, itemId: string, content: string) => vaultAnnotate(itemId, content));
  ipcMain.handle(IPC_CHANNELS.VAULT_GET_ANNOTATIONS, (_event, itemId: string) => vaultGetAnnotations(itemId));
  ipcMain.handle(IPC_CHANNELS.VAULT_GET_PROVENANCE, (_event, itemId: string) => vaultGetProvenance(itemId));

  // ── Settings & API Keys ─────────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, () => loadSettings());
  ipcMain.handle(IPC_CHANNELS.SAVE_SETTINGS, (_event, updates) => { saveSettings(updates); });
  ipcMain.handle(IPC_CHANNELS.GET_API_KEYS, () => loadApiKeys());
  ipcMain.handle(IPC_CHANNELS.SET_API_KEY, (_event, provider: string, key: string) => { saveApiKey(provider, key); });

  // ── Window Controls ─────────────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.MINIMIZE_WINDOW, () => {
    BrowserWindow.getAllWindows()[0]?.minimize();
  });
  ipcMain.handle(IPC_CHANNELS.MAXIMIZE_WINDOW, () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) win.isMaximized() ? win.unmaximize() : win.maximize();
  });
  ipcMain.handle(IPC_CHANNELS.CLOSE_WINDOW, () => {
    closeMainWindow();
  });

  console.log('IPC handlers registered');
}
