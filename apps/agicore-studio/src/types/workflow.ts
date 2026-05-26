// Workflow data model — the in-memory shape the canvas authors.
//
// This mirrors the WORKFLOW declaration in the .agi DSL but with a few
// MVP simplifications:
//   - Every node carries its visual properties (position) here too;
//     splitting layout into a sidecar happens at serialization time.
//   - Property bags are loosely typed (Record<string, unknown>) so
//     contributors can extend node types without touching the model.
//     The Inspector knows the per-type schema; the model doesn't.
//
// At MVP exit we'll tighten the property types; right now flexibility
// beats safety because we're still discovering the shape.

export type NodeKind =
  | 'start'
  | 'http_call'
  | 'ai_call'
  | 'qc_checkpoint'
  | 'branch'
  | 'end';

export interface WorkflowNode {
  /** Stable identifier — used for edge endpoints and .agi NODE names. */
  id: string;
  /** Human-readable name. PascalCase or snake_case acceptable. */
  name: string;
  kind: NodeKind;
  position: { x: number; y: number };
  /** Per-kind property bag. See NodeInspector for the per-kind schema. */
  properties: Record<string, unknown>;
}

export interface WorkflowEdge {
  id: string;
  source: string;          // source node id
  target: string;          // target node id
  /** Optional WHEN expression — drawn on the edge label. */
  whenExpression?: string;
}

export interface WorkflowInput {
  name: string;
  type: 'string' | 'number' | 'bool' | 'json';
}

export interface WorkflowOutput {
  name: string;
  type: 'string' | 'number' | 'bool' | 'json';
}

export interface Workflow {
  name: string;
  description: string;
  inputs: WorkflowInput[];
  outputs: WorkflowOutput[];
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

/** Schema-aware defaults for a freshly dropped node. */
export function defaultPropertiesFor(kind: NodeKind): Record<string, unknown> {
  switch (kind) {
    case 'start':
    case 'end':
      return {};
    case 'http_call':
      return {
        method: 'GET',
        url: 'https://example.com/{{input.path}}',
        body: '',
      };
    case 'ai_call':
      return {
        prompt: 'Write your prompt here. Reference upstream outputs with {{node_name.field}}.',
      };
    case 'qc_checkpoint':
      return {
        prompt: 'Review the upstream output. Approve, edit, or reject.',
        upstreamFrom: '',
      };
    case 'branch':
      return {
        condition: 'previous.value == "approved"',
      };
  }
}

export function defaultNameFor(kind: NodeKind, nthOfKind: number): string {
  const base: Record<NodeKind, string> = {
    start:         'start',
    end:           'end',
    http_call:     'http_call',
    ai_call:       'ai_call',
    qc_checkpoint: 'qc_checkpoint',
    branch:        'branch',
  };
  return nthOfKind <= 1 ? base[kind] : `${base[kind]}_${nthOfKind}`;
}

/** Empty starter workflow. */
export function emptyWorkflow(name = 'untitled_workflow'): Workflow {
  return {
    name,
    description: '',
    inputs: [],
    outputs: [],
    nodes: [],
    edges: [],
  };
}
