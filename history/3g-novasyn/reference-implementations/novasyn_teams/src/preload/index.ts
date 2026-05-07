import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI } from '../shared/types';
import { IPC_CHANNELS } from '../shared/types';

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
const electronAPI: ElectronAPI = {
  // Team CRUD
  teamCreate: (data) =>
    ipcRenderer.invoke(IPC_CHANNELS.TEAM_CREATE, data),
  teamGet: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.TEAM_GET, id),
  teamUpdate: (id, updates) =>
    ipcRenderer.invoke(IPC_CHANNELS.TEAM_UPDATE, id, updates),
  teamDelete: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.TEAM_DELETE, id),

  // Channel CRUD
  channelCreate: (data) =>
    ipcRenderer.invoke(IPC_CHANNELS.CHANNEL_CREATE, data),
  channelList: (teamId) =>
    ipcRenderer.invoke(IPC_CHANNELS.CHANNEL_LIST, teamId),
  channelGet: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.CHANNEL_GET, id),
  channelUpdate: (id, updates) =>
    ipcRenderer.invoke(IPC_CHANNELS.CHANNEL_UPDATE, id, updates),
  channelDelete: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.CHANNEL_DELETE, id),

  // Member CRUD
  memberList: (teamId) =>
    ipcRenderer.invoke(IPC_CHANNELS.MEMBER_LIST, teamId),
  memberAdd: (data) =>
    ipcRenderer.invoke(IPC_CHANNELS.MEMBER_ADD, data),
  memberUpdate: (id, updates) =>
    ipcRenderer.invoke(IPC_CHANNELS.MEMBER_UPDATE, id, updates),
  memberRemove: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.MEMBER_REMOVE, id),

  // Channel Members
  channelMemberAdd: (channelId, memberId) =>
    ipcRenderer.invoke(IPC_CHANNELS.CHANNEL_MEMBER_ADD, channelId, memberId),
  channelMemberRemove: (channelId, memberId) =>
    ipcRenderer.invoke(IPC_CHANNELS.CHANNEL_MEMBER_REMOVE, channelId, memberId),
  channelMemberList: (channelId) =>
    ipcRenderer.invoke(IPC_CHANNELS.CHANNEL_MEMBER_LIST, channelId),

  // Messages
  messageSend: (data) =>
    ipcRenderer.invoke(IPC_CHANNELS.MESSAGE_SEND, data),
  messageList: (channelId, limit?, offset?) =>
    ipcRenderer.invoke(IPC_CHANNELS.MESSAGE_LIST, channelId, limit, offset),
  messageEdit: (id, content) =>
    ipcRenderer.invoke(IPC_CHANNELS.MESSAGE_EDIT, id, content),
  messageDelete: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.MESSAGE_DELETE, id),
  messagePin: (id, isPinned) =>
    ipcRenderer.invoke(IPC_CHANNELS.MESSAGE_PIN, id, isPinned),
  messageReact: (id, emoji, memberId) =>
    ipcRenderer.invoke(IPC_CHANNELS.MESSAGE_REACT, id, emoji, memberId),
  messageSearch: (teamId, query) =>
    ipcRenderer.invoke(IPC_CHANNELS.MESSAGE_SEARCH, teamId, query),

  // Threads
  threadList: (parentMessageId) =>
    ipcRenderer.invoke(IPC_CHANNELS.THREAD_LIST, parentMessageId),

  // Calls
  callStart: (data) =>
    ipcRenderer.invoke(IPC_CHANNELS.CALL_START, data),
  callEnd: (id, data?) =>
    ipcRenderer.invoke(IPC_CHANNELS.CALL_END, id, data),
  callGetHistory: (channelId) =>
    ipcRenderer.invoke(IPC_CHANNELS.CALL_GET_HISTORY, channelId),

  // AI
  aiSummarizeChannel: (channelId, messageCount?) =>
    ipcRenderer.invoke(IPC_CHANNELS.AI_SUMMARIZE_CHANNEL, channelId, messageCount),
  aiDraftResponse: (channelId, context?) =>
    ipcRenderer.invoke(IPC_CHANNELS.AI_DRAFT_RESPONSE, channelId, context),
  aiRespondToMention: (channelId, senderId, content) =>
    ipcRenderer.invoke(IPC_CHANNELS.AI_RESPOND_TO_MENTION, channelId, senderId, content),

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

  // Macros
  macroGetRegistry: () =>
    ipcRenderer.invoke(IPC_CHANNELS.MACRO_GET_REGISTRY),
  macroGetAvailable: () =>
    ipcRenderer.invoke(IPC_CHANNELS.MACRO_GET_AVAILABLE),
  macroExecute: (macroName, input) =>
    ipcRenderer.invoke(IPC_CHANNELS.MACRO_EXECUTE, macroName, input),
  macroSendRequest: (targetApp, macro, input) =>
    ipcRenderer.invoke(IPC_CHANNELS.MACRO_SEND_REQUEST, targetApp, macro, input),
  macroCheckResponse: (requestId) =>
    ipcRenderer.invoke(IPC_CHANNELS.MACRO_CHECK_RESPONSE, requestId),

  // Orchestrations
  orchestrationList: () =>
    ipcRenderer.invoke(IPC_CHANNELS.ORCHESTRATION_LIST),
  orchestrationCreate: (data) =>
    ipcRenderer.invoke(IPC_CHANNELS.ORCHESTRATION_CREATE, data),
  orchestrationUpdate: (id, updates) =>
    ipcRenderer.invoke(IPC_CHANNELS.ORCHESTRATION_UPDATE, id, updates),
  orchestrationDelete: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.ORCHESTRATION_DELETE, id),
  orchestrationGet: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.ORCHESTRATION_GET, id),
  orchestrationRun: (id, input?) =>
    ipcRenderer.invoke(IPC_CHANNELS.ORCHESTRATION_RUN, id, input),
  orchestrationResume: (runId, decision) =>
    ipcRenderer.invoke(IPC_CHANNELS.ORCHESTRATION_RESUME, runId, decision),
  orchestrationGetRuns: (orchestrationId) =>
    ipcRenderer.invoke(IPC_CHANNELS.ORCHESTRATION_GET_RUNS, orchestrationId),
  orchestrationGetRun: (runId) =>
    ipcRenderer.invoke(IPC_CHANNELS.ORCHESTRATION_GET_RUN, runId),

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

  // Events -- message received in a channel
  onMessageReceived: (callback) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('message-received', handler);
    return () => ipcRenderer.removeListener('message-received', handler);
  },

  // Events -- member online/offline status change
  onMemberStatusChange: (callback) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('member-status-change', handler);
    return () => ipcRenderer.removeListener('member-status-change', handler);
  },

  // Events -- tray menu "New Team"
  onTrayNewTeam: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('tray-new-team', handler);
    return () => ipcRenderer.removeListener('tray-new-team', handler);
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

console.log('Preload script loaded, electronAPI exposed');
