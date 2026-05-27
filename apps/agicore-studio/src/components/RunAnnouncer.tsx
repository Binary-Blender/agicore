// Screen-reader announcer for run lifecycle events.
//
// Why this component exists: the canvas paints node status via
// colored borders and rings. Sighted users follow a workflow by
// watching that paint. Screen-reader users see none of it — without
// this component a running workflow is silent.
//
// What it announces: run starts and ends, per-node terminal status
// transitions (succeeded / failed / skipped), QC pauses, breakpoint
// pauses. Intentionally NOT every run event — node_started fires for
// every node and would be too chatty; the canvas paint is the
// "starting" signal for sighted users and "succeeded" is the
// equivalent confirmation for SR users.
//
// Implementation: subscribes to runStore.log, watches the new tail
// each render, formats messages, and writes them into an aria-live
// polite region. The region is visually hidden with the standard
// sr-only pattern (absolute position, 1px box, clip). Polite (not
// assertive) so messages don't interrupt the user's current speech.

import React, { useEffect, useRef, useState } from 'react';
import { useRunStore } from '../store/runStore';
import type { RunEvent } from '../types/run';

const MAX_RETAINED_MESSAGES = 50;

const RunAnnouncer: React.FC = () => {
  const log = useRunStore((s) => s.log);
  const lastSeenIndexRef = useRef(0);
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    // Pick up only events the announcer hasn't seen yet. A run reset
    // truncates the log; detect that as a length decrease and rewind
    // the seen-index so the next run's events all announce.
    if (log.length < lastSeenIndexRef.current) {
      lastSeenIndexRef.current = 0;
    }
    if (log.length === lastSeenIndexRef.current) return;

    const fresh = log.slice(lastSeenIndexRef.current);
    lastSeenIndexRef.current = log.length;

    const lines = fresh
      .map(messageFor)
      .filter((m): m is string => m !== null);

    if (lines.length === 0) return;

    setMessages((prev) => {
      const next = [...prev, ...lines];
      return next.length > MAX_RETAINED_MESSAGES
        ? next.slice(next.length - MAX_RETAINED_MESSAGES)
        : next;
    });
  }, [log]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="false"
      // sr-only — visually hidden but readable by screen readers.
      // The standard one-pixel-clip recipe; Tailwind's `sr-only`
      // utility expands to the same shape.
      className="sr-only"
      style={{
        position: 'absolute',
        width: 1,
        height: 1,
        padding: 0,
        margin: -1,
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0,
      }}
    >
      {messages.map((m, i) => (
        <p key={`${i}-${m}`}>{m}</p>
      ))}
    </div>
  );
};

/** Translate one run event into a screen-reader sentence, or null to skip. */
function messageFor(e: RunEvent): string | null {
  switch (e.kind) {
    case 'run_started':
      return `Workflow ${e.workflow_name} started.`;
    case 'node_succeeded':
      return `Node ${e.node_name} succeeded.`;
    case 'node_failed':
      return `Node ${e.node_name} failed: ${e.error}`;
    case 'node_skipped':
      return `Node ${e.node_name} skipped.`;
    case 'qc_paused':
      return `Paused for human review at node ${e.node_name}.`;
    case 'breakpoint_paused':
      return e.reason === 'step'
        ? `Stepped to node ${e.node_name}.`
        : `Stopped at breakpoint on node ${e.node_name}.`;
    case 'run_completed':
      return 'Workflow completed.';
    case 'run_failed':
      return `Workflow failed: ${e.error}`;
    case 'run_cancelled':
      return 'Workflow cancelled.';
    // node_started and log are intentionally not announced — see file header.
    case 'node_started':
    case 'log':
      return null;
  }
}

export default RunAnnouncer;
