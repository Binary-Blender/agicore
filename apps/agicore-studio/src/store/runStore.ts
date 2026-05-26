import { create } from 'zustand';
import type {
  NodeRunRecord,
  NodeRunStatus,
  PendingQc,
  QcDecision,
  RunEvent,
  RunStatus,
} from '../types/run';
import type { RunnerAdapter } from '../lib/runner';

interface RunStore {
  status: RunStatus;
  /** Wall-clock ms when the current run started (null = never started). */
  startedAt: number | null;
  finishedAt: number | null;
  /** All events, oldest first. Capped at MAX_LOG entries. */
  log: RunEvent[];
  /** Per-node run records, keyed by node id. */
  nodes: Record<string, NodeRunRecord>;
  /** Set when status === 'failed'. */
  errorMessage: string | null;
  /** Active runner — held so we can cancel and resume QC. */
  runner: RunnerAdapter | null;
  /** Live QC checkpoint awaiting a human decision, or null when none. */
  pendingQc: PendingQc | null;

  startRun: (runner: RunnerAdapter) => void;
  ingest: (event: RunEvent) => void;
  cancel: () => void;
  submitQcDecision: (decision: QcDecision) => void;
  reset: () => void;
}

const MAX_LOG = 5000;

export const useRunStore = create<RunStore>((set, get) => ({
  status: 'idle',
  startedAt: null,
  finishedAt: null,
  log: [],
  nodes: {},
  errorMessage: null,
  runner: null,
  pendingQc: null,

  startRun: (runner) =>
    set({
      status: 'running',
      startedAt: Date.now(),
      finishedAt: null,
      log: [],
      nodes: {},
      errorMessage: null,
      runner,
      pendingQc: null,
    }),

  ingest: (event) =>
    set((s) => {
      const log = [...s.log, event];
      if (log.length > MAX_LOG) log.splice(0, log.length - MAX_LOG);

      const nodes = { ...s.nodes };
      let status = s.status;
      let finishedAt = s.finishedAt;
      let errorMessage = s.errorMessage;
      let pendingQc = s.pendingQc;

      switch (event.kind) {
        case 'run_started':
          status = 'running';
          break;

        case 'node_started':
          nodes[event.node_id] = mergeNode(nodes[event.node_id], {
            node_id: event.node_id,
            node_name: event.node_name,
            status: 'running',
            started_at: event.timestamp,
            finished_at: null,
            output: null,
            error: null,
          });
          break;

        case 'node_succeeded':
          nodes[event.node_id] = mergeNode(nodes[event.node_id], {
            node_id: event.node_id,
            node_name: event.node_name,
            status: 'succeeded',
            finished_at: event.timestamp,
            output: event.output,
            error: null,
          });
          // A node_succeeded that follows a qc_paused for the same node
          // clears the pending QC and returns the run to running.
          if (s.pendingQc?.node_id === event.node_id) {
            pendingQc = null;
            status = 'running';
          }
          break;

        case 'node_failed':
          nodes[event.node_id] = mergeNode(nodes[event.node_id], {
            node_id: event.node_id,
            node_name: event.node_name,
            status: 'failed',
            finished_at: event.timestamp,
            error: event.error,
          });
          break;

        case 'node_skipped':
          nodes[event.node_id] = mergeNode(nodes[event.node_id], {
            node_id: event.node_id,
            node_name: event.node_name,
            status: 'skipped',
            finished_at: event.timestamp,
          });
          // node_skipped on a QC node = the reviewer rejected it.
          if (s.pendingQc?.node_id === event.node_id) {
            pendingQc = null;
          }
          break;

        case 'qc_paused':
          nodes[event.node_id] = mergeNode(nodes[event.node_id], {
            node_id: event.node_id,
            node_name: event.node_name,
            status: 'paused_qc',
          });
          status = 'paused_qc';
          pendingQc = {
            node_id: event.node_id,
            node_name: event.node_name,
            prompt: event.prompt,
            upstream_output: event.upstream_output,
            paused_at: event.timestamp,
          };
          break;

        case 'run_completed':
          status = 'succeeded';
          finishedAt = event.timestamp;
          pendingQc = null;
          break;

        case 'run_failed':
          status = 'failed';
          finishedAt = event.timestamp;
          errorMessage = event.error;
          pendingQc = null;
          break;

        case 'run_cancelled':
          status = 'cancelled';
          finishedAt = event.timestamp;
          pendingQc = null;
          break;

        case 'log':
          // No status change — log line only.
          break;
      }

      return { log, nodes, status, finishedAt, errorMessage, pendingQc };
    }),

  cancel: () => {
    const r = get().runner;
    if (r) r.cancel();
  },

  submitQcDecision: (decision) => {
    const r = get().runner;
    if (!r) return;
    r.resumeQc(decision);
  },

  reset: () =>
    set({
      status: 'idle',
      startedAt: null,
      finishedAt: null,
      log: [],
      nodes: {},
      errorMessage: null,
      runner: null,
      pendingQc: null,
    }),
}));

function mergeNode(
  prev: NodeRunRecord | undefined,
  next: Partial<NodeRunRecord> & { node_id: string; node_name: string; status: NodeRunStatus },
): NodeRunRecord {
  return {
    node_id: next.node_id,
    node_name: next.node_name,
    status: next.status,
    started_at: next.started_at ?? prev?.started_at ?? null,
    finished_at: next.finished_at ?? prev?.finished_at ?? null,
    output: next.output ?? prev?.output ?? null,
    error: next.error ?? prev?.error ?? null,
  };
}

/** Selector helper — get a node's run status, or 'idle' if untouched. */
export function useNodeRunStatus(nodeId: string): NodeRunStatus {
  return useRunStore((s) => s.nodes[nodeId]?.status ?? 'idle');
}
