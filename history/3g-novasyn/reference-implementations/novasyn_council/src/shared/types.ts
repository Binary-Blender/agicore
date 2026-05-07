// NovaSyn Council — Shared Types

// ─── Data Interfaces ──────────────────────────────────────────────────────────

export interface Settings {
  theme: 'dark' | 'light';
  defaultModel: string;
  defaultTemperature: number;
}

export interface AIModel {
  id: string;
  name: string;
  provider: 'anthropic' | 'openai' | 'google' | 'xai' | 'babyai';
  contextWindow: number;
  requiresKey: boolean;
}

export interface Persona {
  id: string;
  name: string;
  role: string;
  department: string;
  avatarEmoji: string;
  bio: string;
  model: string;
  fallbackModel: string;
  temperature: number;
  systemPrompt: string;
  behaviorRules: string[];
  communicationStyle: string;
  totalConversations: number;
  totalTokensUsed: number;
  totalCost: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePersonaInput {
  name: string;
  role: string;
  department?: string;
  avatarEmoji?: string;
  bio?: string;
  model: string;
  fallbackModel?: string;
  temperature?: number;
  systemPrompt: string;
  behaviorRules?: string[];
  communicationStyle?: string;
}

export interface SkillDoc {
  id: string;
  personaId: string | null;
  title: string;
  content: string;
  category: 'domain' | 'technical' | 'business' | 'persona_specific' | 'meta';
  loadingRule: 'always' | 'available' | 'manual';
  tokenCount: number;
  relevanceTags: string[];
  source: string;
  timesReferenced: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSkillDocInput {
  personaId: string | null;
  title: string;
  content: string;
  category?: string;
  loadingRule?: string;
  relevanceTags?: string[];
  source?: string;
}

export interface Memory {
  id: string;
  personaId: string | null;
  memoryType: string;
  content: string;
  sourceMeetingId: string | null;
  sourceConversationId: string | null;
  importance: number;
  relevanceTags: string[];
  timesReferenced: number;
  supersededBy: string | null;
  appliesTo: string[] | null;
  createdAt: string;
}

export interface CreateMemoryInput {
  personaId: string | null;
  memoryType: string;
  content: string;
  sourceConversationId?: string;
  sourceMeetingId?: string;
  importance?: number;
  relevanceTags?: string[];
}

export interface Conversation {
  id: string;
  personaId: string;
  title: string;
  messageCount: number;
  totalTokens: number;
  totalCost: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  senderType: 'human' | 'persona';
  content: string;
  modelUsed: string | null;
  tokensIn: number | null;
  tokensOut: number | null;
  cost: number | null;
  responseTimeMs: number | null;
  skillDocsLoaded: string[];
  memoriesLoaded: string[];
  createdAt: string;
}

export interface SendMessageInput {
  conversationId: string;
  personaId: string;
  content: string;
}

export interface ExtractedMemory {
  type: string;
  content: string;
  importance: number;
  relevanceTags: string[];
}

export interface AIResponse {
  content: string;
  tokensIn: number;
  tokensOut: number;
  cost: number;
  modelUsed: string;
  responseTimeMs: number;
}

// ─── Meetings ──────────────────────────────────────────────────────────────────

export type MeetingType = 'brainstorm' | 'review' | 'standup' | 'decision' | 'pipeline';
export type MeetingStatus = 'active' | 'completed' | 'paused';

export interface Meeting {
  id: string;
  title: string;
  meetingType: MeetingType;
  agenda: string;
  status: MeetingStatus;
  participantIds: string[];
  totalTokens: number;
  totalCost: number;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingParticipant {
  id: string;
  meetingId: string;
  personaId: string;
  roleInMeeting: string;
  joinOrder: number;
}

export interface MeetingMessage {
  id: string;
  meetingId: string;
  senderType: 'human' | 'persona';
  senderPersonaId: string | null;
  content: string;
  modelUsed: string | null;
  tokensIn: number | null;
  tokensOut: number | null;
  cost: number | null;
  responseTimeMs: number | null;
  skillDocsLoaded: string[];
  memoriesLoaded: string[];
  createdAt: string;
}

export interface CreateMeetingInput {
  title: string;
  meetingType: MeetingType;
  agenda?: string;
  participantIds: string[];
}

export interface SendMeetingMessageInput {
  meetingId: string;
  content: string;
}

// ─── Action Items & Decision Records ────────────────────────────────────────

export type ActionItemStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type ActionItemPriority = 'high' | 'medium' | 'low';

export interface ActionItem {
  id: string;
  meetingId: string | null;
  assigneePersonaId: string | null;
  assigneeName: string;
  task: string;
  context: string;
  priority: ActionItemPriority;
  status: ActionItemStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateActionItemInput {
  meetingId?: string;
  assigneePersonaId?: string;
  assigneeName: string;
  task: string;
  context?: string;
  priority?: ActionItemPriority;
}

export interface DecisionRecord {
  id: string;
  meetingId: string | null;
  decision: string;
  reason: string;
  decidedBy: string;
  createdAt: string;
}

export interface CreateDecisionRecordInput {
  meetingId?: string;
  decision: string;
  reason?: string;
  decidedBy?: string;
}

// ─── Relationships ──────────────────────────────────────────────────────────

export type RelationshipType = 'ally' | 'rival' | 'mentor' | 'mentee' | 'collaborator' | 'challenger' | 'neutral';

export interface Relationship {
  id: string;
  personaId: string;
  relatedPersonaId: string;
  relationshipType: RelationshipType;
  description: string;
  dynamic: string | null;
  strength: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRelationshipInput {
  personaId: string;
  relatedPersonaId: string;
  relationshipType: RelationshipType;
  description: string;
  dynamic?: string;
  strength?: number;
}

export interface SuggestedRelationship {
  personaId: string;
  relatedPersonaId: string;
  relationshipType: RelationshipType;
  description: string;
  dynamic: string;
  strength: number;
  reason: string;
}

export interface MeetingAnalysis {
  consensus: { point: string; support: string }[];
  disagreements: { topic: string; sides: string }[];
  insights: string[];
  missingPerspectives: string[];
  actionItems: { assignee: string; task: string; priority: 'high' | 'medium' | 'low' }[];
  summary: string;
}

// ─── Meeting Votes ──────────────────────────────────────────────────────────

export type VotePosition = 'approve' | 'oppose' | 'abstain';

export interface PersonaVote {
  personaId: string;
  personaName: string;
  avatarEmoji: string;
  position: VotePosition;
  reasoning: string;
}

export interface MeetingVoteResult {
  question: string;
  votes: PersonaVote[];
  summary: string;
}

// ─── Search ─────────────────────────────────────────────────────────────────

export type SearchResultType = 'persona' | 'conversation' | 'meeting' | 'memory' | 'skilldoc' | 'action_item';

export interface SearchResult {
  type: SearchResultType;
  id: string;
  title: string;
  subtitle: string;
  snippet: string;
  parentId: string | null;
  emoji: string;
  timestamp: string;
}

// ─── Cost Analytics ──────────────────────────────────────────────────────────

export interface PersonaCostBreakdown {
  personaId: string;
  name: string;
  avatarEmoji: string;
  totalTokens: number;
  totalCost: number;
  conversationCount: number;
  meetingCount: number;
}

export interface ModelCostBreakdown {
  modelId: string;
  totalTokensIn: number;
  totalTokensOut: number;
  totalCost: number;
  messageCount: number;
}

export interface TopConsumer {
  type: 'conversation' | 'meeting';
  id: string;
  title: string;
  totalTokens: number;
  totalCost: number;
  personaName: string | null;
  emoji: string;
}

export interface CostAnalytics {
  totalTokens: number;
  totalCost: number;
  totalConversations: number;
  totalMeetings: number;
  totalMessages: number;
  perPersona: PersonaCostBreakdown[];
  perModel: ModelCostBreakdown[];
  topConsumers: TopConsumer[];
}

// ─── Orchestration types ──────────────────────────────────────────────────────

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

// ─── IPC Channels ─────────────────────────────────────────────────────────────

export const IPC_CHANNELS = {
  // Settings
  GET_SETTINGS: 'GET_SETTINGS',
  SAVE_SETTINGS: 'SAVE_SETTINGS',
  GET_API_KEYS: 'GET_API_KEYS',
  GET_MODELS: 'GET_MODELS',
  DISCOVER_MODELS: 'discover-models',

  // Personas
  GET_PERSONAS: 'GET_PERSONAS',
  CREATE_PERSONA: 'CREATE_PERSONA',
  UPDATE_PERSONA: 'UPDATE_PERSONA',
  DELETE_PERSONA: 'DELETE_PERSONA',

  // Skill Docs
  GET_SKILL_DOCS: 'GET_SKILL_DOCS',
  CREATE_SKILL_DOC: 'CREATE_SKILL_DOC',
  UPDATE_SKILL_DOC: 'UPDATE_SKILL_DOC',
  DELETE_SKILL_DOC: 'DELETE_SKILL_DOC',

  // Memories
  GET_MEMORIES: 'GET_MEMORIES',
  CREATE_MEMORY: 'CREATE_MEMORY',
  UPDATE_MEMORY: 'UPDATE_MEMORY',
  DELETE_MEMORY: 'DELETE_MEMORY',
  SEARCH_MEMORIES: 'SEARCH_MEMORIES',
  EXTRACT_MEMORIES: 'EXTRACT_MEMORIES',
  SUPERSEDE_MEMORY: 'SUPERSEDE_MEMORY',

  // Conversations
  GET_CONVERSATIONS: 'GET_CONVERSATIONS',
  CREATE_CONVERSATION: 'CREATE_CONVERSATION',
  RENAME_CONVERSATION: 'RENAME_CONVERSATION',
  DELETE_CONVERSATION: 'DELETE_CONVERSATION',
  GET_CONVERSATION_MESSAGES: 'GET_CONVERSATION_MESSAGES',
  SEND_PERSONA_MESSAGE: 'SEND_PERSONA_MESSAGE',
  REGENERATE_RESPONSE: 'REGENERATE_RESPONSE',
  EXPORT_CONVERSATION: 'EXPORT_CONVERSATION',

  // Meetings
  GET_MEETINGS: 'GET_MEETINGS',
  CREATE_MEETING: 'CREATE_MEETING',
  DELETE_MEETING: 'DELETE_MEETING',
  END_MEETING: 'END_MEETING',
  GET_MEETING_MESSAGES: 'GET_MEETING_MESSAGES',
  SEND_MEETING_MESSAGE: 'SEND_MEETING_MESSAGE',
  ANALYZE_MEETING: 'ANALYZE_MEETING',
  CALL_MEETING_VOTE: 'CALL_MEETING_VOTE',
  EXPORT_MEETING: 'EXPORT_MEETING',

  // Action Items
  GET_ACTION_ITEMS: 'GET_ACTION_ITEMS',
  CREATE_ACTION_ITEM: 'CREATE_ACTION_ITEM',
  UPDATE_ACTION_ITEM: 'UPDATE_ACTION_ITEM',
  DELETE_ACTION_ITEM: 'DELETE_ACTION_ITEM',

  // Decision Records
  GET_DECISION_RECORDS: 'GET_DECISION_RECORDS',
  CREATE_DECISION_RECORD: 'CREATE_DECISION_RECORD',
  DELETE_DECISION_RECORD: 'DELETE_DECISION_RECORD',

  // Search
  GLOBAL_SEARCH: 'GLOBAL_SEARCH',

  // Analytics
  GET_COST_ANALYTICS: 'GET_COST_ANALYTICS',

  // Relationships
  GET_RELATIONSHIPS: 'GET_RELATIONSHIPS',
  CREATE_RELATIONSHIP: 'CREATE_RELATIONSHIP',
  UPDATE_RELATIONSHIP: 'UPDATE_RELATIONSHIP',
  DELETE_RELATIONSHIP: 'DELETE_RELATIONSHIP',
  SUGGEST_RELATIONSHIPS: 'SUGGEST_RELATIONSHIPS',

  // Streaming
  STREAM_CHUNK: 'STREAM_CHUNK',
  STREAM_PERSONA_START: 'STREAM_PERSONA_START',

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

  // Window
  MINIMIZE_WINDOW: 'MINIMIZE_WINDOW',
  MAXIMIZE_WINDOW: 'MAXIMIZE_WINDOW',
  CLOSE_WINDOW: 'CLOSE_WINDOW',
} as const;

// ─── Electron API ─────────────────────────────────────────────────────────────

export interface ElectronAPI {
  // Settings
  getSettings(): Promise<Settings>;
  saveSettings(settings: Partial<Settings>): Promise<void>;
  getApiKeys(): Promise<Record<string, string>>;
  getModels(): Promise<AIModel[]>;
  discoverModels(forceRefresh?: boolean): Promise<AIModel[]>;

