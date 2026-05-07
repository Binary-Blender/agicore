// NovaSyn Social — Shared Types (Single Source of Truth)
// All interfaces, IPC channels, and ElectronAPI definitions

// ============================================================
// Settings
// ============================================================
export interface SocialSettings {
  theme: 'dark' | 'light';
  defaultModel: string;
  autoClassify: boolean;
  defaultResponseMode: ResponseMode;
  notificationsEnabled: boolean;
}

// ============================================================
// Union types (enums)
// ============================================================
export type ChannelType = 'email' | 'linkedin_dm' | 'linkedin_comment' | 'youtube_comment' | 'twitter_dm' | 'manual';
export type Direction = 'inbound' | 'outbound';
export type OpportunityType = 'job' | 'partnership' | 'sales_lead' | 'social' | 'logistics' | 'spam' | 'unknown';
export type Sentiment = 'positive' | 'neutral' | 'negative' | 'hostile';
export type Intent = 'informational' | 'promotional' | 'confrontational' | 'inquiry';
export type ResponseMode = 'standard' | 'agree_amplify' | 'educate' | 'battle';
export type ControlState = 'in_control' | 'warning' | 'out_of_control' | 'monitoring';
export type AutomationTier = 0 | 1 | 2 | 3;

// ============================================================
// Core entities
// ============================================================
export interface Account {
  id: string;
  platform: string;
  accountName: string;
  accountHandle: string | null;
  isConnected: boolean;
  isActive: boolean;
  lastSyncAt: string | null;
  syncCursor: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SyncStatus {
  accountId: string;
  platform: string;
  isSyncing: boolean;
  lastError: string | null;
  messagesSynced: number;
  lastSyncAt: string | null;
}

export interface CreateAccountInput {
  platform: string;
  accountName: string;
  accountHandle?: string;
}

export interface Thread {
  id: string;
  externalThreadId: string | null;
  platform: string;
  subject: string | null;
  participantCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  externalId: string | null;
  threadId: string | null;
  accountId: string | null;
  channelType: ChannelType;
  direction: Direction;
  senderName: string | null;
  senderHandle: string | null;
  subject: string | null;
  body: string;
  priorityScore: number;
  isRead: boolean;
  isArchived: boolean;
  isStarred: boolean;
  ingestionStatus: string;
  recipientEmail: string | null;
  inReplyTo: string | null;
  rawMetadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  // Joined data (optional, populated on detail view)
  classification?: Classification;
  drafts?: Draft[];
}

export interface CreateMessageInput {
  channelType: ChannelType;
  direction?: Direction;
  senderName?: string;
  senderHandle?: string;
  subject?: string;
  body: string;
  priorityScore?: number;
  accountId?: string;
}

export interface MessageFilters {
  channelType?: ChannelType;
  isRead?: boolean;
  isArchived?: boolean;
  isStarred?: boolean;
  minPriority?: number;
  opportunityType?: OpportunityType;
  sentiment?: Sentiment;
  search?: string;
}

export interface Classification {
  id: string;
  messageId: string;
  opportunityType: OpportunityType;
  sentiment: Sentiment;
  intent: Intent;
  topicAlignment: number;
  hostilityLevel: number;
  confidence: number;
  explanation: string | null;
  modelUsed: string | null;
  createdAt: string;
}

export interface Draft {
  id: string;
  messageId: string;
  responseMode: ResponseMode;
  draftText: string;
  confidence: number;
  rationale: string | null;
  modelUsed: string | null;
  isAccepted: boolean;
  isSent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackEvent {
  id: string;
  draftId: string;
  finalText: string | null;
  editDistance: number;
  editClassification: string | null;
  userRating: number | null;
  wasAccepted: boolean;
  wasSent: boolean;
  createdAt: string;
}

export interface CreateFeedbackInput {
  draftId: string;
  finalText?: string;
  editDistance?: number;
  editClassification?: string;
  userRating?: number;
  wasAccepted: boolean;
  wasSent?: boolean;
}

export interface SendDraftInput {
  draftId: string;
  finalText?: string; // Override draft text with edited version
}

export interface SpcMetric {
  id: string;
  channelType: string;
  responseMode: string;
  acceptanceRate: number;
  lightEditRate: number;
  heavyEditRate: number;
  misclassificationRate: number;
  sampleSize: number;
  controlState: ControlState;
  upperControlLimit: number | null;
  lowerControlLimit: number | null;
  meanValue: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationTierEntry {
  id: string;
  channelType: string;
  responseMode: string;
  currentTier: AutomationTier;
  reason: string | null;
  updatedAt: string;
}

export interface InboxStats {
  totalMessages: number;
  unreadCount: number;
  byChannel: Record<string, number>;
  byPriority: { high: number; medium: number; low: number };
  bySentiment: Record<string, number>;
}

export interface AIModel {
  id: string;
  name: string;
  provider: 'anthropic' | 'openai' | 'google' | 'xai';
  contextWindow: number;
  maxOutput: number;
  costPer1kInput: number;
  costPer1kOutput: number;
}

export type KBEntryType = 'style_example' | 'opinion' | 'gold_reply' | 'persona_note' | 'topic_brief';

export interface KBEntry {
  id: string;
  entryType: KBEntryType;
  title: string;
  content: string;
  channelType: string | null;
  responseMode: string | null;
  tags: string[];
  embedding: number[] | null;
  source: string;
  sourceId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateKBEntryInput {
  entryType: KBEntryType;
  title: string;
  content: string;
  channelType?: string;
  responseMode?: string;
  tags?: string[];
}

export interface KBFilters {
  entryType?: KBEntryType;
  channelType?: string;
  responseMode?: string;
  isActive?: boolean;
}

// ============================================================
// Orchestration types
// ============================================================

export type OrchestrationStepType = 'ai_action' | 'qc_checkpoint' | 'transform' | 'vault_save' | 'vault_load';

export interface OrchestrationStep {
  id: string;
  type: OrchestrationStepType;
  name: string;
  config: {
    model?: string;
    promptTemplate?: string;
    inputSource?: 'previous' | 'manual' | 'vault';
    vaultItemId?: string;
    outputType?: string;
    saveToVault?: boolean;
    tags?: string[];
    manualInput?: string;
    transformType?: 'extract_json' | 'format_text' | 'regex';
    transformPattern?: string;
    qcDescription?: string;
  };
}

export interface Orchestration {
  id: string;
  name: string;
  description: string;
  steps: OrchestrationStep[];
  isTemplate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StepResult {
  stepId: string;
  stepIndex: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'awaiting_qc';
  output: any;
  vaultItemId?: string;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  latencyMs?: number;
  qcDecision?: 'approved' | 'rejected' | null;
}

export interface OrchestrationRun {
  id: string;
  orchestrationId: string;
  status: 'pending' | 'running' | 'paused_for_qc' | 'completed' | 'failed';
  currentStepIndex: number;
  stepResults: StepResult[];
  error?: string;
  startedAt: string;
  pausedAt?: string;
  completedAt?: string;
}

// ============================================================
// IPC Channels
// ============================================================
export const IPC_CHANNELS = {
  // Messages
  GET_MESSAGES: 'GET_MESSAGES',
  GET_MESSAGE: 'GET_MESSAGE',
  CREATE_MESSAGE: 'CREATE_MESSAGE',
  UPDATE_MESSAGE: 'UPDATE_MESSAGE',
  DELETE_MESSAGE: 'DELETE_MESSAGE',
  SEARCH_MESSAGES: 'SEARCH_MESSAGES',

  // Classifications
  GET_CLASSIFICATION: 'GET_CLASSIFICATION',
  CLASSIFY_MESSAGE: 'CLASSIFY_MESSAGE',

  // Drafts
  GET_DRAFTS: 'GET_DRAFTS',
  GENERATE_DRAFT: 'GENERATE_DRAFT',
  UPDATE_DRAFT: 'UPDATE_DRAFT',
  SEND_DRAFT: 'SEND_DRAFT',
  GET_AUTOMATION_TIER_FOR: 'GET_AUTOMATION_TIER_FOR',

  // Feedback
  SUBMIT_FEEDBACK: 'SUBMIT_FEEDBACK',

  // SPC
  GET_SPC_METRICS: 'GET_SPC_METRICS',
  GET_AUTOMATION_TIERS: 'GET_AUTOMATION_TIERS',
  CALCULATE_SPC_METRICS: 'CALCULATE_SPC_METRICS',
  UPDATE_AUTOMATION_TIER: 'UPDATE_AUTOMATION_TIER',
  GET_REDLINE_TOPICS: 'GET_REDLINE_TOPICS',
  SAVE_REDLINE_TOPICS: 'SAVE_REDLINE_TOPICS',

  // Accounts
  GET_ACCOUNTS: 'GET_ACCOUNTS',
  CREATE_ACCOUNT: 'CREATE_ACCOUNT',
  UPDATE_ACCOUNT: 'UPDATE_ACCOUNT',
  DELETE_ACCOUNT: 'DELETE_ACCOUNT',
  CONNECT_PLATFORM: 'CONNECT_PLATFORM',
  DISCONNECT_ACCOUNT: 'DISCONNECT_ACCOUNT',

  // Sync
  SYNC_ACCOUNT: 'SYNC_ACCOUNT',
  SYNC_ALL: 'SYNC_ALL',
  GET_SYNC_STATUS: 'GET_SYNC_STATUS',
  SET_AUTO_SYNC: 'SET_AUTO_SYNC',

  // Stats
  GET_INBOX_STATS: 'GET_INBOX_STATS',

  // Settings & Config
  GET_SETTINGS: 'GET_SETTINGS',
  SAVE_SETTINGS: 'SAVE_SETTINGS',
  GET_API_KEYS: 'GET_API_KEYS',
  SET_API_KEY: 'SET_API_KEY',
  GET_MODELS: 'GET_MODELS',
  DISCOVER_MODELS: 'discover-models',

  // Window
  MINIMIZE_WINDOW: 'MINIMIZE_WINDOW',
  MAXIMIZE_WINDOW: 'MAXIMIZE_WINDOW',
  CLOSE_WINDOW: 'CLOSE_WINDOW',

  // Knowledge Base
  GET_KB_ENTRIES: 'GET_KB_ENTRIES',
  GET_KB_ENTRY: 'GET_KB_ENTRY',
  CREATE_KB_ENTRY: 'CREATE_KB_ENTRY',
  UPDATE_KB_ENTRY: 'UPDATE_KB_ENTRY',
  DELETE_KB_ENTRY: 'DELETE_KB_ENTRY',
  SEARCH_KB: 'SEARCH_KB',
  EMBED_KB_ENTRIES: 'EMBED_KB_ENTRIES',

  // Export
  EXPORT_MESSAGES_CSV: 'EXPORT_MESSAGES_CSV',
  EXPORT_SPC_JSON: 'EXPORT_SPC_JSON',

  // AI
  AI_STOP_GENERATION: 'AI_STOP_GENERATION',

  // System
  PING: 'ping',

  // NS Vault
  VAULT_LIST: 'vault-list',
  VAULT_STORE: 'vault-store',
  VAULT_GET: 'vault-get',
  VAULT_DELETE: 'vault-delete',
  VAULT_SEARCH: 'vault-search',
  VAULT_GET_TAGS: 'vault-get-tags',
  VAULT_ADD_TAG: 'vault-add-tag',
  VAULT_ANNOTATE: 'vault-annotate',
  VAULT_GET_ANNOTATIONS: 'vault-get-annotations',
  VAULT_GET_PROVENANCE: 'vault-get-provenance',

  // Macro Registry
  MACRO_GET_REGISTRY: 'macro-get-registry',
  MACRO_GET_AVAILABLE: 'macro-get-available',

  // Cross-App Queue
  MACRO_INVOKE: 'macro-invoke',
  MACRO_INVOKE_STATUS: 'macro-invoke-status',
  MACRO_GET_PENDING: 'macro-get-pending',
  // Orchestrations
  ORCH_LIST: 'orch-list',
  ORCH_CREATE: 'orch-create',
  ORCH_UPDATE: 'orch-update',
  ORCH_DELETE: 'orch-delete',
  ORCH_GET: 'orch-get',
  ORCH_RUN: 'orch-run',
  ORCH_RESUME: 'orch-resume',
  ORCH_GET_RUNS: 'orch-get-runs',
  ORCH_GET_RUN: 'orch-get-run',
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];

// ============================================================
// ElectronAPI
// ============================================================
export interface ElectronAPI {
  // Messages
  getMessages: (filters?: MessageFilters) => Promise<Message[]>;
  getMessage: (id: string) => Promise<Message | null>;
  createMessage: (input: CreateMessageInput) => Promise<Message>;
  updateMessage: (id: string, updates: Partial<Message>) => Promise<Message>;
  deleteMessage: (id: string) => Promise<void>;
  searchMessages: (query: string, filters?: MessageFilters) => Promise<Message[]>;

