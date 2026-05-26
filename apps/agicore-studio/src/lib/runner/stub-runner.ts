// StubRunner — in-renderer simulator that drives the run-event protocol.
//
// Lives here so we can build the run-time UX (canvas painting, event log,
// QC pause/resume, per-node I/O inspection) before the real agicore-cli
// exists. When the CLI lands, this implementation gets replaced by
// CliRunner (spawn binary, parse "listening" line, connect websocket,
// pipe events). Same RunnerAdapter interface, no UI changes.

import type { QcDecision, RunEvent } from '../../types/run';
import type { Workflow, WorkflowNode } from '../../types/workflow';
import type { RunnerAdapter } from './index';

const NODE_DELAY_MS = { min: 350, max: 900 };
const EDGE_DELAY_MS = 80; // brief pause between nodes for visual rhythm

export class StubRunner implements RunnerAdapter {
  private cancelled = false;
  private pendingResume: ((decision: QcDecision) => void) | null = null;

  start(workflow: Workflow, onEvent: (e: RunEvent) => void): void {
    this.cancelled = false;
    this.pendingResume = null;
    const ordered = topologicalOrder(workflow);

    void (async () => {
      onEvent({ kind: 'run_started', timestamp: Date.now(), workflow_name: workflow.name });

      try {
        for (const node of ordered) {
          if (this.cancelled) {
            onEvent({ kind: 'run_cancelled', timestamp: Date.now() });
            return;
          }
          const cont = await this.runOne(node, onEvent);
          if (cont === 'cancel') {
            onEvent({ kind: 'run_cancelled', timestamp: Date.now() });
            return;
          }
        }
        if (this.cancelled) {
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
  }

  resumeQc(decision: QcDecision): void {
    const resolve = this.pendingResume;
    if (!resolve) return;
    this.pendingResume = null;
    resolve(decision);
  }

  cancel(): void {
    this.cancelled = true;
    // If we're stuck awaiting a QC decision, unblock the await with a synthetic
    // rejection so the loop can observe `cancelled` and exit cleanly.
    if (this.pendingResume) {
      const resolve = this.pendingResume;
      this.pendingResume = null;
      resolve({ decision: 'rejected', comment: '[cancelled]' });
    }
  }

  /** Run one node. Returns 'continue' to keep going or 'cancel' to stop. */
  private async runOne(
    node: WorkflowNode,
    onEvent: (e: RunEvent) => void,
  ): Promise<'continue' | 'cancel'> {
    onEvent({
      kind: 'node_started',
      timestamp: Date.now(),
      node_id: node.id,
      node_name: node.name,
    });

    const work = NODE_DELAY_MS.min + Math.random() * (NODE_DELAY_MS.max - NODE_DELAY_MS.min);
    await sleep(work);
    if (this.cancelled) return 'cancel';

    // QC checkpoint: suspend the run until the human submits a decision.
    if (node.kind === 'qc_checkpoint') {
      const upstreamOutput = syntheticUpstreamForQc(node);
      onEvent({
        kind: 'qc_paused',
        timestamp: Date.now(),
        node_id: node.id,
        node_name: node.name,
        upstream_output: upstreamOutput,
        prompt: (node.properties.prompt as string) ?? 'Review and approve.',
      });

      const decision = await new Promise<QcDecision>((resolve) => {
        this.pendingResume = resolve;
      });

      if (this.cancelled) return 'cancel';

      const finalOutput =
        decision.decision === 'edited' ? decision.edited_output : upstreamOutput;

      if (decision.comment) {
        onEvent({
          kind: 'log',
          timestamp: Date.now(),
          node_id: node.id,
          level: 'info',
          message: `qc[${node.name}] reviewer note: ${decision.comment}`,
        });
      }

      if (decision.decision === 'rejected') {
        onEvent({
          kind: 'node_skipped',
          timestamp: Date.now(),
          node_id: node.id,
          node_name: node.name,
          reason: 'rejected by reviewer',
        });
        // For MVP, a rejection ends the run. Branching on rejection is a
        // future feature (an explicit "rejected" out-edge on QC nodes).
        onEvent({
          kind: 'run_cancelled',
          timestamp: Date.now(),
        });
        return 'cancel';
      }

      onEvent({
        kind: 'node_succeeded',
        timestamp: Date.now(),
        node_id: node.id,
        node_name: node.name,
        output: { decision: decision.decision, final_output: finalOutput },
      });
      await sleep(EDGE_DELAY_MS);
      return 'continue';
    }

    // Branch: the stub doesn't evaluate; the compiler will. Log + pass.
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
    return 'continue';
  }
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
      return { decision: 'approved', final_output: '[stub]' };
    case 'branch':
      return { taken: 'true' };
  }
}

/**
 * What upstream node would have produced for this QC node. The stub
 * inspects upstreamFrom (set by NodeInspector) and fakes a plausible
 * payload — text for "summarize" / "summary"-named refs, generic
 * synthetic-output otherwise.
 */
function syntheticUpstreamForQc(node: WorkflowNode): unknown {
  const from = (node.properties.upstreamFrom as string | undefined) ?? '';
  if (/summar/i.test(from)) {
    return {
      text:
        'The original article argues three things: first, that the framework matters more than the model; second, that latency budgets dominate user perception; and third, that determinism is a feature, not a constraint. Each point is supported with examples drawn from production deployments.',
    };
  }
  if (/answer|response|content/i.test(from)) {
    return {
      text: '[synthetic upstream content awaiting review]',
    };
  }
  return {
    note: `[stub: synthetic upstream output. Wire upstreamFrom in the inspector to control this.]`,
    upstream_from: from,
  };
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
