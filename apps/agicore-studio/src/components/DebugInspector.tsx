// DebugInspector — sidebar surface when a run is paused at a breakpoint
// (or arrived here via Step). Mirrors the QcInspector pattern: takes
// over the right rail, shows scope and controls without trapping the
// user in a modal.
//
// Scope = the outputs of every node that has already completed in
// this run, surfaced as a tree the user can inspect. That's "what
// variables are in scope" at this pause point.

import React from 'react';
import { useRunStore } from '../store/runStore';

const DebugInspector: React.FC = () => {
  const pending = useRunStore((s) => s.pendingBreakpoint);
  const nodes = useRunStore((s) => s.nodes);
  const resumeDebug = useRunStore((s) => s.resumeDebug);
  const cancel = useRunStore((s) => s.cancel);

  if (!pending) return null;

  // Scope: every node that succeeded before this pause.
  const completed = Object.values(nodes).filter(
    (n) => n.status === 'succeeded' && n.node_id !== pending.node_id,
  );

  return (
    <aside className="w-80 h-full bg-[var(--bg-panel)] border-l border-[var(--border)] flex flex-col overflow-hidden">
      <div className="px-3 py-2 border-b border-[var(--border)]"
           style={{ borderTop: '2px solid #ef4444' }}>
        <p className="text-[10px] uppercase tracking-widest font-semibold text-red-400">
          ⏸ Paused {pending.reason === 'step' ? 'after Step' : 'at breakpoint'}
        </p>
        <p className="text-sm font-semibold mt-1 font-mono">{pending.node_name}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <Section title="About to execute">
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-mono">
            {pending.node_name}
          </p>
          <p className="text-[10px] text-[var(--text-muted)] italic mt-1">
            Step runs this node then pauses before the next. Continue runs
            to the next breakpoint or end of workflow.
          </p>
        </Section>

        <Section title={`Scope (${completed.length} ${completed.length === 1 ? 'value' : 'values'})`}>
          {completed.length === 0 ? (
            <p className="text-[11px] text-[var(--text-muted)] italic">
              Nothing in scope yet — this is the first node.
            </p>
          ) : (
            <ul className="space-y-2">
              {completed.map((n) => (
                <li key={n.node_id} className="text-[11px]">
                  <p className="font-mono font-semibold text-[var(--text-primary)]">
                    {n.node_name}
                  </p>
                  <pre className="mt-0.5 bg-[var(--bg-input)] border border-[var(--border)] rounded p-1.5 text-[10px] font-mono whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                    {previewValue(n.output)}
                  </pre>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <div className="p-3 border-t border-[var(--border)] space-y-2">
        <button
          onClick={() => resumeDebug('step')}
          className="w-full py-2 rounded bg-amber-700 hover:bg-amber-600 text-white text-sm font-semibold transition-colors"
        >
          ⤼ Step
        </button>
        <button
          onClick={() => resumeDebug('continue')}
          className="w-full py-2 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors"
        >
          ▶ Continue
        </button>
        <button
          onClick={cancel}
          className="w-full py-2 rounded border border-[var(--border)] text-[var(--text-secondary)] hover:border-red-700 hover:text-red-300 text-sm transition-colors"
        >
          ◼ Stop run
        </button>
      </div>
    </aside>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1.5">
      {title}
    </p>
    {children}
  </div>
);

function previewValue(value: unknown): string {
  if (value == null) return '∅';
  if (typeof value === 'string') return value;
  try { return JSON.stringify(value, null, 2); }
  catch { return String(value); }
}

export default DebugInspector;