  // Classifications
  getClassification: (messageId: string) => Promise<Classification | null>;
  classifyMessage: (messageId: string, modelId?: string) => Promise<Classification>;

  // Drafts
  getDrafts: (messageId: string) => Promise<Draft[]>;
  generateDraft: (messageId: string, mode: ResponseMode, modelId?: string) => Promise<Draft>;
  updateDraft: (id: string, updates: Partial<Draft>) => Promise<Draft>;
  sendDraft: (input: SendDraftInput) => Promise<{ sent: boolean; error?: string }>;
  getAutomationTierFor: (channelType: string, responseMode: string) => Promise<AutomationTierEntry | null>;

  // Feedback
  submitFeedback: (input: CreateFeedbackInput) => Promise<FeedbackEvent>;

  // SPC
  getSpcMetrics: () => Promise<SpcMetric[]>;
  getAutomationTiers: () => Promise<AutomationTierEntry[]>;
  calculateSpcMetrics: () => Promise<{ recalculated: number }>;
  updateAutomationTier: (channelType: string, responseMode: string, tier: number, reason?: string) => Promise<AutomationTierEntry>;
  getRedlineTopics: () => Promise<string[]>;
  saveRedlineTopics: (topics: string[]) => Promise<string[]>;

  // Accounts
  getAccounts: () => Promise<Account[]>;
  createAccount: (input: CreateAccountInput) => Promise<Account>;
  updateAccount: (id: string, updates: Partial<Account>) => Promise<Account>;
  deleteAccount: (id: string) => Promise<void>;
  connectPlatform: (platform: string) => Promise<Account>;
  disconnectAccount: (id: string) => Promise<Account>;

