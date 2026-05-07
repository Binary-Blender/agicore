// NovaSyn Orchestrator — Shared Type Definitions
// Cross-app workflow orchestration types, IPC channels, and ElectronAPI interface

// ---------------------------------------------------------------------------
// Module & Workflow Types
// ---------------------------------------------------------------------------

/** Module types available in the Orchestrator */
export type ModuleType =
  | 'ai_action'
  | 'qc_checkpoint'
  | 'transform'
  | 'vault_save'
  | 'vault_load'
  | 'cross_app_action';

export interface ModuleConfig {
  id: string;
  type: ModuleType;
  name: string;
  targetApp?: string;   // For cross_app_action: 'novasyn-ai', 'novasyn-studio', etc.
  macro?: string;       // For cross_app_action: 'chat.send_prompt', 'studio.generate_image', etc.
  config: {
    model?: string;
    promptTemplate?: string;
    inputSource?: 'previous' | 'manual' | 'vault';
    vaultItemId?: string;
    outputType?: string;
    saveToVault?: boolean;
    tags?: string[];
    manualInput?: string;
    transformType?: string;
    transformPattern?: string;
    qcDescription?: string;
  };
}

export interface WorkflowRow {
  id: string;
  level: number;
  modules: ModuleConfig[];  // Modules in this row run in parallel
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  rows: WorkflowRow[];
  isTemplate: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Execution Types
// ---------------------------------------------------------------------------

export interface StepResult {
  moduleId: string;
  level: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'awaiting_qc';
  output: any;
  vaultItemId?: string;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  latencyMs?: number;
  qcDecision?: 'approved' | 'rejected' | null;
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'paused_for_qc' | 'completed' | 'failed';
  currentLevel: number;
  stepResults: StepResult[];
  error?: string;
  startedAt: string;
  completedAt?: string;
}

// ---------------------------------------------------------------------------
// IPC Channels
// ---------------------------------------------------------------------------

export const IPC_CHANNELS = {
  // Workflows
  WORKFLOW_LIST: 'workflow-list',
  WORKFLOW_CREATE: 'workflow-create',
  WORKFLOW_UPDATE: 'workflow-update',
  WORKFLOW_DELETE: 'workflow-delete',
  WORKFLOW_GET: 'workflow-get',

  // Runs
  WORKFLOW_RUN: 'workflow-run',
  WORKFLOW_RESUME: 'workflow-resume',
  WORKFLOW_GET_RUNS: 'workflow-get-runs',
  WORKFLOW_GET_RUN: 'workflow-get-run',

  // Cross-app discovery
  MACRO_GET_REGISTRY: 'macro-get-registry',
  MACRO_GET_AVAILABLE: 'macro-get-available',

  // Vault
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
// ElectronAPI — Renderer -> Main bridge
// ---------------------------------------------------------------------------

export interface ElectronAPI {
  // Workflows
  workflowList(): Promise<Workflow[]>;
  workflowCreate(data: { name: string; description?: string; rows: WorkflowRow[] }): Promise<Workflow>;
  workflowUpdate(id: string, updates: Partial<Workflow>): Promise<Workflow>;
  workflowDelete(id: string): Promise<void>;
  workflowGet(id: string): Promise<Workflow | null>;

  // Runs
  workflowRun(workflowId: string, manualInput?: string): Promise<WorkflowRun>;
  workflowResume(runId: string, decision: 'approved' | 'rejected'): Promise<WorkflowRun>;
  workflowGetRuns(workflowId: string): Promise<WorkflowRun[]>;
  workflowGetRun(runId: string): Promise<WorkflowRun | null>;

  // Cross-app discovery
  macroGetRegistry(): Promise<any>;
  macroGetAvailable(): Promise<any>;

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
  onWorkflowStepProgress(callback: (data: {
    runId: string;
    level: number;
    moduleId: string;
    status: string;
    output?: any;
  }) => void): () => void;
  onTrayNewWorkflow(callback: () => void): () => void;
}

// ---------------------------------------------------------------------------
// Global augmentation for renderer access
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
