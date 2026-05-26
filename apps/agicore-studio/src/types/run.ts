// Run event protocol.
//
// Per OQ-2 (SPRINT_0_NOTES.md), runs are driven by a stream of events
// from the agicore-cli runner over a local-only websocket. This file
// is that protocol's TypeScript shape — the same shape produced by
// the in-renderer StubRunner today and by the real CLI tomorrow.
//
// Adding a new event type means adding it here, in the Rust CLI's
// event emitter, and (probably) in RunInspector's rendering. Three
// places. Keep them in sync.

export type RunStatus =
  | 'idle'           // no run started
  | 'running'        // events arriving
  | 'paused_qc'      // halted at a qc_checkpoint awaiting human decision
  | 'succeeded'      // RunCompleted received
  | 'failed'         // RunFailed received
  | 'cancelled';     // user pressed Cancel before completion

export type NodeRunStatus =
  | 'idle'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'paused_qc'
  | 'skipped';

/** Discriminated union — every event the CLI can emit. */
export type RunEvent =
  | { kind: 'run_started';     timestamp: number; workflow_name: string }
  | { kind: 'node_started';    timestamp: number; node_id: string; node_name: string }
  | { kind: 'node_succeeded';  timestamp: number; node_id: string; node_name: string; output: unknown }
  | { kind: 'node_failed';     timestamp: number; node_id: string; node_name: string; error: string }
  | { kind: 'node_skipped';    timestamp: number; node_id: string; node_name: string; reason: string }
  | { kind: 'qc_paused';       timestamp: number; node_id: string; node_name: string; upstream_output: unknown; prompt: string }
  | { kind: 'log';             timestamp: number; node_id?: string; message: string; level: 'info' | 'warn' | 'error' }
  | { kind: 'run_completed';   timestamp: number; final_output: unknown }
  | { kind: 'run_failed';      timestamp: number; error: string }
  | { kind: 'run_cancelled';   timestamp: number };

/** A captured snapshot of one node's run-time I/O — built up from events. */
export interface NodeRunRecord {
  node_id: string;
  node_name: string;
  status: NodeRunStatus;
  started_at: number | null;
  finished_at: number | null;
  output: unknown;
  error: string | null;
}
