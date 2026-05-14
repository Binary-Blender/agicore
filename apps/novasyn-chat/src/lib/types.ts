// Agicore Generated TypeScript Types
// App: novasyn_chat

export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  email: string;
  name?: string;
}

export interface UpdateUserInput {
  email?: string;
  name?: string;
}

export interface Workspace {
  id: string;
  name: string;
  dbPath: string;
  isActive: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkspaceInput {
  name: string;
  dbPath: string;
  isActive?: boolean;
  userId: string;
}

export interface UpdateWorkspaceInput {
  name?: string;
  dbPath?: string;
  isActive?: boolean;
}

export interface Session {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSessionInput {
  name: string;
  userId: string;
}

export interface UpdateSessionInput {
  name?: string;
}

export interface Folder {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  totalTokens: number;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFolderInput {
  name: string;
  description?: string;
  parentId?: string;
  totalTokens?: number;
  userId: string;
}

export interface UpdateFolderInput {
  name?: string;
  description?: string;
  parentId?: string;
  totalTokens?: number;
}

export interface FolderItem {
  id: string;
  content: string;
  tokens: number;
  itemType: string | null;
  filename: string | null;
  sourceType: string | null;
  folderId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFolderItemInput {
  content: string;
  tokens: number;
  itemType?: string;
  filename?: string;
  sourceType?: string;
  folderId: string;
}

export interface UpdateFolderItemInput {
  content?: string;
  tokens?: number;
  itemType?: string;
  filename?: string;
  sourceType?: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  usageCount: number;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTagInput {
  name: string;
  color?: string;
  usageCount?: number;
  userId: string;
}

export interface UpdateTagInput {
  name?: string;
  color?: string;
  usageCount?: number;
}

export interface ChatMessage {
  id: string;
  userMessage: string;
  aiMessage: string;
  userTokens: number;
  aiTokens: number;
  totalTokens: number;
  model: string;
  provider: string;
  selectedFolders: unknown;
  selectedTags: unknown;
  isExcluded: boolean;
  isPruned: boolean;
  isSaved: boolean;
  isArchived: boolean;
  exchangeId: string | null;
  systemPrompt: string | null;
  contextHistoryIds: unknown;
  alternatives: unknown | null;
  babyaiRequestId: string | null;
  timestamp: string | null;
  userId: string;
  sessionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChatMessageInput {
  userMessage: string;
  aiMessage: string;
  userTokens: number;
  aiTokens: number;
  totalTokens: number;
  model: string;
  provider: string;
  selectedFolders?: unknown;
  selectedTags?: unknown;
  isExcluded?: boolean;
  isPruned?: boolean;
  isSaved?: boolean;
  isArchived?: boolean;
  exchangeId?: string;
  systemPrompt?: string;
  contextHistoryIds?: unknown;
  alternatives?: unknown;
  babyaiRequestId?: string;
  timestamp?: string;
  userId: string;
  sessionId: string;
}

export interface UpdateChatMessageInput {
  userMessage?: string;
  aiMessage?: string;
  userTokens?: number;
  aiTokens?: number;
  totalTokens?: number;
  model?: string;
  provider?: string;
  selectedFolders?: unknown;
  selectedTags?: unknown;
  isExcluded?: boolean;
  isPruned?: boolean;
  isSaved?: boolean;
  isArchived?: boolean;
  exchangeId?: string;
  systemPrompt?: string;
  contextHistoryIds?: unknown;
  alternatives?: unknown;
  babyaiRequestId?: string;
  timestamp?: string;
}

export interface ChatMessageTag {
  id: string;
  chatMessageId: string;
  tagId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChatMessageTagInput {
  chatMessageId: string;
  tagId: string;
}

export interface UpdateChatMessageTagInput {
}

export interface ChatMessageFolder {
  id: string;
  chatMessageId: string;
  folderId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChatMessageFolderInput {
  chatMessageId: string;
  folderId: string;
}

export interface UpdateChatMessageFolderInput {
}

export interface Exchange {
  id: string;
  prompt: string;
  response: string;
  model: string;
  provider: string;
  rating: number | null;
  success: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExchangeInput {
  prompt: string;
  response: string;
  model: string;
  provider: string;
  rating?: number;
  success?: boolean;
  userId: string;
}

export interface UpdateExchangeInput {
  prompt?: string;
  response?: string;
  model?: string;
  provider?: string;
  rating?: number;
  success?: boolean;
}

export interface ExchangeTag {
  id: string;
  exchangeId: string;
  tagId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExchangeTagInput {
  exchangeId: string;
  tagId: string;
}

export interface UpdateExchangeTagInput {
}

export interface Document {
  id: string;
  title: string;
  filePath: string;
  language: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDocumentInput {
  title: string;
  filePath: string;
  language?: string;
}

export interface UpdateDocumentInput {
  title?: string;
  filePath?: string;
  language?: string;
}

export interface Orchestration {
  id: string;
  name: string;
  description: string | null;
  steps: unknown;
  isTemplate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrchestrationInput {
  name: string;
  description?: string;
  steps?: unknown;
  isTemplate?: boolean;
}

export interface UpdateOrchestrationInput {
  name?: string;
  description?: string;
  steps?: unknown;
  isTemplate?: boolean;
}

export interface OrchestrationRun {
  id: string;
  status: string;
  currentStepIndex: number;
  stepResults: unknown;
  error: string | null;
  startedAt: string | null;
  pausedAt: string | null;
  completedAt: string | null;
  orchestrationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrchestrationRunInput {
  status?: string;
  currentStepIndex?: number;
  stepResults?: unknown;
  error?: string;
  startedAt?: string;
  pausedAt?: string;
  completedAt?: string;
  orchestrationId: string;
}

export interface UpdateOrchestrationRunInput {
  status?: string;
  currentStepIndex?: number;
  stepResults?: unknown;
  error?: string;
  startedAt?: string;
  pausedAt?: string;
  completedAt?: string;
}
