// Node-kind registry — the first cut of an extensibility API for new
// node kinds. Each kind is defined once with its display metadata,
// defaults, and behavior hooks; consumers across the renderer read
// from this registry rather than maintaining their own switch
// statements.
//
// SCOPE NOTE: This sprint refactors the "easy" consumers — palette,
// canvas colors, canvas detail line — to read from the registry. The
// harder consumers (NodeInspector forms, the .agi emitter, the .agi
// parser, the StubRunner outputs, the autocomplete catalogues) still
// have their own per-kind switches. They will migrate to the registry
// in subsequent sprints. See CONTRIBUTING_NODE_KINDS.md for the
// current list of surfaces a new kind has to touch.

import type { NodeKind, WorkflowNode } from '../../types/workflow';

export interface NodeKindDefinition {
  /** Canonical kind id — used as the .agi TYPE value and the
   *  discriminator in the workflow store. */
  kind: NodeKind;

  // ----- Display -----
  /** Short label used inside the node card and the inspector header. */
  shortLabel: string;
  /** Verbose label used in the palette and inspector subtitle. */
  paletteLabel: string;
  /** One-line description shown under the palette card and in autocomplete. */
  description: string;
  /** CSS variable for the per-kind accent color. */
  cssVar: string;
  /** Hex equivalent — for the React Flow minimap which doesn't read CSS vars. */
  miniMapHex: string;

  // ----- Defaults -----
  /** Default properties for a freshly-dropped node. */
  defaultProperties: () => Record<string, unknown>;
  /** Default name prefix (the nth-of-kind suffix is added by the caller). */
  defaultNameBase: string;

  // ----- Behavior -----
  /** Render-time accessor for the node's display detail line (the small
   *  third row under the name). Return undefined to render no detail. */
  detailFor?: (node: WorkflowNode) => string | undefined;
  /** Whether this kind has an inbound handle (target). Start nodes don't. */
  hasInput: boolean;
  /** Whether this kind has an outbound handle (source). End nodes don't. */
  hasOutput: boolean;
}

// ----- The registry -----
//
// Order matters: this is the order palette cards appear in.

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

const DEFINITIONS: NodeKindDefinition[] = [
  {
    kind: 'start',
    shortLabel: 'start',
    paletteLabel: 'Start',
    description: 'Workflow entry point',
    cssVar: 'var(--node-start)',
    miniMapHex: '#10b981',
    defaultProperties: () => ({}),
    defaultNameBase: 'start',
    hasInput: false,
    hasOutput: true,
  },
  {
    kind: 'http_call',
    shortLabel: 'HTTP',
    paletteLabel: 'HTTP Call',
    description: 'GET / POST / PUT / DELETE',
    cssVar: 'var(--node-http)',
    miniMapHex: '#475569',
    defaultProperties: () => ({
      method: 'GET',
      url:    'https://example.com/{{input.path}}',
      body:   '',
    }),
    defaultNameBase: 'http_call',
    detailFor: (n) => (n.properties.method && n.properties.url)
      ? `${n.properties.method} ${n.properties.url}`
      : undefined,
    hasInput: true,
    hasOutput: true,
  },
  {
    kind: 'ai_call',
    shortLabel: 'AI',
    paletteLabel: 'AI Call',
    description: 'LLM with templated prompt',
    cssVar: 'var(--node-ai)',
    miniMapHex: '#7c3aed',
    defaultProperties: () => ({
      prompt: 'Write your prompt here. Reference upstream outputs with {{node_name.field}}.',
    }),
    defaultNameBase: 'ai_call',
    detailFor: (n) => n.properties.prompt
      ? truncate(n.properties.prompt as string, 60)
      : undefined,
    hasInput: true,
    hasOutput: true,
  },
  {
    kind: 'qc_checkpoint',
    shortLabel: 'Human QC',
    paletteLabel: 'Human QC',
    description: 'Pause for human approval',
    cssVar: 'var(--node-qc)',
    miniMapHex: '#06b6d4',
    defaultProperties: () => ({
      prompt: 'Review the upstream output. Approve, edit, or reject.',
      upstreamFrom: '',
    }),
    defaultNameBase: 'qc_checkpoint',
    detailFor: (n) => n.properties.upstreamFrom
      ? `from ${n.properties.upstreamFrom}`
      : undefined,
    hasInput: true,
    hasOutput: true,
  },
  {
    kind: 'branch',
    shortLabel: 'branch',
    paletteLabel: 'Branch',
    description: 'Conditional routing',
    cssVar: 'var(--node-branch)',
    miniMapHex: '#f59e0b',
    defaultProperties: () => ({
      condition: 'previous.value == "approved"',
    }),
    defaultNameBase: 'branch',
    detailFor: (n) => n.properties.condition
      ? truncate(n.properties.condition as string, 60)
      : undefined,
    hasInput: true,
    hasOutput: true,
  },
  {
    kind: 'loop',
    shortLabel: 'loop',
    paletteLabel: 'Loop',
    description: 'Iterate downstream over a collection',
    cssVar: 'var(--node-loop)',
    miniMapHex: '#ec4899',
    defaultProperties: () => ({
      over: '{{input.items}}',
      as:   'item',
    }),
    defaultNameBase: 'loop',
    detailFor: (n) => n.properties.over
      ? `over ${truncate(n.properties.over as string, 40)} as ${n.properties.as ?? 'item'}`
      : undefined,
    hasInput: true,
    hasOutput: true,
  },
  {
    kind: 'parallel_fanout',
    shortLabel: 'fanout',
    paletteLabel: 'Parallel Fanout',
    description: 'Run multiple downstream paths',
    cssVar: 'var(--node-fanout)',
    miniMapHex: '#14b8a6',
    defaultProperties: () => ({}),
    defaultNameBase: 'fanout',
    hasInput: true,
    hasOutput: true,
  },
  {
    kind: 'router_call',
    shortLabel: 'router',
    paletteLabel: 'Router Call',
    description: 'Dispatch via a tier-based router',
    cssVar: 'var(--node-router)',
    miniMapHex: '#f97316',
    defaultProperties: () => ({
      router:    'BabyAI',
      task_type: 'general',
    }),
    defaultNameBase: 'route',
    detailFor: (n) => n.properties.router
      ? `${n.properties.router} · ${n.properties.task_type ?? 'general'}`
      : undefined,
    hasInput: true,
    hasOutput: true,
  },
  {
    kind: 'end',
    shortLabel: 'end',
    paletteLabel: 'End',
    description: 'Workflow exit',
    cssVar: 'var(--node-end)',
    miniMapHex: '#6b7280',
    defaultProperties: () => ({}),
    defaultNameBase: 'end',
    hasInput: true,
    hasOutput: false,
  },
];

const BY_KIND = new Map<NodeKind, NodeKindDefinition>(
  DEFINITIONS.map((d) => [d.kind, d]),
);

export function getNodeKind(kind: NodeKind): NodeKindDefinition {
  const def = BY_KIND.get(kind);
  if (!def) throw new Error(`unknown node kind: ${kind}`);
  return def;
}

export function getAllNodeKinds(): NodeKindDefinition[] {
  return DEFINITIONS;
}
