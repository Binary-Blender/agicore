// Agicore Generated Invoke Wrappers
// App: novasyn_chat

import { invoke } from '@tauri-apps/api/core';
import type {
  User, CreateUserInput, UpdateUserInput,
  Workspace, CreateWorkspaceInput, UpdateWorkspaceInput,
  Session, CreateSessionInput, UpdateSessionInput,
  Folder, CreateFolderInput, UpdateFolderInput,
  FolderItem, CreateFolderItemInput, UpdateFolderItemInput,
  Tag, CreateTagInput, UpdateTagInput,
  ChatMessage, CreateChatMessageInput, UpdateChatMessageInput,
  ChatMessageTag, CreateChatMessageTagInput, UpdateChatMessageTagInput,
  ChatMessageFolder, CreateChatMessageFolderInput, UpdateChatMessageFolderInput,
  Exchange, CreateExchangeInput, UpdateExchangeInput,
  ExchangeTag, CreateExchangeTagInput, UpdateExchangeTagInput,
  Document, CreateDocumentInput, UpdateDocumentInput,
  Orchestration, CreateOrchestrationInput, UpdateOrchestrationInput,
  OrchestrationRun, CreateOrchestrationRunInput, UpdateOrchestrationRunInput,
} from './types';

// --- User ---
export const listUsers = () =>
  invoke<User[]>('list_users');

export const createUser = (input: CreateUserInput) =>
  invoke<User>('create_user', { input });

export const getUser = (id: string) =>
  invoke<User>('get_user', { id });

export const updateUser = (id: string, input: UpdateUserInput) =>
  invoke<User>('update_user', { id, input });

export const deleteUser = (id: string) =>
  invoke<void>('delete_user', { id });

// --- Workspace ---
export const listWorkspaces = () =>
  invoke<Workspace[]>('list_workspaces');

export const createWorkspace = (input: CreateWorkspaceInput) =>
  invoke<Workspace>('create_workspace', { input });

export const getWorkspace = (id: string) =>
  invoke<Workspace>('get_workspace', { id });

export const updateWorkspace = (id: string, input: UpdateWorkspaceInput) =>
  invoke<Workspace>('update_workspace', { id, input });

export const deleteWorkspace = (id: string) =>
  invoke<void>('delete_workspace', { id });

// --- Session ---
export const listSessions = () =>
  invoke<Session[]>('list_sessions');

export const createSession = (input: CreateSessionInput) =>
  invoke<Session>('create_session', { input });

export const getSession = (id: string) =>
  invoke<Session>('get_session', { id });

export const updateSession = (id: string, input: UpdateSessionInput) =>
  invoke<Session>('update_session', { id, input });

export const deleteSession = (id: string) =>
  invoke<void>('delete_session', { id });

// --- Folder ---
export const listFolders = () =>
  invoke<Folder[]>('list_folders');

export const createFolder = (input: CreateFolderInput) =>
  invoke<Folder>('create_folder', { input });

export const getFolder = (id: string) =>
  invoke<Folder>('get_folder', { id });

export const updateFolder = (id: string, input: UpdateFolderInput) =>
  invoke<Folder>('update_folder', { id, input });

export const deleteFolder = (id: string) =>
  invoke<void>('delete_folder', { id });

// --- FolderItem ---
export const listFolderItems = () =>
  invoke<FolderItem[]>('list_folder_items');

export const createFolderItem = (input: CreateFolderItemInput) =>
  invoke<FolderItem>('create_folder_item', { input });

export const getFolderItem = (id: string) =>
  invoke<FolderItem>('get_folder_item', { id });

export const updateFolderItem = (id: string, input: UpdateFolderItemInput) =>
  invoke<FolderItem>('update_folder_item', { id, input });

export const deleteFolderItem = (id: string) =>
  invoke<void>('delete_folder_item', { id });

// --- Tag ---
export const listTags = () =>
  invoke<Tag[]>('list_tags');

export const createTag = (input: CreateTagInput) =>
  invoke<Tag>('create_tag', { input });

export const getTag = (id: string) =>
  invoke<Tag>('get_tag', { id });

export const updateTag = (id: string, input: UpdateTagInput) =>
  invoke<Tag>('update_tag', { id, input });

export const deleteTag = (id: string) =>
  invoke<void>('delete_tag', { id });

// --- ChatMessage ---
export const listChatMessages = () =>
  invoke<ChatMessage[]>('list_chat_messages');

export const listChatMessagesBySession = (sessionId: string) =>
  invoke<ChatMessage[]>('list_chat_messages_by_session', { sessionId });

export const createChatMessage = (input: CreateChatMessageInput) =>
  invoke<ChatMessage>('create_chat_message', { input });

export const getChatMessage = (id: string) =>
  invoke<ChatMessage>('get_chat_message', { id });

export const updateChatMessage = (id: string, input: UpdateChatMessageInput) =>
  invoke<ChatMessage>('update_chat_message', { id, input });

export const deleteChatMessage = (id: string) =>
  invoke<void>('delete_chat_message', { id });

// --- ChatMessageTag ---
export const listChatMessageTags = () =>
  invoke<ChatMessageTag[]>('list_chat_message_tags');

export const createChatMessageTag = (input: CreateChatMessageTagInput) =>
  invoke<ChatMessageTag>('create_chat_message_tag', { input });

