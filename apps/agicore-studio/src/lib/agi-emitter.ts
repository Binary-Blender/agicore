// Canvas state → .agi text serializer.
//
// AD-1 in PROJECT_PLAN.md: text is the source of truth. This function is
// the one place where canvas authoring becomes text. Its output must
// look like something a human would write — no positional noise, no
// generator metadata embedded as comments, no defensive boilerplate.
//
// The MVP ship criteria includes: "git diff of the .agi file after a
// series of canvas edits looks like something a human would write."
// This function is what makes that true.

import type {
  NodeKind,
  Workflow,
  WorkflowEdge,
  WorkflowNode,
} from '../types/workflow';

const KIND_TO_AGI_TYPE: Record<NodeKind, string> = {
  start:         'start',
  end:           'end',
  http_call:     'http_call',
  ai_call:       'ai_call',
  qc_checkpoint: 'qc_checkpoint',
  branch:        'branch',
};

export interface EmitterOptions {
  /** APP block name. Defaults to the workflow name + "_app". */
  appName?: string;
  appTitle?: string;
  /** If true, top-of-file comment header is included. */
  includeHeader?: boolean;
}

export function emitAgi(wf: Workflow, opts: EmitterOptions = {}): string {
  const lines: string[] = [];

  if (opts.includeHeader !== false) {
    lines.push(`// ${wf.name}.agi`);
    if (wf.description) lines.push(`// ${wf.description}`);
    lines.push('');
  }

  const appName = opts.appName ?? `${wf.name}_app`;
  const appTitle = opts.appTitle ?? humanizeName(wf.name);
  lines.push(`APP ${appName} {`);
  lines.push(`  TITLE  "${appTitle}"`);
  lines.push(`  DB     ${wf.name}.db`);
  lines.push(`}`);
  lines.push('');

  // WORKFLOW
  lines.push(`WORKFLOW ${wf.name} {`);
  if (wf.description) {
    lines.push(`  DESCRIPTION "${escapeStr(wf.description)}"`);
  }
  if (wf.inputs.length) {
    lines.push(`  INPUT  ${wf.inputs.map(io => `${io.name}: ${io.type}`).join(', ')}`);
  }
  if (wf.outputs.length) {
    lines.push(`  OUTPUT ${wf.outputs.map(io => `${io.name}: ${io.type}`).join(', ')}`);
  }

  if (wf.nodes.length) lines.push('');

  for (const node of orderNodesForEmit(wf)) {
    emitNode(node, lines);
  }

  if (wf.edges.length) {
    lines.push('');
    for (const edge of wf.edges) {
      emitEdge(edge, wf, lines);
    }
  }

  lines.push(`}`);
  lines.push('');

  return lines.join('\n');
}

function emitNode(node: WorkflowNode, out: string[]): void {
  out.push(`  NODE ${node.name} {`);
  out.push(`    TYPE      ${KIND_TO_AGI_TYPE[node.kind]}`);

  const p = node.properties;
  switch (node.kind) {
    case 'http_call': {
      if (p.method) out.push(`    METHOD    ${p.method}`);
      if (p.url) out.push(`    URL       "${escapeStr(p.url as string)}"`);
      if (p.body) out.push(`    BODY      "${escapeStr(p.body as string)}"`);
      break;
    }
    case 'ai_call': {
      if (p.prompt) out.push(`    PROMPT    "${escapeStr(p.prompt as string)}"`);
      break;
    }
    case 'qc_checkpoint': {
      if (p.prompt) out.push(`    PROMPT    "${escapeStr(p.prompt as string)}"`);
      if (p.upstreamFrom) {
        out.push(`    INPUT     review_target FROM ${p.upstreamFrom}`);
      }
      break;
    }
    case 'branch': {
      if (p.condition) out.push(`    WHEN      ${p.condition}`);
      break;
    }
    case 'start':
    case 'end':
      // No extra fields
      break;
  }

  out.push(`  }`);
}

function emitEdge(edge: WorkflowEdge, wf: Workflow, out: string[]): void {
  const src = wf.nodes.find(n => n.id === edge.source);
  const dst = wf.nodes.find(n => n.id === edge.target);
  if (!src || !dst) return; // dangling edge — skip silently rather than emit junk

  const arrow = `EDGE ${src.name} -> ${dst.name}`;
  if (edge.whenExpression) {
    out.push(`  ${arrow}  WHEN ${edge.whenExpression}`);
  } else {
    out.push(`  ${arrow}`);
  }
}

/**
 * Order nodes for emission. Start node first, end node last, others in
 * topological order (best-effort — falls back to insertion order if
 * the graph has cycles or disconnected components).
 */
function orderNodesForEmit(wf: Workflow): WorkflowNode[] {
  const indexById = new Map(wf.nodes.map(n => [n.id, n]));
  const incoming = new Map<string, number>();
  for (const n of wf.nodes) incoming.set(n.id, 0);
  for (const e of wf.edges) {
    incoming.set(e.target, (incoming.get(e.target) ?? 0) + 1);
  }

  // Kahn's algorithm
  const ordered: WorkflowNode[] = [];
  const queue = wf.nodes
    .filter(n => incoming.get(n.id) === 0)
    // Prefer 'start' kinds first among roots
    .sort((a, b) => (a.kind === 'start' ? -1 : 0) - (b.kind === 'start' ? -1 : 0));

  while (queue.length) {
    const n = queue.shift()!;
    ordered.push(n);
    for (const e of wf.edges.filter(e => e.source === n.id)) {
      const next = incoming.get(e.target)! - 1;
      incoming.set(e.target, next);
      if (next === 0) {
        const target = indexById.get(e.target);
        if (target) queue.push(target);
      }
    }
  }

  // Append anything missed (cycles / disconnected) in insertion order
  const seen = new Set(ordered.map(n => n.id));
  for (const n of wf.nodes) {
    if (!seen.has(n.id)) ordered.push(n);
  }
  return ordered;
}

function escapeStr(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

function humanizeName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

// ============================================================================
// Layout sidecar serialization — positions + viewport only, no semantic data.
// ============================================================================

export interface LayoutSidecar {
  positions: Record<string, { x: number; y: number }>;
  viewport?: { x: number; y: number; zoom: number };
}

export function emitLayoutSidecar(
  wf: Workflow,
  viewport?: { x: number; y: number; zoom: number },
): LayoutSidecar {
  const positions: Record<string, { x: number; y: number }> = {};
  for (const node of wf.nodes) {
    positions[node.id] = { x: node.position.x, y: node.position.y };
  }
  return { positions, viewport };
}
