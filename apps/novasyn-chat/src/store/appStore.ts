// Agicore Generated Zustand Store
// App: novasyn_chat

import { create } from 'zustand';
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
} from '../lib/types';
import {
  listUsers, createUser, updateUser, deleteUser,
  listWorkspaces, createWorkspace, updateWorkspace, deleteWorkspace,
  listSessions, createSession, updateSession, deleteSession,
  listFolders, createFolder, updateFolder, deleteFolder,
  listFolderItems, createFolderItem, updateFolderItem, deleteFolderItem,
  listTags, createTag, updateTag, deleteTag,
  listChatMessages, listChatMessagesBySession, createChatMessage, updateChatMessage, deleteChatMessage,
  listChatMessageTags, createChatMessageTag, updateChatMessageTag, deleteChatMessageTag,
  listChatMessageFolders, createChatMessageFolder, updateChatMessageFolder, deleteChatMessageFolder,
  listExchanges, createExchange, updateExchange, deleteExchange,
  listExchangeTags, createExchangeTag, updateExchangeTag, deleteExchangeTag,
  listDocuments, createDocument, updateDocument, deleteDocument,
  listOrchestrations, createOrchestration, updateOrchestration, deleteOrchestration,
  listOrchestrationRuns, createOrchestrationRun, updateOrchestrationRun, deleteOrchestrationRun,
} from '../lib/api';

interface AppState {
  currentView: string;
  setCurrentView: (view: string) => void;

  selectedModel: string;
  setSelectedModel: (model: string) => void;

  currentSessionId: string | null;
  setCurrentSessionId: (id: string | null) => void;

  users: User[];
  selectedUserId: string | null;
  loadUsers: () => Promise<void>;
  addUser: (input: CreateUserInput) => Promise<void>;
  editUser: (id: string, input: UpdateUserInput) => Promise<void>;
  removeUser: (id: string) => Promise<void>;
  selectUser: (id: string | null) => void;

  workspaces: Workspace[];
  selectedWorkspaceId: string | null;
  loadWorkspaces: () => Promise<void>;
  addWorkspace: (input: CreateWorkspaceInput) => Promise<void>;
  editWorkspace: (id: string, input: UpdateWorkspaceInput) => Promise<void>;
  removeWorkspace: (id: string) => Promise<void>;
  selectWorkspace: (id: string | null) => void;

  sessions: Session[];
  selectedSessionId: string | null;
  loadSessions: () => Promise<void>;
  addSession: (input: CreateSessionInput) => Promise<void>;
  editSession: (id: string, input: UpdateSessionInput) => Promise<void>;
  removeSession: (id: string) => Promise<void>;
  selectSession: (id: string | null) => void;

  folders: Folder[];
  selectedFolderId: string | null;
  loadFolders: () => Promise<void>;
  addFolder: (input: CreateFolderInput) => Promise<void>;
  editFolder: (id: string, input: UpdateFolderInput) => Promise<void>;
  removeFolder: (id: string) => Promise<void>;
  selectFolder: (id: string | null) => void;

  folderItems: FolderItem[];
  selectedFolderItemId: string | null;
  loadFolderItems: () => Promise<void>;
  addFolderItem: (input: CreateFolderItemInput) => Promise<void>;
  editFolderItem: (id: string, input: UpdateFolderItemInput) => Promise<void>;
  removeFolderItem: (id: string) => Promise<void>;
  selectFolderItem: (id: string | null) => void;

  tags: Tag[];
  selectedTagId: string | null;
  loadTags: () => Promise<void>;
  addTag: (input: CreateTagInput) => Promise<void>;
  editTag: (id: string, input: UpdateTagInput) => Promise<void>;
  removeTag: (id: string) => Promise<void>;
  selectTag: (id: string | null) => void;

  chatMessages: ChatMessage[];
  selectedChatMessageId: string | null;
  loadChatMessages: () => Promise<void>;
  loadChatMessagesForCurrentSession: () => Promise<void>;
  addChatMessage: (input: CreateChatMessageInput) => Promise<void>;
  editChatMessage: (id: string, input: UpdateChatMessageInput) => Promise<void>;
  removeChatMessage: (id: string) => Promise<void>;
  selectChatMessage: (id: string | null) => void;

