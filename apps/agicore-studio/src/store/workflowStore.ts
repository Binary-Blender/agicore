import { create } from 'zustand';
import {
  defaultNameFor,
  defaultPropertiesFor,
  emptyWorkflow,
  type NodeKind,
  type Workflow,
  type WorkflowEdge,
  type WorkflowNode,
} from '../types/workflow';

let idCounter = 1;
const nextId = () => `n${idCounter++}`;

interface WorkflowStore {
  workflow: Workflow;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  /** True when the canvas state differs from last-saved disk state. */
  dirty: boolean;
  /** Visible filesystem path of the current workflow (null = unsaved). */
  filePath: string | null;

  // Workflow-level edits
  setWorkflowName: (name: string) => void;
  setWorkflowDescription: (desc: string) => void;

  // Node ops
  addNode: (kind: NodeKind, position: { x: number; y: number }) => WorkflowNode;
  updateNode: (id: string, patch: Partial<WorkflowNode>) => void;
  updateNodeProperty: (id: string, key: string, value: unknown) => void;
  moveNode: (id: string, position: { x: number; y: number }) => void;
  deleteNode: (id: string) => void;

  // Edge ops
  addEdge: (source: string, target: string) => WorkflowEdge | null;
  deleteEdge: (id: string) => void;
  updateEdge: (id: string, patch: Partial<WorkflowEdge>) => void;

  // Selection
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;

  // Bulk
  resetTo: (wf: Workflow, filePath?: string | null) => void;
  markClean: (filePath?: string | null) => void;
}

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  workflow: emptyWorkflow(),
  selectedNodeId: null,
  selectedEdgeId: null,
  dirty: false,
  filePath: null,

  setWorkflowName: (name) =>
    set((s) => ({
      workflow: { ...s.workflow, name },
      dirty: true,
    })),

  setWorkflowDescription: (description) =>
    set((s) => ({
      workflow: { ...s.workflow, description },
      dirty: true,
    })),

  addNode: (kind, position) => {
    const id = nextId();
    const nthOfKind = get().workflow.nodes.filter(n => n.kind === kind).length + 1;
    const node: WorkflowNode = {
      id,
      name: defaultNameFor(kind, nthOfKind),
      kind,
      position,
      properties: defaultPropertiesFor(kind),
    };
    set((s) => ({
      workflow: { ...s.workflow, nodes: [...s.workflow.nodes, node] },
      selectedNodeId: id,
      selectedEdgeId: null,
      dirty: true,
    }));
    return node;
  },

  updateNode: (id, patch) =>
    set((s) => ({
      workflow: {
        ...s.workflow,
        nodes: s.workflow.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
      },
      dirty: true,
    })),

  updateNodeProperty: (id, key, value) =>
    set((s) => ({
      workflow: {
        ...s.workflow,
        nodes: s.workflow.nodes.map((n) =>
          n.id === id
            ? { ...n, properties: { ...n.properties, [key]: value } }
            : n,
        ),
      },
      dirty: true,
    })),

  moveNode: (id, position) =>
    // Move is high-frequency (every drag delta). Don't mark dirty on
    // every micro-move — the canvas onNodeDragStop handler marks dirty
    // once when the drag finishes via a different path.
    set((s) => ({
      workflow: {
        ...s.workflow,
        nodes: s.workflow.nodes.map((n) => (n.id === id ? { ...n, position } : n)),
      },
    })),

  deleteNode: (id) =>
    set((s) => ({
      workflow: {
        ...s.workflow,
        nodes: s.workflow.nodes.filter((n) => n.id !== id),
        // Cascade: remove edges touching the deleted node
        edges: s.workflow.edges.filter((e) => e.source !== id && e.target !== id),
      },
      selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
      dirty: true,
    })),

  addEdge: (source, target) => {
    if (source === target) return null;
    // No duplicate edges between the same pair
    const exists = get().workflow.edges.some(
      (e) => e.source === source && e.target === target,
    );
    if (exists) return null;
    const id = `e${idCounter++}`;
    const edge: WorkflowEdge = { id, source, target };
    set((s) => ({
      workflow: { ...s.workflow, edges: [...s.workflow.edges, edge] },
      dirty: true,
    }));
    return edge;
  },

  deleteEdge: (id) =>
    set((s) => ({
      workflow: {
        ...s.workflow,
        edges: s.workflow.edges.filter((e) => e.id !== id),
      },
      selectedEdgeId: s.selectedEdgeId === id ? null : s.selectedEdgeId,
      dirty: true,
    })),

  updateEdge: (id, patch) =>
    set((s) => ({
      workflow: {
        ...s.workflow,
        edges: s.workflow.edges.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      },
      dirty: true,
    })),

  selectNode: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
  selectEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),

  resetTo: (wf, filePath = null) => {
    // Refresh the id counter to clear any new-node collisions
    let maxN = 0;
    for (const n of wf.nodes) {
      const m = /^n(\d+)$/.exec(n.id);
      if (m) maxN = Math.max(maxN, parseInt(m[1], 10));
    }
    for (const e of wf.edges) {
      const m = /^e(\d+)$/.exec(e.id);
      if (m) maxN = Math.max(maxN, parseInt(m[1], 10));
    }
    idCounter = maxN + 1;
    set({
      workflow: wf,
      selectedNodeId: null,
      selectedEdgeId: null,
      dirty: false,
      filePath: filePath ?? null,
    });
  },

  markClean: (filePath) =>
    set((s) => ({
      dirty: false,
      filePath: filePath ?? s.filePath,
    })),
}));

/** Convenience hook for the currently selected node, if any. */
export function useSelectedNode(): WorkflowNode | null {
  return useWorkflowStore((s) => {
    if (!s.selectedNodeId) return null;
    return s.workflow.nodes.find((n) => n.id === s.selectedNodeId) ?? null;
  });
}

/** Convenience hook for the currently selected edge, if any. */
export function useSelectedEdge(): WorkflowEdge | null {
  return useWorkflowStore((s) => {
    if (!s.selectedEdgeId) return null;
    return s.workflow.edges.find((e) => e.id === s.selectedEdgeId) ?? null;
  });
}