  // Personas
  getPersonas(): Promise<Persona[]>;
  createPersona(input: CreatePersonaInput): Promise<Persona>;
  updatePersona(id: string, updates: Partial<Persona>): Promise<Persona>;
  deletePersona(id: string): Promise<void>;

  // Skill Docs
  getSkillDocs(personaId: string | null): Promise<SkillDoc[]>;
  createSkillDoc(input: CreateSkillDocInput): Promise<SkillDoc>;
  updateSkillDoc(id: string, updates: Partial<SkillDoc>): Promise<SkillDoc>;
  deleteSkillDoc(id: string): Promise<void>;

  // Memories
  getMemories(personaId: string | null): Promise<Memory[]>;
  createMemory(input: CreateMemoryInput): Promise<Memory>;
  updateMemory(id: string, updates: Partial<Memory>): Promise<Memory>;
  deleteMemory(id: string): Promise<void>;
  searchMemories(personaId: string | null, query: string): Promise<Memory[]>;
  extractMemories(conversationId: string, personaId: string): Promise<ExtractedMemory[]>;
  supersedeMemory(oldId: string, newId: string): Promise<void>;

  // Conversations
  getConversations(personaId: string): Promise<Conversation[]>;
  createConversation(personaId: string, title?: string): Promise<Conversation>;
  renameConversation(id: string, title: string): Promise<void>;
  deleteConversation(id: string): Promise<void>;
  getConversationMessages(conversationId: string): Promise<ConversationMessage[]>;
  sendPersonaMessage(input: SendMessageInput): Promise<{ userMessage: ConversationMessage; aiMessage: ConversationMessage }>;
  regenerateResponse(conversationId: string, personaId: string): Promise<{ aiMessage: ConversationMessage }>;
  exportConversation(conversationId: string): Promise<string | null>;