  chatMessageTags: ChatMessageTag[];
  selectedChatMessageTagId: string | null;
  loadChatMessageTags: () => Promise<void>;
  addChatMessageTag: (input: CreateChatMessageTagInput) => Promise<void>;
  editChatMessageTag: (id: string, input: UpdateChatMessageTagInput) => Promise<void>;
  removeChatMessageTag: (id: string) => Promise<void>;
  selectChatMessageTag: (id: string | null) => void;

  chatMessageFolders: ChatMessageFolder[];
  selectedChatMessageFolderId: string | null;
  loadChatMessageFolders: () => Promise<void>;
  addChatMessageFolder: (input: CreateChatMessageFolderInput) => Promise<void>;
  editChatMessageFolder: (id: string, input: UpdateChatMessageFolderInput) => Promise<void>;
  removeChatMessageFolder: (id: string) => Promise<void>;
  selectChatMessageFolder: (id: string | null) => void;

  exchanges: Exchange[];
  selectedExchangeId: string | null;
  loadExchanges: () => Promise<void>;
  addExchange: (input: CreateExchangeInput) => Promise<void>;
  editExchange: (id: string, input: UpdateExchangeInput) => Promise<void>;
  removeExchange: (id: string) => Promise<void>;
  selectExchange: (id: string | null) => void;

  exchangeTags: ExchangeTag[];
  selectedExchangeTagId: string | null;
  loadExchangeTags: () => Promise<void>;
  addExchangeTag: (input: CreateExchangeTagInput) => Promise<void>;
  editExchangeTag: (id: string, input: UpdateExchangeTagInput) => Promise<void>;
  removeExchangeTag: (id: string) => Promise<void>;
  selectExchangeTag: (id: string | null) => void;

  documents: Document[];
  selectedDocumentId: string | null;
  loadDocuments: () => Promise<void>;
  addDocument: (input: CreateDocumentInput) => Promise<void>;
  editDocument: (id: string, input: UpdateDocumentInput) => Promise<void>;
  removeDocument: (id: string) => Promise<void>;
  selectDocument: (id: string | null) => void;

  orchestrations: Orchestration[];
  selectedOrchestrationId: string | null;
  loadOrchestrations: () => Promise<void>;
  addOrchestration: (input: CreateOrchestrationInput) => Promise<void>;
  editOrchestration: (id: string, input: UpdateOrchestrationInput) => Promise<void>;
  removeOrchestration: (id: string) => Promise<void>;
  selectOrchestration: (id: string | null) => void;

  orchestrationRuns: OrchestrationRun[];
  selectedOrchestrationRunId: string | null;
  loadOrchestrationRuns: () => Promise<void>;
  addOrchestrationRun: (input: CreateOrchestrationRunInput) => Promise<void>;
  editOrchestrationRun: (id: string, input: UpdateOrchestrationRunInput) => Promise<void>;
  removeOrchestrationRun: (id: string) => Promise<void>;
  selectOrchestrationRun: (id: string | null) => void;

}