  // Sync
  syncAccount: (accountId: string) => Promise<SyncStatus>;
  syncAll: () => Promise<SyncStatus[]>;
  getSyncStatus: () => Promise<SyncStatus[]>;
  setAutoSync: (enabled: boolean, intervalMinutes?: number) => Promise<{ enabled: boolean }>;

  // Stats
  getInboxStats: () => Promise<InboxStats>;

  // Settings & Config
  getSettings: () => Promise<SocialSettings>;
  saveSettings: (settings: Partial<SocialSettings>) => Promise<SocialSettings>;
  getApiKeys: () => Promise<Record<string, boolean>>;
  setApiKey: (provider: string, key: string) => Promise<void>;
  getModels: () => Promise<AIModel[]>;
  discoverModels: (forceRefresh?: boolean) => Promise<any[]>;

  // Export
  exportMessagesCsv: () => Promise<{ path: string } | null>;
  exportSpcJson: () => Promise<{ path: string } | null>;

  // Knowledge Base
  getKBEntries: (filters?: KBFilters) => Promise<KBEntry[]>;
  getKBEntry: (id: string) => Promise<KBEntry | null>;
  createKBEntry: (input: CreateKBEntryInput) => Promise<KBEntry>;
  updateKBEntry: (id: string, updates: Partial<CreateKBEntryInput> & { isActive?: boolean }) => Promise<KBEntry>;
  deleteKBEntry: (id: string) => Promise<void>;
  searchKB: (query: string, channelType?: string, responseMode?: string) => Promise<KBEntry[]>;
  embedKBEntries: () => Promise<{ embedded: number }>;

