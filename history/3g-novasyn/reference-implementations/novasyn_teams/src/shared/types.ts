// NovaSyn Teams -- Shared Type Definitions
// Team communication types, IPC channels, and ElectronAPI interface

// ---------------------------------------------------------------------------
// Team Types
// ---------------------------------------------------------------------------

export interface Team {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

export interface Channel {
  id: string;
  teamId: string;
  name: string;
  description: string;
  isDirect: boolean;
  isAiEnabled: boolean;
  createdAt: string;
}

export interface Member {
  id: string;
  teamId: string;
  displayName: string;
  avatarColor: string;
  role: 'owner' | 'admin' | 'member';
  isSelf: boolean;
  isOnline: boolean;
  lastSeen: string | null;
  createdAt: string;
}

export interface ChannelMember {
  channelId: string;
  memberId: string;
  joinedAt: string;
}

// ---------------------------------------------------------------------------
// Message Types
// ---------------------------------------------------------------------------

export type MessageType = 'text' | 'vault_share' | 'ai_response' | 'system' | 'file';

export interface MessageReaction {
  emoji: string;
  memberIds: string[];
}

export interface MessageMetadata {
  reactions?: MessageReaction[];
  editHistory?: { content: string; editedAt: string }[];
  attachments?: { name: string; path: string; size: number }[];
}

export interface Message {
  id: string;
  channelId: string;
  senderId: string;
  content: string;
  messageType: MessageType;
  replyTo: string | null;
  vaultItemId: string | null;
  metadata: MessageMetadata;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Call Types
// ---------------------------------------------------------------------------

export type CallType = 'voice' | 'video' | 'screen_share';
export type CallStatus = 'active' | 'ended';

export interface Call {
  id: string;
  channelId: string;
  startedBy: string;
  callType: CallType;
  status: CallStatus;
  transcript: string | null;
  summary: string | null;
  actionItems: string[];
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
}

// ---------------------------------------------------------------------------
// IPC Channels
// ---------------------------------------------------------------------------

export const IPC_CHANNELS = {
  // Team CRUD
  TEAM_CREATE: 'team-create',
  TEAM_GET: 'team-get',
  TEAM_UPDATE: 'team-update',
  TEAM_DELETE: 'team-delete',

  // Channel CRUD
  CHANNEL_CREATE: 'channel-create',
  CHANNEL_LIST: 'channel-list',
  CHANNEL_GET: 'channel-get',
  CHANNEL_UPDATE: 'channel-update',
  CHANNEL_DELETE: 'channel-delete',

  // Member CRUD
  MEMBER_LIST: 'member-list',
  MEMBER_ADD: 'member-add',
  MEMBER_UPDATE: 'member-update',
  MEMBER_REMOVE: 'member-remove',

  // Channel Members
  CHANNEL_MEMBER_ADD: 'channel-member-add',
  CHANNEL_MEMBER_REMOVE: 'channel-member-remove',
  CHANNEL_MEMBER_LIST: 'channel-member-list',

  // Messages
  MESSAGE_SEND: 'message-send',
  MESSAGE_LIST: 'message-list',
  MESSAGE_EDIT: 'message-edit',
  MESSAGE_DELETE: 'message-delete',
  MESSAGE_PIN: 'message-pin',
  MESSAGE_REACT: 'message-react',
  MESSAGE_SEARCH: 'message-search',

  // Threads
  THREAD_LIST: 'thread-list',

  // Calls
  CALL_START: 'call-start',
  CALL_END: 'call-end',
  CALL_GET_HISTORY: 'call-get-history',

  // AI
  AI_SUMMARIZE_CHANNEL: 'ai-summarize-channel',
  AI_DRAFT_RESPONSE: 'ai-draft-response',
  AI_RESPOND_TO_MENTION: 'ai-respond-to-mention',

  // Vault (standard 10 vault channels)
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

  // Macros (standard 5 macro channels)
  MACRO_GET_REGISTRY: 'macro-get-registry',
  MACRO_GET_AVAILABLE: 'macro-get-available',
  MACRO_EXECUTE: 'macro-execute',
  MACRO_SEND_REQUEST: 'macro-send-request',
  MACRO_CHECK_RESPONSE: 'macro-check-response',

  // Orchestrations (standard 9 orchestration channels)
  ORCHESTRATION_LIST: 'orchestration-list',
  ORCHESTRATION_CREATE: 'orchestration-create',
  ORCHESTRATION_UPDATE: 'orchestration-update',
  ORCHESTRATION_DELETE: 'orchestration-delete',
  ORCHESTRATION_GET: 'orchestration-get',
  ORCHESTRATION_RUN: 'orchestration-run',
  ORCHESTRATION_RESUME: 'orchestration-resume',
  ORCHESTRATION_GET_RUNS: 'orchestration-get-runs',
  ORCHESTRATION_GET_RUN: 'orchestration-get-run',

  // Settings
  GET_SETTINGS: 'get-settings',
  SAVE_SETTINGS: 'save-settings',
  GET_API_KEYS: 'get-api-keys',
  SET_API_KEY: 'set-api-key',

  // Window
  MINIMIZE_WINDOW: 'minimize-window',
  MAXIMIZE_WINDOW: 'maximize-window',
  CLOSE_WINDOW: 'close-window',
} as const;

// ---------------------------------------------------------------------------
// ElectronAPI -- Renderer -> Main bridge
// ---------------------------------------------------------------------------

export interface ElectronAPI {
  // Team CRUD
  teamCreate(data: { name: string; description?: string }): Promise<Team>;
  teamGet(id: string): Promise<Team | null>;
  teamUpdate(id: string, updates: Partial<Team>): Promise<Team>;
  teamDelete(id: string): Promise<void>;