export const getChatMessageTag = (id: string) =>
  invoke<ChatMessageTag>('get_chat_message_tag', { id });

export const updateChatMessageTag = (id: string, input: UpdateChatMessageTagInput) =>
  invoke<ChatMessageTag>('update_chat_message_tag', { id, input });

export const deleteChatMessageTag = (id: string) =>
  invoke<void>('delete_chat_message_tag', { id });

// --- ChatMessageFolder ---
export const listChatMessageFolders = () =>
  invoke<ChatMessageFolder[]>('list_chat_message_folders');

export const createChatMessageFolder = (input: CreateChatMessageFolderInput) =>
  invoke<ChatMessageFolder>('create_chat_message_folder', { input });

export const getChatMessageFolder = (id: string) =>
  invoke<ChatMessageFolder>('get_chat_message_folder', { id });

export const updateChatMessageFolder = (id: string, input: UpdateChatMessageFolderInput) =>
  invoke<ChatMessageFolder>('update_chat_message_folder', { id, input });

export const deleteChatMessageFolder = (id: string) =>
  invoke<void>('delete_chat_message_folder', { id });

// --- Exchange ---
export const listExchanges = () =>
  invoke<Exchange[]>('list_exchanges');

export const createExchange = (input: CreateExchangeInput) =>
  invoke<Exchange>('create_exchange', { input });

export const getExchange = (id: string) =>
  invoke<Exchange>('get_exchange', { id });

export const updateExchange = (id: string, input: UpdateExchangeInput) =>
  invoke<Exchange>('update_exchange', { id, input });

export const deleteExchange = (id: string) =>
  invoke<void>('delete_exchange', { id });

// --- ExchangeTag ---
export const listExchangeTags = () =>
  invoke<ExchangeTag[]>('list_exchange_tags');

export const createExchangeTag = (input: CreateExchangeTagInput) =>
  invoke<ExchangeTag>('create_exchange_tag', { input });

export const getExchangeTag = (id: string) =>
  invoke<ExchangeTag>('get_exchange_tag', { id });

export const updateExchangeTag = (id: string, input: UpdateExchangeTagInput) =>
  invoke<ExchangeTag>('update_exchange_tag', { id, input });

export const deleteExchangeTag = (id: string) =>
  invoke<void>('delete_exchange_tag', { id });

// --- Document ---
export const listDocuments = () =>
  invoke<Document[]>('list_documents');

export const createDocument = (input: CreateDocumentInput) =>
  invoke<Document>('create_document', { input });

export const getDocument = (id: string) =>
  invoke<Document>('get_document', { id });

export const updateDocument = (id: string, input: UpdateDocumentInput) =>
  invoke<Document>('update_document', { id, input });

export const deleteDocument = (id: string) =>
  invoke<void>('delete_document', { id });

// --- Orchestration ---
export const listOrchestrations = () =>
  invoke<Orchestration[]>('list_orchestrations');

export const createOrchestration = (input: CreateOrchestrationInput) =>
  invoke<Orchestration>('create_orchestration', { input });

export const getOrchestration = (id: string) =>
  invoke<Orchestration>('get_orchestration', { id });

export const updateOrchestration = (id: string, input: UpdateOrchestrationInput) =>
  invoke<Orchestration>('update_orchestration', { id, input });

export const deleteOrchestration = (id: string) =>
  invoke<void>('delete_orchestration', { id });

// --- OrchestrationRun ---
export const listOrchestrationRuns = () =>
  invoke<OrchestrationRun[]>('list_orchestration_runs');

export const createOrchestrationRun = (input: CreateOrchestrationRunInput) =>
  invoke<OrchestrationRun>('create_orchestration_run', { input });

export const getOrchestrationRun = (id: string) =>
  invoke<OrchestrationRun>('get_orchestration_run', { id });

export const updateOrchestrationRun = (id: string, input: UpdateOrchestrationRunInput) =>
  invoke<OrchestrationRun>('update_orchestration_run', { id, input });

export const deleteOrchestrationRun = (id: string) =>
  invoke<void>('delete_orchestration_run', { id });

// --- send_chat ---
export const sendChat = (userMessage: string, model: string, systemPrompt: string, contextFolderIds: unknown, contextTagIds: unknown, historyIds: unknown) =>
  invoke<ChatMessage>('send_chat', { userMessage, model, systemPrompt, contextFolderIds, contextTagIds, historyIds });

// --- broadcast_chat ---
export const broadcastChat = (userMessage: string, modelIds: unknown, systemPrompt: string, contextFolderIds: unknown) =>
  invoke<unknown>('broadcast_chat', { userMessage, modelIds, systemPrompt, contextFolderIds });

// --- council_chat ---
export const councilChat = (userMessage: string, modelIds: unknown, systemPrompt: string, synthesisModel: string) =>
  invoke<ChatMessage>('council_chat', { userMessage, modelIds, systemPrompt, synthesisModel });

// --- search_chats ---
export const searchChats = (query: string, userId: string) =>
  invoke<unknown>('search_chats', { query, userId });

// --- web_search ---
export const webSearch = (query: string, numResults?: number) =>
  invoke<unknown>('web_search', { query, numResults });

// --- export_session_md ---
export const exportSessionMd = (sessionId: string) =>
  invoke<string>('export_session_md', { sessionId });