  // Window
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;

  // System
  ping: () => Promise<string>;

  // AI actions
  aiStopGeneration: () => Promise<void>;

  // Streaming
  onStreamChunk: (callback: (chunk: string) => void) => void;
  onStreamDone: (callback: () => void) => void;
  removeStreamListeners: () => void;

  // NS Vault
  vaultList(options?: { limit?: number; offset?: number }): Promise<any[]>;
  vaultStore(input: {
    itemType: string;
    title: string;
    content?: string | null;
    filePath?: string | null;
    outputTypeHint?: string | null;
    parentId?: string | null;
    metadata?: Record<string, unknown>;
    tags?: string[];
  }): Promise<any>;
  vaultGet(id: string): Promise<any | null>;
  vaultDelete(id: string): Promise<void>;
  vaultSearch(options: {
    itemType?: string;
    sourceApp?: string;
    tags?: string[];
    query?: string;
    parentId?: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]>;
  vaultGetTags(): Promise<any[]>;
  vaultAddTag(itemId: string, tagName: string, color?: string): Promise<void>;
  vaultAnnotate(itemId: string, content: string): Promise<any>;
  vaultGetAnnotations(itemId: string): Promise<any[]>;
  vaultGetProvenance(itemId: string): Promise<any[]>;

  // Macro Registry
  macroGetRegistry(): Promise<Record<string, any>>;
  macroGetAvailable(): Promise<Record<string, any>>;

  // Cross-App Queue
  macroInvoke(targetApp: string, macro: string, input: any, vaultParentId?: string): Promise<any>;
  macroInvokeStatus(requestId: string): Promise<any>;
  macroGetPending(): Promise<any[]>;

  // Orchestrations
  orchList(): Promise<Orchestration[]>;
  orchCreate(data: { name: string; description?: string; steps: OrchestrationStep[] }): Promise<Orchestration>;
  orchUpdate(id: string, updates: Partial<Orchestration>): Promise<Orchestration>;
  orchDelete(id: string): Promise<void>;
  orchGet(id: string): Promise<Orchestration | null>;
  orchRun(orchestrationId: string, manualInput?: string): Promise<OrchestrationRun>;
  orchResume(runId: string, decision: 'approved' | 'rejected'): Promise<OrchestrationRun>;
  orchGetRuns(orchestrationId: string): Promise<OrchestrationRun[]>;
  orchGetRun(runId: string): Promise<OrchestrationRun | null>;

  // Orchestration progress events
  onOrchStepProgress(callback: (data: { runId: string; stepIndex: number; status: string; output?: any }) => void): () => void;
}

// ============================================================
// Global Window augmentation
// ============================================================
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