export const useAppStore = create<AppState>((set, get) => ({
  currentView: 'ChatView',
  setCurrentView: (view) => set({ currentView: view }),

  selectedModel: 'claude-sonnet-4-20250514',
  setSelectedModel: (model) => set({ selectedModel: model }),

  currentSessionId: null,
  setCurrentSessionId: (id) => set({ currentSessionId: id }),

  users: [],
  selectedUserId: null,
  loadUsers: async () => {
    const users = await listUsers();
    set({ users });
  },
  addUser: async (input) => {
    await createUser(input);
    await get().loadUsers();
  },
  editUser: async (id, input) => {
    await updateUser(id, input);
    await get().loadUsers();
  },
  removeUser: async (id) => {
    await deleteUser(id);
    await get().loadUsers();
  },
  selectUser: (id) => set({ selectedUserId: id }),

  workspaces: [],
  selectedWorkspaceId: null,
  loadWorkspaces: async () => {
    const workspaces = await listWorkspaces();
    set({ workspaces });
  },
  addWorkspace: async (input) => {
    await createWorkspace(input);
    await get().loadWorkspaces();
  },
  editWorkspace: async (id, input) => {
    await updateWorkspace(id, input);
    await get().loadWorkspaces();
  },
  removeWorkspace: async (id) => {
    await deleteWorkspace(id);
    await get().loadWorkspaces();
  },
  selectWorkspace: (id) => set({ selectedWorkspaceId: id }),

  sessions: [],
  selectedSessionId: null,
  loadSessions: async () => {
    const sessions = await listSessions();
    set({ sessions });
  },
  addSession: async (input) => {
    await createSession(input);
    await get().loadSessions();
  },
  editSession: async (id, input) => {
    await updateSession(id, input);
    await get().loadSessions();
  },
  removeSession: async (id) => {
    await deleteSession(id);
    await get().loadSessions();
  },
  selectSession: (id) => set({ selectedSessionId: id }),

  folders: [],
  selectedFolderId: null,
  loadFolders: async () => {
    const folders = await listFolders();
    set({ folders });
  },
  addFolder: async (input) => {
    await createFolder(input);
    await get().loadFolders();
  },
  editFolder: async (id, input) => {
    await updateFolder(id, input);
    await get().loadFolders();
  },
  removeFolder: async (id) => {
    await deleteFolder(id);
    await get().loadFolders();
  },
  selectFolder: (id) => set({ selectedFolderId: id }),

  folderItems: [],
  selectedFolderItemId: null,
  loadFolderItems: async () => {
    const folderItems = await listFolderItems();
    set({ folderItems });
  },
  addFolderItem: async (input) => {
    await createFolderItem(input);
    await get().loadFolderItems();
  },
  editFolderItem: async (id, input) => {
    await updateFolderItem(id, input);
    await get().loadFolderItems();
  },
  removeFolderItem: async (id) => {
    await deleteFolderItem(id);
    await get().loadFolderItems();
  },
  selectFolderItem: (id) => set({ selectedFolderItemId: id }),

  tags: [],
  selectedTagId: null,
  loadTags: async () => {
    const tags = await listTags();
    set({ tags });
  },
  addTag: async (input) => {
    await createTag(input);
    await get().loadTags();
  },
  editTag: async (id, input) => {
    await updateTag(id, input);
    await get().loadTags();
  },
  removeTag: async (id) => {
    await deleteTag(id);
    await get().loadTags();
  },
  selectTag: (id) => set({ selectedTagId: id }),

  chatMessages: [],
  selectedChatMessageId: null,
  loadChatMessages: async () => {
    const chatMessages = await listChatMessages();
    set({ chatMessages });
  },
  loadChatMessagesForCurrentSession: async () => {
    const sessionId = get().currentSessionId;
    if (sessionId) {
      const chatMessages = await listChatMessagesBySession(sessionId);
      set({ chatMessages });
    } else {
      set({ chatMessages: [] });
    }
  },
  addChatMessage: async (input) => {
    await createChatMessage(input);
    await get().loadChatMessages();
  },
  editChatMessage: async (id, input) => {
    await updateChatMessage(id, input);
    await get().loadChatMessages();
  },
  removeChatMessage: async (id) => {
    await deleteChatMessage(id);
    await get().loadChatMessages();
  },
  selectChatMessage: (id) => set({ selectedChatMessageId: id }),

  chatMessageTags: [],
  selectedChatMessageTagId: null,
  loadChatMessageTags: async () => {
    const chatMessageTags = await listChatMessageTags();
    set({ chatMessageTags });
  },
  addChatMessageTag: async (input) => {
    await createChatMessageTag(input);
    await get().loadChatMessageTags();
  },
  editChatMessageTag: async (id, input) => {
    await updateChatMessageTag(id, input);
    await get().loadChatMessageTags();
  },
  removeChatMessageTag: async (id) => {
    await deleteChatMessageTag(id);
    await get().loadChatMessageTags();
  },
  selectChatMessageTag: (id) => set({ selectedChatMessageTagId: id }),

  chatMessageFolders: [],
  selectedChatMessageFolderId: null,
  loadChatMessageFolders: async () => {
    const chatMessageFolders = await listChatMessageFolders();
    set({ chatMessageFolders });
  },
  addChatMessageFolder: async (input) => {
    await createChatMessageFolder(input);
    await get().loadChatMessageFolders();
  },
  editChatMessageFolder: async (id, input) => {
    await updateChatMessageFolder(id, input);
    await get().loadChatMessageFolders();
  },
  removeChatMessageFolder: async (id) => {
    await deleteChatMessageFolder(id);
    await get().loadChatMessageFolders();
  },
  selectChatMessageFolder: (id) => set({ selectedChatMessageFolderId: id }),

  exchanges: [],
  selectedExchangeId: null,
  loadExchanges: async () => {
    const exchanges = await listExchanges();
    set({ exchanges });
  },
  addExchange: async (input) => {
    await createExchange(input);
    await get().loadExchanges();
  },
  editExchange: async (id, input) => {
    await updateExchange(id, input);
    await get().loadExchanges();
  },
  removeExchange: async (id) => {
    await deleteExchange(id);
    await get().loadExchanges();
  },
  selectExchange: (id) => set({ selectedExchangeId: id }),

  exchangeTags: [],
  selectedExchangeTagId: null,
  loadExchangeTags: async () => {
    const exchangeTags = await listExchangeTags();
    set({ exchangeTags });
  },
  addExchangeTag: async (input) => {
    await createExchangeTag(input);
    await get().loadExchangeTags();
  },
  editExchangeTag: async (id, input) => {
    await updateExchangeTag(id, input);
    await get().loadExchangeTags();
  },
  removeExchangeTag: async (id) => {
    await deleteExchangeTag(id);
    await get().loadExchangeTags();
  },
  selectExchangeTag: (id) => set({ selectedExchangeTagId: id }),

  documents: [],
  selectedDocumentId: null,
  loadDocuments: async () => {
    const documents = await listDocuments();
    set({ documents });
  },
  addDocument: async (input) => {
    await createDocument(input);
    await get().loadDocuments();
  },
  editDocument: async (id, input) => {
    await updateDocument(id, input);
    await get().loadDocuments();
  },
  removeDocument: async (id) => {
    await deleteDocument(id);
    await get().loadDocuments();
  },
  selectDocument: (id) => set({ selectedDocumentId: id }),

  orchestrations: [],
  selectedOrchestrationId: null,
  loadOrchestrations: async () => {
    const orchestrations = await listOrchestrations();
    set({ orchestrations });
  },
  addOrchestration: async (input) => {
    await createOrchestration(input);
    await get().loadOrchestrations();
  },
  editOrchestration: async (id, input) => {
    await updateOrchestration(id, input);
    await get().loadOrchestrations();
  },
  removeOrchestration: async (id) => {
    await deleteOrchestration(id);
    await get().loadOrchestrations();
  },
  selectOrchestration: (id) => set({ selectedOrchestrationId: id }),

  orchestrationRuns: [],
  selectedOrchestrationRunId: null,
  loadOrchestrationRuns: async () => {
    const orchestrationRuns = await listOrchestrationRuns();
    set({ orchestrationRuns });
  },
  addOrchestrationRun: async (input) => {
    await createOrchestrationRun(input);
    await get().loadOrchestrationRuns();
  },
  editOrchestrationRun: async (id, input) => {
    await updateOrchestrationRun(id, input);
    await get().loadOrchestrationRuns();
  },
  removeOrchestrationRun: async (id) => {
    await deleteOrchestrationRun(id);
    await get().loadOrchestrationRuns();
  },
  selectOrchestrationRun: (id) => set({ selectedOrchestrationRunId: id }),

}));
