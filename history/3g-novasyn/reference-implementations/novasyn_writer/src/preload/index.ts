import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI } from '../shared/types';
import { IPC_CHANNELS } from '../shared/types';

const electronAPI: ElectronAPI = {
  // Projects
  getProjects: () =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_PROJECTS),
  createProject: (name, description) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_PROJECT, name, description),
  updateProject: (id, updates) =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_PROJECT, id, updates),
  deleteProject: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_PROJECT, id),

  // Chapters
  getChapters: (projectId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_CHAPTERS, projectId),
  createChapter: (projectId, title) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_CHAPTER, projectId, title),
  updateChapter: (id, updates) =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_CHAPTER, id, updates),
  deleteChapter: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_CHAPTER, id),
  reorderChapters: (chapterIds) =>
    ipcRenderer.invoke(IPC_CHANNELS.REORDER_CHAPTERS, chapterIds),

  // Sections
  getSections: (chapterId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_SECTIONS, chapterId),
  createSection: (chapterId, title) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_SECTION, chapterId, title),
  updateSection: (id, updates) =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_SECTION, id, updates),
  deleteSection: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_SECTION, id),
  reorderSections: (sectionIds) =>
    ipcRenderer.invoke(IPC_CHANNELS.REORDER_SECTIONS, sectionIds),

  // Encyclopedia
  getEncyclopedia: (projectId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_ENCYCLOPEDIA, projectId),
  createEncyclopediaEntry: (projectId, entry) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_ENCYCLOPEDIA_ENTRY, projectId, entry),
  updateEncyclopediaEntry: (id, updates) =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_ENCYCLOPEDIA_ENTRY, id, updates),
  deleteEncyclopediaEntry: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_ENCYCLOPEDIA_ENTRY, id),
  searchEncyclopedia: (projectId, query) =>
    ipcRenderer.invoke(IPC_CHANNELS.SEARCH_ENCYCLOPEDIA, projectId, query),

  // Outlines
  getOutline: (chapterId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_OUTLINE, chapterId),
  saveOutline: (chapterId, beats) =>
    ipcRenderer.invoke(IPC_CHANNELS.SAVE_OUTLINE, chapterId, beats),

  // Versions
  getVersions: (chapterId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_VERSIONS, chapterId),
  createVersion: (chapterId, snapshotName, source) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_VERSION, chapterId, snapshotName, source),
  restoreVersion: (versionId) =>
    ipcRenderer.invoke(IPC_CHANNELS.RESTORE_VERSION, versionId),
  deleteVersion: (versionId) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_VERSION, versionId),

  // AI Operations
  getAiOperations: (projectId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_AI_OPERATIONS, projectId),
  updateAiOperation: (id, updates) =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_AI_OPERATION, id, updates),

  // AI
  sendPrompt: (prompt, modelId, context) =>
    ipcRenderer.invoke(IPC_CHANNELS.SEND_PROMPT, prompt, modelId, context),
  cancelStream: () =>
    ipcRenderer.invoke(IPC_CHANNELS.CANCEL_STREAM),
  compareModels: (prompt, modelIds, context) =>
    ipcRenderer.invoke(IPC_CHANNELS.COMPARE_MODELS, prompt, modelIds, context),
  onAiDelta: (callback) => {
    const handler = (_event: any, text: string) => callback(text);
    ipcRenderer.on('ai-stream-delta', handler);
    return () => ipcRenderer.removeListener('ai-stream-delta', handler);
  },

  // Export
  exportProject: (projectId, options) =>
    ipcRenderer.invoke(IPC_CHANNELS.EXPORT_PROJECT, projectId, options),

  // Settings
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS),
  saveSettings: (updates) =>
    ipcRenderer.invoke(IPC_CHANNELS.SAVE_SETTINGS, updates),

  // Models & API Keys
  getModels: () => ipcRenderer.invoke(IPC_CHANNELS.GET_MODELS),
  getApiKeys: () => ipcRenderer.invoke(IPC_CHANNELS.GET_API_KEYS),
  setApiKey: (provider, key) =>
    ipcRenderer.invoke(IPC_CHANNELS.SET_API_KEY, provider, key),

  // Sessions
  startSession: (projectId, startWordCount) =>
    ipcRenderer.invoke(IPC_CHANNELS.START_SESSION, projectId, startWordCount),
  endSession: (sessionId, endWordCount, wordsAdded, aiWordsAccepted, aiOpsCount) =>
    ipcRenderer.invoke(IPC_CHANNELS.END_SESSION, sessionId, endWordCount, wordsAdded, aiWordsAccepted, aiOpsCount),
  updateSession: (sessionId, durationSeconds, endWordCount, wordsAdded, aiWordsAccepted, aiOpsCount) =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_SESSION, sessionId, durationSeconds, endWordCount, wordsAdded, aiWordsAccepted, aiOpsCount),
  getSessions: (projectId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_SESSIONS, projectId),
  getSessionStats: (projectId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_SESSION_STATS, projectId),

  // Goals
  getGoals: (projectId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_GOALS, projectId),
  setGoal: (projectId, goalType, targetWords) =>
    ipcRenderer.invoke(IPC_CHANNELS.SET_GOAL, projectId, goalType, targetWords),
  deleteGoal: (goalId) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_GOAL, goalId),

  // Discovery
  startDiscovery: (projectId, chapterId) =>
    ipcRenderer.invoke(IPC_CHANNELS.START_DISCOVERY, projectId, chapterId),
  endDiscovery: (sessionId) =>
    ipcRenderer.invoke(IPC_CHANNELS.END_DISCOVERY, sessionId),
  getDiscoverySessions: (projectId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_DISCOVERY_SESSIONS, projectId),
  generateSuggestions: (sessionId, chapterContent, encyclopediaContext, followThread, temperature) =>
    ipcRenderer.invoke(IPC_CHANNELS.GENERATE_SUGGESTIONS, sessionId, chapterContent, encyclopediaContext, followThread, temperature),
  acceptSuggestion: (suggestionId) =>
    ipcRenderer.invoke(IPC_CHANNELS.ACCEPT_SUGGESTION, suggestionId),
  setFollowThread: (sessionId, followThread) =>
    ipcRenderer.invoke(IPC_CHANNELS.SET_FOLLOW_THREAD, sessionId, followThread),
  convertDiscovery: (sessionId) =>
    ipcRenderer.invoke(IPC_CHANNELS.CONVERT_DISCOVERY, sessionId),

  // Continuity — Plants
  getPlants: (projectId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_PLANTS, projectId),
  createPlant: (projectId, plant) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_PLANT, projectId, plant),
  updatePlant: (id, updates) =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_PLANT, id, updates),
  deletePlant: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_PLANT, id),

  // Continuity — Threads
  getThreads: (projectId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_THREADS, projectId),
  createThread: (projectId, thread) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_THREAD, projectId, thread),
  updateThread: (id, updates) =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_THREAD, id, updates),
  deleteThread: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_THREAD, id),

  // Continuity — Character Knowledge
  getCharacterKnowledge: (projectId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_CHARACTER_KNOWLEDGE, projectId),
  createCharacterKnowledge: (projectId, entry) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_CHARACTER_KNOWLEDGE, projectId, entry),
  updateCharacterKnowledge: (id, updates) =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_CHARACTER_KNOWLEDGE, id, updates),
  deleteCharacterKnowledge: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_CHARACTER_KNOWLEDGE, id),

  // Continuity — AI Scans
  scanForPlants: (projectId) =>
    ipcRenderer.invoke(IPC_CHANNELS.SCAN_FOR_PLANTS, projectId),
  scanForThreads: (projectId) =>
    ipcRenderer.invoke(IPC_CHANNELS.SCAN_FOR_THREADS, projectId),
  verifyKnowledge: (projectId, characterId) =>
    ipcRenderer.invoke(IPC_CHANNELS.VERIFY_KNOWLEDGE, projectId, characterId),

  // Knowledge Base
  getKbEntries: (projectId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_KB_ENTRIES, projectId),
  createKbEntry: (entry) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_KB_ENTRY, entry),
  updateKbEntry: (id, updates) =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_KB_ENTRY, id, updates),
  deleteKbEntry: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_KB_ENTRY, id),
  searchKb: (projectId, query) =>
    ipcRenderer.invoke(IPC_CHANNELS.SEARCH_KB, projectId, query),
  kbAnalyzeVoice: (entryId) =>
    ipcRenderer.invoke(IPC_CHANNELS.KB_ANALYZE_VOICE, entryId),
  kbFindConnections: (projectId) =>
    ipcRenderer.invoke(IPC_CHANNELS.KB_FIND_CONNECTIONS, projectId),
  kbSuggestGaps: (projectId) =>
    ipcRenderer.invoke(IPC_CHANNELS.KB_SUGGEST_GAPS, projectId),

  // Encyclopedia AI
  encyclopediaGenerateProfile: (entryId) =>
    ipcRenderer.invoke(IPC_CHANNELS.ENCYCLOPEDIA_GENERATE_PROFILE, entryId),
  encyclopediaExtractEntries: (projectId) =>
    ipcRenderer.invoke(IPC_CHANNELS.ENCYCLOPEDIA_EXTRACT_ENTRIES, projectId),
  encyclopediaCheckConsistency: (projectId) =>
    ipcRenderer.invoke(IPC_CHANNELS.ENCYCLOPEDIA_CHECK_CONSISTENCY, projectId),

  // Pipelines
  getPipelines: (projectId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_PIPELINES, projectId),
  createPipeline: (projectId, pipeline) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_PIPELINE, projectId, pipeline),
  updatePipeline: (id, updates) =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_PIPELINE, id, updates),
  deletePipeline: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_PIPELINE, id),
  runPipeline: (pipelineId, inputText) =>
    ipcRenderer.invoke(IPC_CHANNELS.RUN_PIPELINE, pipelineId, inputText),

  // Brain Dumps
  getBrainDumps: (projectId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_BRAIN_DUMPS, projectId),
  createBrainDump: (projectId, content) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_BRAIN_DUMP, projectId, content),
  updateBrainDump: (id, content) =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_BRAIN_DUMP, id, content),
  deleteBrainDump: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_BRAIN_DUMP, id),
  extractBrainDump: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.EXTRACT_BRAIN_DUMP, id),

  // Analysis
  runAnalysis: (projectId, type, chapterId) =>
    ipcRenderer.invoke(IPC_CHANNELS.RUN_ANALYSIS, projectId, type, chapterId),
  getAnalyses: (projectId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_ANALYSES, projectId),
  deleteAnalysis: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_ANALYSIS, id),
  getReadability: (projectId, chapterId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_READABILITY, projectId, chapterId),
  getOverusedWords: (projectId, chapterId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_OVERUSED_WORDS, projectId, chapterId),

  // Character Relationships
  getRelationships: (projectId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_RELATIONSHIPS, projectId),
  createRelationship: (projectId, rel) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_RELATIONSHIP, projectId, rel),
  updateRelationship: (id, updates) =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_RELATIONSHIP, id, updates),
  deleteRelationship: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_RELATIONSHIP, id),
  scanRelationships: (projectId) =>
    ipcRenderer.invoke(IPC_CHANNELS.SCAN_RELATIONSHIPS, projectId),

  // Submission Package
  generateSubmissionPackage: (projectId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GENERATE_SUBMISSION_PACKAGE, projectId),

  // Dashboard
  getWritingStats: (projectId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_WRITING_STATS, projectId),

  // Import
  importFiles: (projectId) =>
    ipcRenderer.invoke(IPC_CHANNELS.IMPORT_FILES, projectId),

  // Cover Designer
  exportCover: (dataUrl, projectName) =>
    ipcRenderer.invoke(IPC_CHANNELS.EXPORT_COVER, dataUrl, projectName),

  // Chapter Notes
  getChapterNotes: (chapterId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_CHAPTER_NOTES, chapterId),
  saveChapterNote: (chapterId, content) =>
    ipcRenderer.invoke(IPC_CHANNELS.SAVE_CHAPTER_NOTE, chapterId, content),

  // Publishing Presets
  validatePublishingPreset: (projectId, presetId) =>
    ipcRenderer.invoke(IPC_CHANNELS.VALIDATE_PUBLISHING_PRESET, projectId, presetId),

  // Inline Comments
  getComments: (chapterId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_COMMENTS, chapterId),
  createComment: (comment) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_COMMENT, comment),
  updateComment: (id, updates) =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_COMMENT, id, updates),
  deleteComment: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_COMMENT, id),

  // Tracked Changes
  getTrackedChanges: (chapterId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_TRACKED_CHANGES, chapterId),
  createTrackedChange: (change) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_TRACKED_CHANGE, change),
  deleteTrackedChange: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_TRACKED_CHANGE, id),
  clearTrackedChanges: (chapterId) =>
    ipcRenderer.invoke(IPC_CHANNELS.CLEAR_TRACKED_CHANGES, chapterId),

  // Writing Sprints
  startSprint: (projectId, durationSeconds, targetWords) =>
    ipcRenderer.invoke(IPC_CHANNELS.START_SPRINT, projectId, durationSeconds, targetWords),
  endSprint: (sprintId, wordsWritten) =>
    ipcRenderer.invoke(IPC_CHANNELS.END_SPRINT, sprintId, wordsWritten),
  getSprints: (projectId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_SPRINTS, projectId),

  // Custom Templates
  getCustomTemplates: () =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_CUSTOM_TEMPLATES),
  createCustomTemplate: (template) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_CUSTOM_TEMPLATE, template),
  deleteCustomTemplate: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_CUSTOM_TEMPLATE, id),

  // Feedback Dashboard
  generateRevisionPlan: (projectId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GENERATE_REVISION_PLAN, projectId),
  getRevisionPlans: (projectId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_REVISION_PLANS, projectId),
  deleteRevisionPlan: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_REVISION_PLAN, id),

  // AI Font Pairings
  suggestFontPairings: (genre, mood) =>
    ipcRenderer.invoke(IPC_CHANNELS.SUGGEST_FONT_PAIRINGS, genre, mood),

  // Cover Image
  selectCoverImage: () =>
    ipcRenderer.invoke(IPC_CHANNELS.SELECT_COVER_IMAGE),

  // Review Copy Export
  exportReviewCopy: (projectId, options) =>
    ipcRenderer.invoke(IPC_CHANNELS.EXPORT_REVIEW_COPY, projectId, options),

  // Project Backup
  backupProject: (projectId) =>
    ipcRenderer.invoke(IPC_CHANNELS.BACKUP_PROJECT, projectId),
  restoreProject: () =>
    ipcRenderer.invoke(IPC_CHANNELS.RESTORE_PROJECT),

  // Master Page Presets
  getMasterPages: () =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_MASTER_PAGES),
  createMasterPage: (preset) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_MASTER_PAGE, preset),
  deleteMasterPage: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_MASTER_PAGE, id),

  // Import DOCX Tracked Changes
  importDocxChanges: (chapterId) =>
    ipcRenderer.invoke(IPC_CHANNELS.IMPORT_DOCX_CHANGES, chapterId),

  // Auto-Updater
  checkForUpdates: () =>
    ipcRenderer.invoke(IPC_CHANNELS.CHECK_FOR_UPDATES),

  // Insert Image (Full Page)
  insertImage: () =>
    ipcRenderer.invoke(IPC_CHANNELS.INSERT_IMAGE),

  // Import PDF Annotations
  importPdfAnnotations: (chapterId) =>
    ipcRenderer.invoke(IPC_CHANNELS.IMPORT_PDF_ANNOTATIONS, chapterId),

  // Cover Designer: Full Wrap Export
  exportCoverFullWrap: (dataUrl, projectName) =>
    ipcRenderer.invoke(IPC_CHANNELS.EXPORT_COVER_FULL_WRAP, dataUrl, projectName),

  // Cover Designer: Upload Layer Image
  uploadCoverImage: () =>
    ipcRenderer.invoke(IPC_CHANNELS.UPLOAD_COVER_IMAGE),

  // Plugin System
  getPlugins: () =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_PLUGINS),
  togglePlugin: (pluginId, enabled) =>
    ipcRenderer.invoke(IPC_CHANNELS.TOGGLE_PLUGIN, pluginId, enabled),
  runPlugin: (pluginId, context) =>
    ipcRenderer.invoke(IPC_CHANNELS.RUN_PLUGIN, pluginId, context),

  // NovaSyn Ecosystem Exchange
  sendToExchange: (packet) =>
    ipcRenderer.invoke(IPC_CHANNELS.SEND_TO_EXCHANGE, packet),
  receiveFromExchange: () =>
    ipcRenderer.invoke(IPC_CHANNELS.RECEIVE_FROM_EXCHANGE),
  listExchangePackets: () =>
    ipcRenderer.invoke(IPC_CHANNELS.LIST_EXCHANGE_PACKETS),
  deleteExchangePacket: (packetId) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_EXCHANGE_PACKET, packetId),

  // Writing Guide
  getGuideMessages: (projectId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_GUIDE_MESSAGES, projectId),
  sendGuideMessage: (projectId, message) =>
    ipcRenderer.invoke(IPC_CHANNELS.SEND_GUIDE_MESSAGE, projectId, message),
  clearGuideMessages: (projectId) =>
    ipcRenderer.invoke(IPC_CHANNELS.CLEAR_GUIDE_MESSAGES, projectId),

  // Global Search
  globalSearch: (projectId, query) =>
    ipcRenderer.invoke(IPC_CHANNELS.GLOBAL_SEARCH, projectId, query),

  // Timeline
  getTimelineEvents: (projectId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_TIMELINE_EVENTS, projectId),
  createTimelineEvent: (projectId, event) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_TIMELINE_EVENT, projectId, event),
  updateTimelineEvent: (id, updates) =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_TIMELINE_EVENT, id, updates),
  deleteTimelineEvent: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_TIMELINE_EVENT, id),

  // Chapter Targets
  getChapterTargets: (projectId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_CHAPTER_TARGETS, projectId),
  setChapterTarget: (chapterId, targetWords) =>
    ipcRenderer.invoke(IPC_CHANNELS.SET_CHAPTER_TARGET, chapterId, targetWords),
  deleteChapterTarget: (chapterId) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_CHAPTER_TARGET, chapterId),

  // Window methods
  minimizeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.MINIMIZE_WINDOW),
  maximizeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.MAXIMIZE_WINDOW),
  closeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.CLOSE_WINDOW),

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
    return () => ipcRenderer.removeListener('orch-step-progress', handler);
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

console.log('Preload script loaded, electronAPI exposed');