  // Channel CRUD
  channelCreate(data: {
    teamId: string;
    name: string;
    description?: string;
    isDirect?: boolean;
    isAiEnabled?: boolean;
  }): Promise<Channel>;
  channelList(teamId: string): Promise<Channel[]>;
  channelGet(id: string): Promise<Channel | null>;
  channelUpdate(id: string, updates: Partial<Channel>): Promise<Channel>;
  channelDelete(id: string): Promise<void>;

  // Member CRUD
  memberList(teamId: string): Promise<Member[]>;
  memberAdd(data: {
    teamId: string;
    displayName: string;
    avatarColor?: string;
    role?: 'owner' | 'admin' | 'member';
    isSelf?: boolean;
  }): Promise<Member>;
  memberUpdate(id: string, updates: Partial<Member>): Promise<Member>;
  memberRemove(id: string): Promise<void>;

  // Channel Members
  channelMemberAdd(channelId: string, memberId: string): Promise<void>;
  channelMemberRemove(channelId: string, memberId: string): Promise<void>;
  channelMemberList(channelId: string): Promise<Member[]>;

  // Messages
  messageSend(data: {
    channelId: string;
    senderId: string;
    content: string;
    messageType?: MessageType;
    replyTo?: string;
    vaultItemId?: string;
  }): Promise<Message>;
  messageList(channelId: string, limit?: number, offset?: number): Promise<Message[]>;
  messageEdit(id: string, content: string): Promise<Message>;
  messageDelete(id: string): Promise<void>;
  messagePin(id: string, isPinned: boolean): Promise<Message>;
  messageReact(id: string, emoji: string, memberId: string): Promise<Message>;
  messageSearch(teamId: string, query: string): Promise<Message[]>;

  // Threads
  threadList(parentMessageId: string): Promise<Message[]>;

  // Calls
  callStart(data: {
    channelId: string;
    startedBy: string;
    callType?: CallType;
  }): Promise<Call>;
  callEnd(id: string, data?: {
    transcript?: string;
    summary?: string;
    actionItems?: string[];
  }): Promise<Call>;
  callGetHistory(channelId: string): Promise<Call[]>;

  // AI
  aiSummarizeChannel(channelId: string, messageCount?: number): Promise<string>;
  aiDraftResponse(channelId: string, context?: string): Promise<string>;
  aiRespondToMention(channelId: string, senderId: string, content: string): Promise<Message>;

  // Vault (shared across all NovaSyn apps)
  vaultList(options?: any): Promise<any[]>;
  vaultStore(input: any): Promise<any>;
  vaultGet(id: string): Promise<any>;
  vaultDelete(id: string): Promise<void>;
  vaultSearch(options: any): Promise<any[]>;
  vaultGetTags(): Promise<any[]>;
  vaultAddTag(itemId: string, tagName: string, color?: string): Promise<void>;
  vaultAnnotate(itemId: string, content: string): Promise<any>;
  vaultGetAnnotations(itemId: string): Promise<any[]>;
  vaultGetProvenance(itemId: string): Promise<any[]>;

  // Macros
  macroGetRegistry(): Promise<any>;
  macroGetAvailable(): Promise<any>;
  macroExecute(macroName: string, input: any): Promise<any>;
  macroSendRequest(targetApp: string, macro: string, input: any): Promise<any>;
  macroCheckResponse(requestId: string): Promise<any>;

  // Orchestrations
  orchestrationList(): Promise<any[]>;
  orchestrationCreate(data: any): Promise<any>;
  orchestrationUpdate(id: string, updates: any): Promise<any>;
  orchestrationDelete(id: string): Promise<void>;
  orchestrationGet(id: string): Promise<any>;
  orchestrationRun(id: string, input?: string): Promise<any>;
  orchestrationResume(runId: string, decision: 'approved' | 'rejected'): Promise<any>;
  orchestrationGetRuns(orchestrationId: string): Promise<any[]>;
  orchestrationGetRun(runId: string): Promise<any>;

  // Settings
  getSettings(): Promise<any>;
  saveSettings(updates: any): Promise<void>;
  getApiKeys(): Promise<Record<string, string>>;
  setApiKey(provider: string, key: string): Promise<void>;

  // Window
  minimizeWindow(): void;
  maximizeWindow(): void;
  closeWindow(): void;

  // Events
  onMessageReceived(callback: (data: Message) => void): () => void;
  onMemberStatusChange(callback: (data: { memberId: string; isOnline: boolean }) => void): () => void;
  onTrayNewTeam(callback: () => void): () => void;
}

// ---------------------------------------------------------------------------
// Global augmentation for renderer access
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
