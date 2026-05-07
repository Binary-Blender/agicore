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
import { executeMacro } from './vault/macroExecutor';
import { startQueueWatcher, stopQueueWatcher, sendMacroRequest, checkMacroResponse } from './vault/queueWatcher';
import {
  createTeam, getTeam, updateTeam, deleteTeam,
  createChannel, listChannels, getChannel, updateChannel, deleteChannel,
  listMembers, addMember, updateMember, removeMember,
  addChannelMember, removeChannelMember, listChannelMembers,
} from './services/teamService';
import {
  sendMessage, listMessages, editMessage, deleteMessage,
  pinMessage, reactToMessage, listThread, searchMessages,
} from './services/messageService';
import {
  summarizeChannel, draftResponse, respondToMention,
} from './services/aiService';
import { closeLogger, refreshLoggerEnabled } from './services/logger';

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
  console.log('NovaSyn Teams is ready');

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
  closeLogger();
  stopQueueWatcher();
  unregisterMacros();
  destroyTray();
  closeDatabase();
  closeVaultDatabase();
});


function registerIPCHandlers() {
  // -- Ping ----------------------------------------------------------------
  ipcMain.handle('ping', () => 'pong');

  // -- Team CRUD -----------------------------------------------------------
  ipcMain.handle(IPC_CHANNELS.TEAM_CREATE, (_event, data: { name: string; description?: string }) =>
    createTeam(data.name, data.description));
  ipcMain.handle(IPC_CHANNELS.TEAM_GET, (_event, id: string) =>
    getTeam(id));
  ipcMain.handle(IPC_CHANNELS.TEAM_UPDATE, (_event, id: string, updates: any) =>
    updateTeam(id, updates));
  ipcMain.handle(IPC_CHANNELS.TEAM_DELETE, (_event, id: string) => {
    deleteTeam(id);
  });

  // -- Channel CRUD --------------------------------------------------------
  ipcMain.handle(IPC_CHANNELS.CHANNEL_CREATE, (_event, data: {
    teamId: string; name: string; description?: string; isDirect?: boolean; isAiEnabled?: boolean;
  }) => createChannel(data.teamId, data.name, data.description, data.isDirect, data.isAiEnabled));
  ipcMain.handle(IPC_CHANNELS.CHANNEL_LIST, (_event, teamId: string) =>
    listChannels(teamId));
  ipcMain.handle(IPC_CHANNELS.CHANNEL_GET, (_event, id: string) =>
    getChannel(id));
  ipcMain.handle(IPC_CHANNELS.CHANNEL_UPDATE, (_event, id: string, updates: any) =>
    updateChannel(id, updates));
  ipcMain.handle(IPC_CHANNELS.CHANNEL_DELETE, (_event, id: string) => {
    deleteChannel(id);
  });

  // -- Member CRUD ---------------------------------------------------------
  ipcMain.handle(IPC_CHANNELS.MEMBER_LIST, (_event, teamId: string) =>
    listMembers(teamId));
  ipcMain.handle(IPC_CHANNELS.MEMBER_ADD, (_event, data: {
    teamId: string; displayName: string; avatarColor?: string; role?: 'owner' | 'admin' | 'member'; isSelf?: boolean;
  }) => addMember(data.teamId, data.displayName, data.avatarColor, data.role, data.isSelf));
  ipcMain.handle(IPC_CHANNELS.MEMBER_UPDATE, (_event, id: string, updates: any) =>
    updateMember(id, updates));
  ipcMain.handle(IPC_CHANNELS.MEMBER_REMOVE, (_event, id: string) => {
    removeMember(id);
  });

  // -- Channel Members -----------------------------------------------------
  ipcMain.handle(IPC_CHANNELS.CHANNEL_MEMBER_ADD, (_event, channelId: string, memberId: string) => {
    addChannelMember(channelId, memberId);
  });
  ipcMain.handle(IPC_CHANNELS.CHANNEL_MEMBER_REMOVE, (_event, channelId: string, memberId: string) => {
    removeChannelMember(channelId, memberId);
  });
  ipcMain.handle(IPC_CHANNELS.CHANNEL_MEMBER_LIST, (_event, channelId: string) =>
    listChannelMembers(channelId));

  // -- Messages ------------------------------------------------------------
  ipcMain.handle(IPC_CHANNELS.MESSAGE_SEND, (_event, data: {
    channelId: string; senderId: string; content: string; messageType?: any; replyTo?: string; vaultItemId?: string;
  }) => sendMessage(data.channelId, data.senderId, data.content, data.messageType, data.replyTo, data.vaultItemId));
  ipcMain.handle(IPC_CHANNELS.MESSAGE_LIST, (_event, channelId: string, limit?: number, offset?: number) =>
    listMessages(channelId, limit, offset));
  ipcMain.handle(IPC_CHANNELS.MESSAGE_EDIT, (_event, id: string, content: string) =>
    editMessage(id, content));
  ipcMain.handle(IPC_CHANNELS.MESSAGE_DELETE, (_event, id: string) => {
    deleteMessage(id);
  });
  ipcMain.handle(IPC_CHANNELS.MESSAGE_PIN, (_event, id: string, isPinned: boolean) =>
    pinMessage(id, isPinned));
  ipcMain.handle(IPC_CHANNELS.MESSAGE_REACT, (_event, id: string, emoji: string, memberId: string) =>
    reactToMessage(id, emoji, memberId));
  ipcMain.handle(IPC_CHANNELS.MESSAGE_SEARCH, (_event, teamId: string, query: string) =>
    searchMessages(teamId, query));

  // -- Threads -------------------------------------------------------------
  ipcMain.handle(IPC_CHANNELS.THREAD_LIST, (_event, parentMessageId: string) =>
    listThread(parentMessageId));

  // -- Calls ---------------------------------------------------------------
  ipcMain.handle(IPC_CHANNELS.CALL_START, (_event, data: {
    channelId: string; startedBy: string; callType?: string;
  }) => {
    const db = getDatabase();
    const { v4: uuidv4 } = require('uuid');
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO calls (id, channel_id, started_by, call_type, status, started_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, data.channelId, data.startedBy, data.callType || 'voice', 'active', now);
    const row = db.prepare('SELECT * FROM calls WHERE id = ?').get(id) as any;
    return {
      id: row.id, channelId: row.channel_id, startedBy: row.started_by,
      callType: row.call_type, status: row.status, transcript: row.transcript,
      summary: row.summary, actionItems: JSON.parse(row.action_items || '[]'),
      startedAt: row.started_at, endedAt: row.ended_at, durationSeconds: row.duration_seconds,
    };
  });

  ipcMain.handle(IPC_CHANNELS.CALL_END, (_event, id: string, data?: {
    transcript?: string; summary?: string; actionItems?: string[];
  }) => {
    const db = getDatabase();
    const now = new Date().toISOString();
    const callRow = db.prepare('SELECT * FROM calls WHERE id = ?').get(id) as any;
    if (!callRow) throw new Error(`Call not found: ${id}`);

    const startedAt = new Date(callRow.started_at).getTime();
    const durationSeconds = Math.floor((Date.now() - startedAt) / 1000);

    db.prepare(`
      UPDATE calls SET status = ?, ended_at = ?, duration_seconds = ?,
        transcript = COALESCE(?, transcript),
        summary = COALESCE(?, summary),
        action_items = COALESCE(?, action_items)
      WHERE id = ?
    `).run(
      'ended', now, durationSeconds,
      data?.transcript || null,
      data?.summary || null,
      data?.actionItems ? JSON.stringify(data.actionItems) : null,
      id,
    );

    const row = db.prepare('SELECT * FROM calls WHERE id = ?').get(id) as any;
    return {
      id: row.id, channelId: row.channel_id, startedBy: row.started_by,
      callType: row.call_type, status: row.status, transcript: row.transcript,
      summary: row.summary, actionItems: JSON.parse(row.action_items || '[]'),
      startedAt: row.started_at, endedAt: row.ended_at, durationSeconds: row.duration_seconds,
    };
  });

  ipcMain.handle(IPC_CHANNELS.CALL_GET_HISTORY, (_event, channelId: string) => {
    const db = getDatabase();
    const rows = db.prepare(
      'SELECT * FROM calls WHERE channel_id = ? ORDER BY started_at DESC LIMIT 50'
    ).all(channelId) as any[];
    return rows.map((row: any) => ({
      id: row.id, channelId: row.channel_id, startedBy: row.started_by,
      callType: row.call_type, status: row.status, transcript: row.transcript,
      summary: row.summary, actionItems: JSON.parse(row.action_items || '[]'),
      startedAt: row.started_at, endedAt: row.ended_at, durationSeconds: row.duration_seconds,
    }));
  });

  // -- AI ------------------------------------------------------------------
  ipcMain.handle(IPC_CHANNELS.AI_SUMMARIZE_CHANNEL, (_event, channelId: string, messageCount?: number) =>
    summarizeChannel(channelId, messageCount));
  ipcMain.handle(IPC_CHANNELS.AI_DRAFT_RESPONSE, (_event, channelId: string, context?: string) =>
    draftResponse(channelId, context));
  ipcMain.handle(IPC_CHANNELS.AI_RESPOND_TO_MENTION, (_event, channelId: string, senderId: string, content: string) =>
    respondToMention(channelId, senderId, content));

  // -- NS Vault ------------------------------------------------------------
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

  // -- Macros --------------------------------------------------------------
  ipcMain.handle(IPC_CHANNELS.MACRO_GET_REGISTRY, () => getRegistry());
  ipcMain.handle(IPC_CHANNELS.MACRO_GET_AVAILABLE, () => getAvailableMacros());
  ipcMain.handle(IPC_CHANNELS.MACRO_EXECUTE, (_event, macroName: string, input: any) => executeMacro(macroName, input));
  ipcMain.handle(IPC_CHANNELS.MACRO_SEND_REQUEST, (_event, targetApp: string, macro: string, input: any) =>
    sendMacroRequest(targetApp, macro, input));
  ipcMain.handle(IPC_CHANNELS.MACRO_CHECK_RESPONSE, (_event, requestId: string) => checkMacroResponse(requestId));

  // -- Orchestrations (stub -- delegates to Orchestrator app via queue) ----
  ipcMain.handle(IPC_CHANNELS.ORCHESTRATION_LIST, () =>
    sendMacroRequest('novasyn-orchestrator', 'orchestrator.list_workflows', {}));
  ipcMain.handle(IPC_CHANNELS.ORCHESTRATION_CREATE, (_event, data: any) =>
    sendMacroRequest('novasyn-orchestrator', 'orchestrator.run_workflow', { action: 'create', data }));
  ipcMain.handle(IPC_CHANNELS.ORCHESTRATION_UPDATE, (_event, id: string, updates: any) =>
    sendMacroRequest('novasyn-orchestrator', 'orchestrator.run_workflow', { action: 'update', id, updates }));
  ipcMain.handle(IPC_CHANNELS.ORCHESTRATION_DELETE, (_event, id: string) =>
    sendMacroRequest('novasyn-orchestrator', 'orchestrator.run_workflow', { action: 'delete', id }));
  ipcMain.handle(IPC_CHANNELS.ORCHESTRATION_GET, (_event, id: string) =>
    sendMacroRequest('novasyn-orchestrator', 'orchestrator.run_workflow', { action: 'get', id }));
  ipcMain.handle(IPC_CHANNELS.ORCHESTRATION_RUN, (_event, id: string, input?: string) =>
    sendMacroRequest('novasyn-orchestrator', 'orchestrator.run_workflow', { workflowId: id, inputs: { manualInput: input } }));
  ipcMain.handle(IPC_CHANNELS.ORCHESTRATION_RESUME, (_event, runId: string, decision: string) =>
    sendMacroRequest('novasyn-orchestrator', 'orchestrator.run_workflow', { action: 'resume', runId, decision }));
  ipcMain.handle(IPC_CHANNELS.ORCHESTRATION_GET_RUNS, (_event, orchestrationId: string) =>
    sendMacroRequest('novasyn-orchestrator', 'orchestrator.run_workflow', { action: 'get_runs', orchestrationId }));
  ipcMain.handle(IPC_CHANNELS.ORCHESTRATION_GET_RUN, (_event, runId: string) =>
    sendMacroRequest('novasyn-orchestrator', 'orchestrator.run_workflow', { action: 'get_run', runId }));

  // -- Settings & API Keys -------------------------------------------------
  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, () => loadSettings());
  ipcMain.handle(IPC_CHANNELS.SAVE_SETTINGS, (_event, updates) => { saveSettings(updates); refreshLoggerEnabled(); });
  ipcMain.handle(IPC_CHANNELS.GET_API_KEYS, () => loadApiKeys());
  ipcMain.handle(IPC_CHANNELS.SET_API_KEY, (_event, provider: string, key: string) => { saveApiKey(provider, key); });

  // -- Window Controls -----------------------------------------------------
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
