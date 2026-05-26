// StubRunner — in-renderer simulator that drives the run-event protocol.
//
// Lives here so we can build the run-time UX (canvas painting, event log,
// per-node I/O inspection, eventually QC pause/resume) before the real
// agicore-cli exists. When the CLI lands, this implementation gets
// replaced by CliRunner (spawn binary, parse "listening" line, connect
// websocket, pipe events) — same RunnerAdapter interface, no UI changes.

import type { RunEvent } from '../../types/run';
import type { Workflow, WorkflowNode } from '../../types/workflow';
import type { RunnerAdapter } from './index';

const NODE_DELAY_MS = { min: 350, max: 900 };
const EDGE_DELAY_MS = 80; // brief pause between nodes for visual rhythm

export class StubRunner implements RunnerAdapter {
  start(workflow: Workflow, onEvent: (e: RunEvent) => void): () => void {
    let cancelled = false;
    const cancel = () => {
      cancelled = true;
    };

    const ordered = topologicalOrder(workflow);

    (async () => {
      onEvent({ kind: 'run_started', timestamp: Date.now(), workflow_name: workflow.name });

      try {
        for (const node of ordered) {
          if (cancelled) {
            onEvent({ kind: 'run_cancelled', timestamp: Date.now() });
            return;
          }
          await runOne(node, onEvent, () => cancelled);
        }
        if (cancelled) {
          onEvent({ kind: 'run_cancelled', timestamp: Date.now() });
          return;
        }
        onEvent({
          kind: 'run_completed',
          timestamp: Date.now(),
          final_output: { ok: true, nodes_executed: ordered.length },
        });
      } catch (err) {
        onEvent({
          kind: 'run_failed',
          timestamp: Date.now(),
          error: err instanceof Error ? err.message : String(err),
        });
      }
    })();

    return cancel;
  }
}

async function runOne(
  node: WorkflowNode,
  onEvent: (e: RunEvent) => void,
  isCancelled: () => boolean,
): Promise<void> {
  onEvent({
    kind: 'node_started',
    timestamp: Date.now(),
    node_id: node.id,
    node_name: node.name,
  });

  const work = NODE_DELAY_MS.min + Math.random() * (NODE_DELAY_MS.max - NODE_DELAY_MS.min);
  await sleep(work);
  if (isCancelled()) return;

  // QC nodes: until the QC pause/resume UX lands next session, the stub
  // auto-passes them with a clear log line so the user sees what's pending.
  if (node.kind === 'qc_checkpoint') {
    onEvent({
      kind: 'log',
      timestamp: Date.now(),
      node_id: node.id,
      level: 'warn',
      message: '[stub: QC checkpoint auto-approved — interactive pause/resume is wired in the next sprint]',
    });
  }

  // Branch: just fire the success and emit a log explaining which path won.
  // The stub doesn't actually evaluate the WHEN; that's compiler territory.
  if (node.kind === 'branch') {
    onEvent({
      kind: 'log',
      timestamp: Date.now(),
      node_id: node.id,
      level: 'info',
      message: '[stub: branch condition evaluated as true]',
    });
  }

  onEvent({
    kind: 'node_succeeded',
    timestamp: Date.now(),
    node_id: node.id,
    node_name: node.name,
    output: syntheticOutput(node),
  });

  await sleep(EDGE_DELAY_MS);
}

function syntheticOutput(node: WorkflowNode): unknown {
  switch (node.kind) {
    case 'start':
    case 'end':
      return null;
    case 'http_call':
      return {
        status: 200,
        body: `[synthetic body from ${node.name}]`,
      };
    case 'ai_call':
      return {
        text: `[synthetic AI output from ${node.name}]`,
        tokens: { input: 42, output: 17 },
      };
    case 'qc_checkpoint':
      return {
        decision: 'approved',
        final_summary: '[stub: auto-approved upstream output]',
      };
    case 'branch':
      return { taken: 'true' };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Same Kahn's-algorithm walk used by the .agi emitter, applied to runtime. */
function topologicalOrder(wf: Workflow): WorkflowNode[] {
  const byId = new Map(wf.nodes.map((n) => [n.id, n]));
  const incoming = new Map<string, number>();
  for (const n of wf.nodes) incoming.set(n.id, 0);
  for (const e of wf.edges) {
    incoming.set(e.target, (incoming.get(e.target) ?? 0) + 1);
  }
  const queue = wf.nodes.filter((n) => incoming.get(n.id) === 0);
  queue.sort((a, b) => (a.kind === 'start' ? -1 : 0) - (b.kind === 'start' ? -1 : 0));
  const out: WorkflowNode[] = [];
  while (queue.length) {
    const n = queue.shift()!;
    out.push(n);
    for (const e of wf.edges.filter((e) => e.source === n.id)) {
      const next = incoming.get(e.target)! - 1;
      incoming.set(e.target, next);
      if (next === 0) {
        const t = byId.get(e.target);
        if (t) queue.push(t);
      }
    }
  }
  const seen = new Set(out.map((n) => n.id));
  for (const n of wf.nodes) {
    if (!seen.has(n.id)) out.push(n);
  }
  return out;
}