  // Meetings
  getMeetings(): Promise<Meeting[]>;
  createMeeting(input: CreateMeetingInput): Promise<Meeting>;
  deleteMeeting(id: string): Promise<void>;
  endMeeting(id: string): Promise<void>;
  getMeetingMessages(meetingId: string): Promise<MeetingMessage[]>;
  sendMeetingMessage(input: SendMeetingMessageInput): Promise<{ userMessage: MeetingMessage; personaMessages: MeetingMessage[] }>;
  analyzeMeeting(meetingId: string): Promise<MeetingAnalysis>;
  callMeetingVote(meetingId: string, question: string): Promise<MeetingVoteResult>;
  exportMeeting(meetingId: string): Promise<string | null>;

  // Action Items
  getActionItems(meetingId?: string): Promise<ActionItem[]>;
  createActionItem(input: CreateActionItemInput): Promise<ActionItem>;
  updateActionItem(id: string, updates: Partial<ActionItem>): Promise<ActionItem>;
  deleteActionItem(id: string): Promise<void>;

  // Decision Records
  getDecisionRecords(meetingId?: string): Promise<DecisionRecord[]>;
  createDecisionRecord(input: CreateDecisionRecordInput): Promise<DecisionRecord>;
  deleteDecisionRecord(id: string): Promise<void>;

