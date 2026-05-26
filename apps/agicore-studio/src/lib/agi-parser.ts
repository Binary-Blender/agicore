// .agi → workflow parser.
//
// Scope: WORKFLOW + its NODE / EDGE declarations only. Everything else
// in the .agi file is currently ignored (APP, ENTITY, ACTION, etc.) —
// MVP only authors WORKFLOW. A future sprint replaces this with a full
// Lezer-based parser shared with the editor's autocomplete layer.
//
// Strategy: regex-based block extraction. Crude but sufficient for the
// limited surface we emit. If the user hand-edits the .agi outside our
// emit conventions, weird things may happen — but tryParseAgi will at
// least report what it noticed so the UI can refuse to clobber the
// canvas with garbage.

import {
  defaultPropertiesFor,
  emptyWorkflow,
  type NodeKind,
  type Workflow,
  type WorkflowEdge,
  type WorkflowNode,
} from '../types/workflow';

const NODE_KIND_RE = /^(start|http_call|ai_call|qc_checkpoint|branch|end)$/;

/** Result-shaped parser. Use this from sync paths that need to refuse
 *  to apply broken input. The forgiving variant below stays available
 *  for the file-load path where partial parses beat nothing. */
export interface ParseResult {
  workflow: Workflow;
  errors: string[];
}

export function tryParseAgi(source: string): ParseResult {
  const errors: string[] = [];
  const wf = emptyWorkflow();

  if (!source.trim()) {
    return { workflow: wf, errors: ['empty source'] };
  }

  const wfMatch = source.match(/WORKFLOW\s+(\w+)\s*\{([\s\S]*?)^\}/m);
  if (!wfMatch) {
    errors.push('no WORKFLOW block found');
    return { workflow: wf, errors };
  }

  wf.name = wfMatch[1];
  const body = wfMatch[2];

  const descMatch = body.match(/DESCRIPTION\s+"((?:[^"\\]|\\.)*)"/);
  if (descMatch) wf.description = unescapeStr(descMatch[1]);

  const inputMatch = body.match(/^\s*INPUT\s+(.+)$/m);
  if (inputMatch) wf.inputs = parseIOList(inputMatch[1]) as Workflow['inputs'];
  const outputMatch = body.match(/^\s*OUTPUT\s+(.+)$/m);
  if (outputMatch) wf.outputs = parseIOList(outputMatch[1]) as Workflow['outputs'];

  const nodeBlockRe = /^\s*NODE\s+(\w+)\s*\{([\s\S]*?)^\s{0,4}\}\s*$/gm;
  let nodeIndex = 0;
  let m: RegExpExecArray | null;
  const nodesByName = new Map<string, WorkflowNode>();
  while ((m = nodeBlockRe.exec(body)) !== null) {
    const name = m[1];
    const inner = m[2];
    const typeMatch = inner.match(/^\s*TYPE\s+(\w+)/m);
    if (!typeMatch) {
      errors.push(`node "${name}" missing TYPE`);
      continue;
    }
    const rawType = typeMatch[1];
    if (!NODE_KIND_RE.test(rawType)) {
      errors.push(`node "${name}" has unknown TYPE "${rawType}"`);
      continue;
    }
    const kind = rawType as NodeKind;
    const node: WorkflowNode = {
      id: `n${nodeIndex + 1}`,
      name,
      kind,
      position: { x: 80 + nodeIndex * 240, y: 200 },
      properties: { ...defaultPropertiesFor(kind), ...parseProperties(inner, kind) },
    };
    wf.nodes.push(node);
    nodesByName.set(name, node);
    nodeIndex += 1;
  }

  const edgeRe = /^\s*EDGE\s+(\w+)\s*->\s*(\w+)(?:\s+WHEN\s+(.+?))?$/gm;
  let edgeIndex = 0;
  let em: RegExpExecArray | null;
  while ((em = edgeRe.exec(body)) !== null) {
    const sourceName = em[1];
    const targetName = em[2];
    const whenExpr = em[3]?.trim();
    const src = nodesByName.get(sourceName);
    const dst = nodesByName.get(targetName);
    if (!src) {
      errors.push(`edge ${sourceName} -> ${targetName}: source node "${sourceName}" not declared`);
      continue;
    }
    if (!dst) {
      errors.push(`edge ${sourceName} -> ${targetName}: target node "${targetName}" not declared`);
      continue;
    }
    wf.edges.push({
      id: `e${edgeIndex + 1}`,
      source: src.id,
      target: dst.id,
      whenExpression: whenExpr,
    });
    edgeIndex += 1;
  }

  return { workflow: wf, errors };
}

/** Forgiving variant — never raises, never reports errors. Used by the
 *  file-load path where a partial parse beats refusing the whole file. */
