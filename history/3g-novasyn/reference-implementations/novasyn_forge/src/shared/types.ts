// === Entity Interfaces ===

export interface ForgeProject {
  id: string;
  name: string;
  description: string;
  path: string;
  packageName: string;
  displayName: string;
  port: number;
  dbName: string;
  appId: string;
  status: 'active' | 'scaffolded' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  path: string;
  packageName: string;
  displayName: string;
  port: number;
  dbName: string;
  appId: string;
}

export interface Feature {
  id: string;
  projectId: string;
  name: string;
  description: string;
  entityName: string;
  tableName: string;
  currentStep: number;
  status: 'in_progress' | 'complete' | 'paused';
  createdAt: string;
  updatedAt: string;
}

export interface CreateFeatureInput {
  projectId: string;
  name: string;
  description?: string;
  entityName: string;
  tableName: string;
}

export interface FeatureStep {
  id: string;
  featureId: string;
  stepNumber: number;
  stepName: string;
  generatedCode: string;
  isApplied: boolean;
  appliedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AiRole = 'architect' | 'builder' | 'reviewer';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  projectId: string;
  role: AiRole;
  title: string;
  messages: ConversationMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface Decision {
  id: string;
  projectId: string;
  featureId: string | null;
  summary: string;
  reasoning: string;
  sourceRole: string;
  tags: string[];
  createdAt: string;
}

export interface CreateDecisionInput {
  projectId: string;
  featureId?: string;
  summary: string;
  reasoning?: string;
  sourceRole: string;
  tags?: string[];
}

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  contextWindow: number;
  requiresKey: boolean;
}

export interface ForgeSettings {
  theme: 'dark' | 'light';
  defaultModel: string;
  devStackDocsPath: string;
  babyaiUrl: string;
  babyaiApiKey: string;
  hfToken: string;
  debugLog: boolean;
}

export const PIPELINE_STEPS = [
  { number: 1,  name: 'sql_migration',    label: 'SQL Migration' },
  { number: 2,  name: 'ts_interfaces',    label: 'TypeScript Interfaces' },
  { number: 3,  name: 'ipc_channels',     label: 'IPC Channel Constants' },
  { number: 4,  name: 'electron_api',     label: 'ElectronAPI Methods' },
  { number: 5,  name: 'preload_bridge',   label: 'Preload Bridge' },
  { number: 6,  name: 'row_mappers',      label: 'Row Mappers' },
  { number: 7,  name: 'ipc_handlers',     label: 'IPC Handlers' },
  { number: 8,  name: 'zustand_store',    label: 'Zustand Store' },
  { number: 9,  name: 'react_components', label: 'React Components' },
  { number: 10, name: 'app_routing',      label: 'App.tsx Routing' },
] as const;

export const IPC_CHANNELS = {
  // Projects
  GET_PROJECTS: 'get-projects',
  GET_PROJECT: 'get-project',
  CREATE_PROJECT: 'create-project',
  UPDATE_PROJECT: 'update-project',
  DELETE_PROJECT: 'delete-project',
  OPEN_PROJECT_DIR: 'open-project-dir',
  SELECT_PROJECT_DIR: 'select-project-dir',
  SCAFFOLD_PROJECT: 'scaffold-project',

  // Settings
  GET_SETTINGS: 'get-settings',
  SAVE_SETTINGS: 'save-settings',

  // API Keys
  GET_API_KEYS: 'get-api-keys',
  SET_API_KEY: 'set-api-key',

  // Models
  GET_MODELS: 'get-models',

  // Conversations
  GET_CONVERSATIONS: 'get-conversations',
  GET_CONVERSATION: 'get-conversation',
  CREATE_CONVERSATION: 'create-conversation',
  DELETE_CONVERSATION: 'delete-conversation',

  // AI Chat
  SEND_CHAT: 'forge-send-chat',

  // Decisions
  GET_DECISIONS: 'get-decisions',
  CREATE_DECISION: 'create-decision',
  DELETE_DECISION: 'delete-decision',

  // Features & Pipeline
  GET_FEATURES: 'get-features',
  GET_FEATURE: 'get-feature',
  CREATE_FEATURE: 'create-feature',
  UPDATE_FEATURE: 'update-feature',
  DELETE_FEATURE: 'delete-feature',
  GET_FEATURE_STEPS: 'get-feature-steps',
  GENERATE_STEP: 'generate-step',
  APPLY_STEP: 'apply-step',

  // Window
  MINIMIZE_WINDOW: 'minimize-window',
  MAXIMIZE_WINDOW: 'maximize-window',
  CLOSE_WINDOW: 'close-window',
} as const;

export interface ElectronAPI {
  // Projects
  getProjects: () => Promise<ForgeProject[]>;
  getProject: (id: string) => Promise<ForgeProject | null>;
  createProject: (input: CreateProjectInput) => Promise<ForgeProject>;
  updateProject: (id: string, updates: Partial<ForgeProject>) => Promise<ForgeProject>;
  deleteProject: (id: string) => Promise<void>;
  openProjectDir: (projectPath: string) => Promise<void>;
  selectProjectDir: () => Promise<string | null>;

  // Settings
  getSettings: () => Promise<ForgeSettings>;
  saveSettings: (updates: Partial<ForgeSettings>) => Promise<void>;

  // API Keys
  getApiKeys: () => Promise<Record<string, string>>;
  setApiKey: (provider: string, key: string) => Promise<void>;

  // Models
  getModels: () => Promise<AIModel[]>;

  // Conversations
  getConversations: (projectId: string) => Promise<Conversation[]>;
  getConversation: (id: string) => Promise<Conversation | null>;
  createConversation: (projectId: string, role: AiRole, title?: string) => Promise<Conversation>;
  deleteConversation: (id: string) => Promise<void>;

  // AI Chat
  sendChat: (conversationId: string, message: string, model: string) => Promise<{ role: 'assistant'; content: string; timestamp: string }>;
  onChatDelta: (callback: (text: string) => void) => () => void;

  // Decisions
  getDecisions: (projectId: string) => Promise<Decision[]>;
  createDecision: (input: CreateDecisionInput) => Promise<Decision>;
  deleteDecision: (id: string) => Promise<void>;

  // Scaffolding
  scaffoldProject: (projectId: string) => Promise<{ success: boolean; filesCreated: number; error?: string }>;

  // Features & Pipeline
  getFeatures: (projectId: string) => Promise<Feature[]>;
  getFeature: (id: string) => Promise<Feature | null>;
  createFeature: (input: CreateFeatureInput) => Promise<Feature>;
  updateFeature: (id: string, updates: Partial<Feature>) => Promise<Feature>;
  deleteFeature: (id: string) => Promise<void>;
  getFeatureSteps: (featureId: string) => Promise<FeatureStep[]>;
  generateStep: (featureId: string, stepNumber: number) => Promise<FeatureStep>;
  applyStep: (stepId: string) => Promise<FeatureStep>;

  // Window
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
}


declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
