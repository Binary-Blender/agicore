import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI } from '../shared/types';
import { IPC_CHANNELS } from '../shared/types';

const electronAPI: ElectronAPI = {
  // Settings
  getSettings: () =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS),
  saveSettings: (settings) =>
    ipcRenderer.invoke(IPC_CHANNELS.SAVE_SETTINGS, settings),
  getApiKeys: () =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_API_KEYS),
  getModels: () =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_MODELS),
  discoverModels: (forceRefresh) =>
    ipcRenderer.invoke(IPC_CHANNELS.DISCOVER_MODELS, forceRefresh),

  // Personas
  getPersonas: () =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_PERSONAS),
  createPersona: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_PERSONA, input),
  updatePersona: (id, updates) =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_PERSONA, id, updates),
  deletePersona: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_PERSONA, id),

  // Skill Docs
  getSkillDocs: (personaId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_SKILL_DOCS, personaId),
  createSkillDoc: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_SKILL_DOC, input),
  updateSkillDoc: (id, updates) =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_SKILL_DOC, id, updates),
  deleteSkillDoc: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_SKILL_DOC, id),

  // Memories
  getMemories: (personaId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_MEMORIES, personaId),
  createMemory: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_MEMORY, input),
  updateMemory: (id, updates) =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_MEMORY, id, updates),
  deleteMemory: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_MEMORY, id),
  searchMemories: (personaId, query) =>
    ipcRenderer.invoke(IPC_CHANNELS.SEARCH_MEMORIES, personaId, query),
  extractMemories: (conversationId, personaId) =>
    ipcRenderer.invoke(IPC_CHANNELS.EXTRACT_MEMORIES, conversationId, personaId),
  supersedeMemory: (oldId, newId) =>
    ipcRenderer.invoke(IPC_CHANNELS.SUPERSEDE_MEMORY, oldId, newId),

  // Conversations
  getConversations: (personaId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_CONVERSATIONS, personaId),
  createConversation: (personaId, title) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_CONVERSATION, personaId, title),
  renameConversation: (id, title) =>
    ipcRenderer.invoke(IPC_CHANNELS.RENAME_CONVERSATION, id, title),
  deleteConversation: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_CONVERSATION, id),
  getConversationMessages: (conversationId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_CONVERSATION_MESSAGES, conversationId),
  sendPersonaMessage: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.SEND_PERSONA_MESSAGE, input),
  regenerateResponse: (conversationId, personaId) =>
    ipcRenderer.invoke(IPC_CHANNELS.REGENERATE_RESPONSE, conversationId, personaId),
  exportConversation: (conversationId) =>
    ipcRenderer.invoke(IPC_CHANNELS.EXPORT_CONVERSATION, conversationId),

  // Meetings
  getMeetings: () =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_MEETINGS),
  createMeeting: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_MEETING, input),
  deleteMeeting: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_MEETING, id),
  endMeeting: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.END_MEETING, id),
  getMeetingMessages: (meetingId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_MEETING_MESSAGES, meetingId),
  sendMeetingMessage: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.SEND_MEETING_MESSAGE, input),
  analyzeMeeting: (meetingId) =>
    ipcRenderer.invoke(IPC_CHANNELS.ANALYZE_MEETING, meetingId),
  callMeetingVote: (meetingId, question) =>
    ipcRenderer.invoke(IPC_CHANNELS.CALL_MEETING_VOTE, meetingId, question),
  exportMeeting: (meetingId) =>
    ipcRenderer.invoke(IPC_CHANNELS.EXPORT_MEETING, meetingId),

  // Action Items
  getActionItems: (meetingId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_ACTION_ITEMS, meetingId),
  createActionItem: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_ACTION_ITEM, input),
  updateActionItem: (id, updates) =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_ACTION_ITEM, id, updates),
  deleteActionItem: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_ACTION_ITEM, id),

  // Decision Records
  getDecisionRecords: (meetingId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_DECISION_RECORDS, meetingId),
  createDecisionRecord: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_DECISION_RECORD, input),
  deleteDecisionRecord: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_DECISION_RECORD, id),

  // Search
  globalSearch: (query) =>
    ipcRenderer.invoke(IPC_CHANNELS.GLOBAL_SEARCH, query),

  // Analytics
  getCostAnalytics: () =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_COST_ANALYTICS),

  // Relationships
  getRelationships: (personaId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_RELATIONSHIPS, personaId),
  createRelationship: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_RELATIONSHIP, input),
  updateRelationship: (id, updates) =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_RELATIONSHIP, id, updates),
  deleteRelationship: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_RELATIONSHIP, id),
  suggestRelationships: (meetingId) =>
    ipcRenderer.invoke(IPC_CHANNELS.SUGGEST_RELATIONSHIPS, meetingId),

  // Streaming
  onStreamChunk: (callback) => {
    const handler = (_event: any, text: string) => callback(text);
    ipcRenderer.on(IPC_CHANNELS.STREAM_CHUNK, handler);
    return () => { ipcRenderer.removeListener(IPC_CHANNELS.STREAM_CHUNK, handler); };
  },
  onStreamPersonaStart: (callback) => {
    const handler = (_event: any, personaId: string) => callback(personaId);
    ipcRenderer.on(IPC_CHANNELS.STREAM_PERSONA_START, handler);
    return () => { ipcRenderer.removeListener(IPC_CHANNELS.STREAM_PERSONA_START, handler); };
  },

  // NS Vault
  vaultList: (options) =>
    ipcRenderer.invoke(IPC_CHANNELS.VAULT_LIST, options),
  vaultStore: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.VAULT_STORE, input),
  vaultGet: (id: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.VAULT_GET, id),
  vaultDelete: (id: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.VAULT_DELETE, id),
  vaultSearch: (options) =>
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
  orchCreate: (data) => ipcRenderer.invoke(IPC_CHANNELS.ORCH_CREATE, data),
  orchUpdate: (id: string, updates) => ipcRenderer.invoke(IPC_CHANNELS.ORCH_UPDATE, id, updates),
  orchDelete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.ORCH_DELETE, id),
  orchGet: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.ORCH_GET, id),
  orchRun: (orchestrationId: string, manualInput?: string) => ipcRenderer.invoke(IPC_CHANNELS.ORCH_RUN, orchestrationId, manualInput),
  orchResume: (runId: string, decision: string) => ipcRenderer.invoke(IPC_CHANNELS.ORCH_RESUME, runId, decision),
  orchGetRuns: (orchestrationId: string) => ipcRenderer.invoke(IPC_CHANNELS.ORCH_GET_RUNS, orchestrationId),
  orchGetRun: (runId: string) => ipcRenderer.invoke(IPC_CHANNELS.ORCH_GET_RUN, runId),
  onOrchStepProgress: (callback) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('orch-step-progress', handler);
    return () => { ipcRenderer.removeListener('orch-step-progress', handler); };
  },

  // Window
  minimizeWindow: () =>
    ipcRenderer.send(IPC_CHANNELS.MINIMIZE_WINDOW),
  maximizeWindow: () =>
    ipcRenderer.send(IPC_CHANNELS.MAXIMIZE_WINDOW),
  closeWindow: () =>
    ipcRenderer.send(IPC_CHANNELS.CLOSE_WINDOW),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
