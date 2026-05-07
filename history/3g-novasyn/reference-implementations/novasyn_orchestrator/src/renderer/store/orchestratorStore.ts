import { create } from 'zustand';
import type { Workflow, WorkflowRun } from '../../shared/types';

interface OrchestratorState {
  // Data
  workflows: Workflow[];
  currentWorkflowId: string | null;
  runs: WorkflowRun[];
  apiKeys: Record<string, string>;
  isLoading: boolean;

  // Computed
  currentWorkflow: () => Workflow | null;

  // CRUD actions
  loadWorkflows: () => Promise<void>;
  createWorkflow: (data: { name: string; description?: string; rows: Workflow['rows'] }) => Promise<Workflow>;
  updateWorkflow: (id: string, updates: Partial<Workflow>) => Promise<Workflow>;
  deleteWorkflow: (id: string) => Promise<void>;
  duplicateWorkflow: (id: string) => Promise<Workflow | null>;
  selectWorkflow: (id: string | null) => void;

  // Run actions
  loadRuns: (workflowId: string) => Promise<void>;

  // Init
  loadInitialData: () => Promise<void>;
}

export const useOrchestratorStore = create<OrchestratorState>((set, get) => ({
  workflows: [],
  currentWorkflowId: null,
  runs: [],
  apiKeys: {},
  isLoading: false,

  currentWorkflow: () => {
    const { workflows, currentWorkflowId } = get();
    return workflows.find((w) => w.id === currentWorkflowId) ?? null;
  },

  loadWorkflows: async () => {
    try {
      const workflows = await window.electronAPI.workflowList();
      set({ workflows });
    } catch (err) {
      console.error('Failed to load workflows:', err);
    }
  },

  createWorkflow: async (data) => {
    const workflow = await window.electronAPI.workflowCreate(data);
    set((s) => ({ workflows: [workflow, ...s.workflows] }));
    return workflow;
  },

  updateWorkflow: async (id, updates) => {
    const workflow = await window.electronAPI.workflowUpdate(id, updates);
    set((s) => ({
      workflows: s.workflows.map((w) => (w.id === id ? workflow : w)),
    }));
    return workflow;
  },

  deleteWorkflow: async (id) => {
    await window.electronAPI.workflowDelete(id);
    set((s) => ({
      workflows: s.workflows.filter((w) => w.id !== id),
      currentWorkflowId: s.currentWorkflowId === id ? null : s.currentWorkflowId,
    }));
  },

  duplicateWorkflow: async (id) => {
    const source = get().workflows.find((w) => w.id === id);
    if (!source) return null;
    const workflow = await window.electronAPI.workflowCreate({
      name: `${source.name} (Copy)`,
      description: source.description,
      rows: source.rows,
    });
    set((s) => ({ workflows: [workflow, ...s.workflows] }));
    return workflow;
  },

  selectWorkflow: (id) => {
    set({ currentWorkflowId: id });
  },

  loadRuns: async (workflowId) => {
    try {
      const runs = await window.electronAPI.workflowGetRuns(workflowId);
      set({ runs });
    } catch (err) {
      console.error('Failed to load runs:', err);
    }
  },

  loadInitialData: async () => {
    set({ isLoading: true });
    try {
      const [workflows, apiKeys] = await Promise.all([
        window.electronAPI.workflowList(),
        window.electronAPI.getApiKeys(),
      ]);
      set({ workflows, apiKeys, isLoading: false });
    } catch (err) {
      console.error('Failed to load initial data:', err);
      set({ isLoading: false });
    }
  },
}));