export function parseAgiToWorkflow(source: string): Workflow {
  const wf = emptyWorkflow();

  // ----- Workflow block -----
  const wfMatch = source.match(/WORKFLOW\s+(\w+)\s*\{([\s\S]*?)^\}/m);
  if (!wfMatch) return wf;

  wf.name = wfMatch[1];
  const body = wfMatch[2];

  const descMatch = body.match(/DESCRIPTION\s+"((?:[^"\\]|\\.)*)"/);
  if (descMatch) wf.description = unescapeStr(descMatch[1]);

  const inputMatch = body.match(/^\s*INPUT\s+(.+)$/m);
  if (inputMatch) {
    wf.inputs = parseIOList(inputMatch[1]) as Workflow['inputs'];
  }
  const outputMatch = body.match(/^\s*OUTPUT\s+(.+)$/m);
  if (outputMatch) {
    wf.outputs = parseIOList(outputMatch[1]) as Workflow['outputs'];
  }

  // ----- NODE blocks -----
  // Match NODE <name> { ... } where '{ ... }' is balanced at single-level.
  // The emitter never nests braces inside a NODE body, so a non-greedy
  // match up to the first '  }' (two-space outdent) suffices.
  const nodeBlockRe = /^\s*NODE\s+(\w+)\s*\{([\s\S]*?)^\s{0,4}\}\s*$/gm;
  let nodeIndex = 0;
  let m: RegExpExecArray | null;
  const nodesByName = new Map<string, WorkflowNode>();

  while ((m = nodeBlockRe.exec(body)) !== null) {
    const name = m[1];
    const inner = m[2];
    const typeMatch = inner.match(/^\s*TYPE\s+(\w+)/m);
    if (!typeMatch) continue;
    const rawType = typeMatch[1];
    if (!NODE_KIND_RE.test(rawType)) continue;
    const kind = rawType as NodeKind;

    const node: WorkflowNode = {
      id: `n${nodeIndex + 1}`,
      name,
      kind,
      position: { x: 80 + nodeIndex * 240, y: 200 },  // emitter-default layout
      properties: { ...defaultPropertiesFor(kind), ...parseProperties(inner, kind) },
    };
    wf.nodes.push(node);
    nodesByName.set(name, node);
    nodeIndex += 1;
  }

  // ----- EDGE declarations -----
  const edgeRe = /^\s*EDGE\s+(\w+)\s*->\s*(\w+)(?:\s+WHEN\s+(.+?))?$/gm;
  let edgeIndex = 0;
  let em: RegExpExecArray | null;
  while ((em = edgeRe.exec(body)) !== null) {
    const sourceName = em[1];
    const targetName = em[2];
    const whenExpr = em[3]?.trim();
    const src = nodesByName.get(sourceName);
    const dst = nodesByName.get(targetName);
    if (!src || !dst) continue;
    const edge: WorkflowEdge = {
      id: `e${edgeIndex + 1}`,
      source: src.id,
      target: dst.id,
      whenExpression: whenExpr,
    };
    wf.edges.push(edge);
    edgeIndex += 1;
  }

  return wf;
}

function parseProperties(inner: string, kind: NodeKind): Record<string, unknown> {
  const p: Record<string, unknown> = {};
  switch (kind) {
    case 'http_call': {
      const method = matchValue(inner, /^\s*METHOD\s+(\w+)/m);
      if (method) p.method = method;
      const url = matchString(inner, /^\s*URL\s+"((?:[^"\\]|\\.)*)"/m);
      if (url !== null) p.url = url;
      const body = matchString(inner, /^\s*BODY\s+"((?:[^"\\]|\\.)*)"/m);
      if (body !== null) p.body = body;
      break;
    }
    case 'ai_call': {
      const prompt = matchString(inner, /^\s*PROMPT\s+"((?:[^"\\]|\\.)*)"/m);
      if (prompt !== null) p.prompt = prompt;
      break;
    }
    case 'qc_checkpoint': {
      const prompt = matchString(inner, /^\s*PROMPT\s+"((?:[^"\\]|\\.)*)"/m);
      if (prompt !== null) p.prompt = prompt;
      const upstreamFromMatch = inner.match(/^\s*INPUT\s+\w+\s+FROM\s+([\w.]+)/m);
      if (upstreamFromMatch) p.upstreamFrom = upstreamFromMatch[1];
      break;
    }
    case 'branch': {
      const cond = matchValue(inner, /^\s*WHEN\s+(.+?)\s*$/m);
      if (cond) p.condition = cond;
      break;
    }
  }
  return p;
}

function matchValue(s: string, re: RegExp): string | null {
  const m = s.match(re);
  return m ? m[1] : null;
}

function matchString(s: string, re: RegExp): string | null {
  const m = s.match(re);
  return m ? unescapeStr(m[1]) : null;
}

function parseIOList(s: string): { name: string; type: string }[] {
  return s
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [name, type] = part.split(':').map((x) => x.trim());
      return { name, type: type || 'string' };
    });
}

function unescapeStr(s: string): string {
  return s.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
}