  // Search
  globalSearch(query: string): Promise<SearchResult[]>;

  // Analytics
  getCostAnalytics(): Promise<CostAnalytics>;

  // Relationships
  getRelationships(personaId: string): Promise<Relationship[]>;
  createRelationship(input: CreateRelationshipInput): Promise<Relationship>;
  updateRelationship(id: string, updates: Partial<Relationship>): Promise<Relationship>;
  deleteRelationship(id: string): Promise<void>;
  suggestRelationships(meetingId: string): Promise<SuggestedRelationship[]>;

  // Streaming
  onStreamChunk(callback: (text: string) => void): () => void;
  onStreamPersonaStart(callback: (personaId: string) => void): () => void;

  // NS Vault
  vaultList: (options?: { limit?: number; offset?: number }) => Promise<any[]>;
  vaultStore: (input: {
    itemType: string;
    title: string;
    content?: string | null;
    filePath?: string | null;
    outputTypeHint?: string | null;
    parentId?: string | null;
    metadata?: Record<string, unknown>;
    tags?: string[];
  }) => Promise<any>;
  vaultGet: (id: string) => Promise<any | null>;
  vaultDelete: (id: string) => Promise<void>;
  vaultSearch: (options: {
    itemType?: string;
    sourceApp?: string;
    tags?: string[];
    query?: string;
    parentId?: string;
    limit?: number;
    offset?: number;
  }) => Promise<any[]>;
  vaultGetTags: () => Promise<any[]>;
  vaultAddTag: (itemId: string, tagName: string, color?: string) => Promise<void>;
  vaultAnnotate: (itemId: string, content: string) => Promise<any>;
  vaultGetAnnotations: (itemId: string) => Promise<any[]>;
  vaultGetProvenance: (itemId: string) => Promise<any[]>;

