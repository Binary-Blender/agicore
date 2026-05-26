// Run event log — scrollable view of every event the runner has emitted.
// Newest at the bottom so the cursor follows the action.

import React, { useEffect, useRef } from 'react';
import { useRunStore } from '../store/runStore';
import type { RunEvent } from '../types/run';

const RunEventLog: React.FC = () => {
  const log = useRunStore((s) => s.log);
  const status = useRunStore((s) => s.status);
  const startedAt = useRunStore((s) => s.startedAt);
  const finishedAt = useRunStore((s) => s.finishedAt);
  const errorMessage = useRunStore((s) => s.errorMessage);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [log.length]);

  if (!startedAt) {
    return (
      <div className="h-full flex items-center justify-center px-6">
        <p className="text-xs text-[var(--text-muted)] text-center leading-relaxed max-w-md">
          No runs yet. Build a workflow on the canvas, then press <span className="text-[var(--accent)] font-semibold">Run ▶</span>.
          Events arrive here as each node fires.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-4 px-3 py-1.5 border-b border-[var(--border)] text-[10px] font-mono">
        <StatusBadge status={status} />
        <span className="text-[var(--text-muted)]">
          {log.length} {log.length === 1 ? 'event' : 'events'}
        </span>
        <span className="text-[var(--text-muted)]">
          {formatElapsed(startedAt, finishedAt)}
        </span>
        {errorMessage && (
          <span className="text-red-400 truncate" title={errorMessage}>
            {errorMessage}
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 font-mono text-[11px] leading-relaxed">
        {log.map((event, i) => (
          <LogRow key={i} event={event} startedAt={startedAt} />
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
};

const LogRow: React.FC<{ event: RunEvent; startedAt: number }> = ({ event, startedAt }) => {
  const t = ((event.timestamp - startedAt) / 1000).toFixed(2);
  const { label, color, detail } = describeEvent(event);
  return (
    <div className="flex items-baseline gap-3 py-0.5">
      <span className="w-12 flex-shrink-0 text-right text-[var(--text-muted)]">+{t}s</span>
      <span className="w-28 flex-shrink-0 font-semibold" style={{ color }}>{label}</span>
      <span className="flex-1 text-[var(--text-secondary)] truncate" title={detail}>
        {detail}
      </span>
    </div>
  );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const variant = STATUS_VARIANTS[status] ?? { label: status, color: '#a1a1aa' };
  return (
    <span
      className="px-2 py-0.5 rounded uppercase tracking-widest font-semibold text-[9px]"
      style={{
        color: variant.color,
        borderColor: variant.color,
        borderWidth: 1,
        borderStyle: 'solid',
      }}
    >
      {variant.label}
    </span>
  );
};

const STATUS_VARIANTS: Record<string, { label: string; color: string }> = {
  idle:       { label: 'idle',       color: '#a1a1aa' },
  running:    { label: 'running',    color: '#fbbf24' },
  paused_qc:  { label: 'paused: qc', color: '#06b6d4' },
  succeeded:  { label: 'succeeded',  color: '#10b981' },
  failed:     { label: 'failed',     color: '#ef4444' },
  cancelled:  { label: 'cancelled',  color: '#a1a1aa' },
};

function describeEvent(e: RunEvent): { label: string; color: string; detail: string } {
  switch (e.kind) {
    case 'run_started':
      return { label: 'run.start', color: '#a78bfa', detail: `workflow: ${e.workflow_name}` };
    case 'node_started':
      return { label: 'node.start', color: '#fbbf24', detail: e.node_name };
    case 'node_succeeded':
      return { label: 'node.ok',    color: '#10b981', detail: `${e.node_name} → ${preview(e.output)}` };
    case 'node_failed':
      return { label: 'node.fail',  color: '#ef4444', detail: `${e.node_name}: ${e.error}` };
    case 'node_skipped':
      return { label: 'node.skip',  color: '#52525b', detail: `${e.node_name} (${e.reason})` };
    case 'qc_paused':
      return { label: 'qc.pause',   color: '#06b6d4', detail: `${e.node_name}: ${e.prompt}` };
    case 'breakpoint_paused':
      return {
        label: e.reason === 'step' ? 'debug.step' : 'debug.break',
        color: '#ef4444',
        detail: e.node_name,
      };
    case 'log':
      return {
        label: e.level === 'error' ? 'log.error' : e.level === 'warn' ? 'log.warn' : 'log',
        color: e.level === 'error' ? '#ef4444' : e.level === 'warn' ? '#fbbf24' : '#a1a1aa',
        detail: e.message,
      };
    case 'run_completed':
      return { label: 'run.ok',     color: '#10b981', detail: 'workflow complete' };
    case 'run_failed':
      return { label: 'run.fail',   color: '#ef4444', detail: e.error };
    case 'run_cancelled':
      return { label: 'run.cancel', color: '#a1a1aa', detail: 'cancelled by user' };
  }
}

function preview(value: unknown): string {
  if (value == null) return '∅';
  if (typeof value === 'string') return truncate(value, 80);
  try { return truncate(JSON.stringify(value), 80); }
  catch { return '[unrenderable]'; }
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

function formatElapsed(start: number, end: number | null): string {
  const ms = (end ?? Date.now()) - start;
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export default RunEventLog;
