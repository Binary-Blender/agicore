// Telemetry — opt-in, schema-safe, session-scoped.
//
// Design constraints (read these before adding an event type):
//
//  1. Opt-in by default. The store starts disabled. Nothing leaves the
//     process until a user explicitly toggles it on AND a sender is
//     wired up. Today there is no sender — the buffer is preview-only.
//
//  2. Schema-safe field names only. No node names, no file paths, no
//     workflow contents, no prompts, no model outputs. If a value is
//     user-typed text, it does not go in here. The allowed primitives
//     are enums we ship in code (node kinds, run statuses, etc.) and
//     numbers (counts, durations).
//
//  3. Cheap when disabled. recordEvent is the hottest path on the
//     instrumented call sites; when the store flag is off it must be
//     a single boolean check and an early return.
//
//  4. Ring-buffered. Session events cap at MAX_EVENTS so a long-running
//     studio session can't exhaust memory.

import type { NodeKind } from '../types/workflow';

export const MAX_EVENTS = 500;

/** The closed enum of event names. Add new names here, never as ad-hoc strings. */
export type TelemetryEventName =
  | 'studio_started'
  | 'workflow_created'
  | 'workflow_saved'
  | 'workflow_loaded'
  | 'node_added'
  | 'node_deleted'
  | 'run_started'
  | 'run_completed'
  | 'run_failed'
  | 'run_cancelled'
  | 'qc_resumed'
  | 'breakpoint_hit'
  | 'test_run_completed';

/** The closed enum of property keys. Same rationale as the names. */
export interface TelemetryProps {
  /** Node kind for node_added / node_deleted events. */
  node_kind?: NodeKind;
  /** Total node count after the event. */
  node_count?: number;
  /** Total edge count after the event. */
  edge_count?: number;
  /** Run duration in ms, for run_completed / run_failed / run_cancelled. */
  duration_ms?: number;
  /** Number of nodes that ran (any non-idle terminal status) during a run. */
  nodes_ran?: number;
  /** For qc_resumed — mirrors the QcDecisionKind enum. */
  qc_decision?: 'approved' | 'edited' | 'rejected';
  /** For breakpoint_hit — how the user resumed. */
  resume_mode?: 'step' | 'continue';
  /** For test_run_completed — pass/fail tallies. */
  passed?: number;
  failed?: number;
}

export interface TelemetryEvent {
  /** Wall-clock ms when the event was recorded. */
  ts: number;
  name: TelemetryEventName;
  /** Schema-safe props only — see TelemetryProps. */
  props: TelemetryProps;
}

/** The closed list of keys that may appear in a TelemetryEvent's props.
 *  Anything not in this set is dropped at record time. This is the last
 *  line of defense against an instrumentation site that accidentally
 *  spreads a user-typed object into props. */
const ALLOWED_PROP_KEYS = new Set<keyof TelemetryProps>([
  'node_kind',
  'node_count',
  'edge_count',
  'duration_ms',
  'nodes_ran',
  'qc_decision',
  'resume_mode',
  'passed',
  'failed',
]);

/** Filter props down to the allow-list. Defensive — instrumentation
 *  sites should already pass schema-safe values, but this catches
 *  drift before it hits the buffer. */
export function scrubProps(props: TelemetryProps): TelemetryProps {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (!ALLOWED_PROP_KEYS.has(k as keyof TelemetryProps)) continue;
    if (v === undefined || v === null) continue;
    out[k] = v;
  }
  return out as TelemetryProps;
}

/** Public entry point. Imports the store lazily to avoid a cycle —
 *  the store imports from this module too. */
export function recordEvent(name: TelemetryEventName, props: TelemetryProps = {}): void {
  // Lazy import keeps this file free of a hard dependency on the store
  // module, which lets the store import scrubProps / types from here.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  import('../store/telemetryStore').then(({ useTelemetryStore }) => {
    useTelemetryStore.getState().record(name, props);
  }).catch(() => { /* silent — telemetry must never break the app */ });
}

/** Pretty-print the buffer for the Settings preview panel. */
export function previewBuffer(events: TelemetryEvent[]): string {
  return JSON.stringify(
    events.map((e) => ({
      ts: new Date(e.ts).toISOString(),
      name: e.name,
      ...e.props,
    })),
    null,
    2,
  );
}