  // Macro Registry
  macroGetRegistry: () => Promise<Record<string, any>>;
  macroGetAvailable: () => Promise<Record<string, any>>;

  // Cross-App Queue
  macroInvoke: (targetApp: string, macro: string, input: any, vaultParentId?: string) => Promise<any>;
  macroInvokeStatus: (requestId: string) => Promise<any>;
  macroGetPending: () => Promise<any[]>;

  // Orchestrations
  orchList: () => Promise<Orchestration[]>;
  orchCreate: (data: { name: string; description?: string; steps: OrchestrationStep[] }) => Promise<Orchestration>;
  orchUpdate: (id: string, updates: Partial<Orchestration>) => Promise<Orchestration>;
  orchDelete: (id: string) => Promise<void>;
  orchGet: (id: string) => Promise<Orchestration | null>;
  orchRun: (orchestrationId: string, manualInput?: string) => Promise<OrchestrationRun>;
  orchResume: (runId: string, decision: 'approved' | 'rejected') => Promise<OrchestrationRun>;
  orchGetRuns: (orchestrationId: string) => Promise<OrchestrationRun[]>;
  orchGetRun: (runId: string) => Promise<OrchestrationRun | null>;

  // Orchestration progress events
  onOrchStepProgress: (callback: (data: { runId: string; stepIndex: number; status: string; output?: any }) => void) => () => void;

  // Window
  minimizeWindow(): void;
  maximizeWindow(): void;
  closeWindow(): void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
