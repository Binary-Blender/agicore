// QC Inspector — sidebar-notify decision surface (per OQ-3, never a modal).
//
// Takes over the right rail when runStore.status === 'paused_qc'. The
// canvas remains pannable, the source drawer remains readable, the user
// can keep working while the decision sits. That sidebar-notify pattern
// is what lets a workflow with multiple QC checkpoints feel humane —
// the operator isn't trapped in modal jail.

import React, { useEffect, useMemo, useState } from 'react';
import { useRunStore } from '../store/runStore';
import type { QcDecisionKind } from '../types/run';

type Mode = 'idle' | 'editing';

const QcInspector: React.FC = () => {
  const pending = useRunStore((s) => s.pendingQc);
  const submit = useRunStore((s) => s.submitQcDecision);

  // pendingQc.node_id used as a key to reset state when the next QC fires
  const key = pending?.node_id ?? '';
  const upstreamText = useMemo(() => formatPayload(pending?.upstream_output), [key]);
  const [mode, setMode] = useState<Mode>('idle');
  const [edited, setEdited] = useState(upstreamText);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState<QcDecisionKind | null>(null);

  // Reset local state when a new QC fires
  useEffect(() => {
    setMode('idle');
    setEdited(upstreamText);
    setComment('');
    setSubmitting(null);
  }, [key, upstreamText]);

  if (!pending) return null;

  const onApprove = () => {
    setSubmitting('approved');
    submit({
      decision: 'approved',
      comment: comment.trim() || undefined,
    });
  };

  const onEditApprove = () => {
    setSubmitting('edited');
    let parsedEdited: unknown = edited;
    // If the upstream output was JSON-shaped, try to preserve that shape
    try {
      parsedEdited = JSON.parse(edited);
    } catch {
      parsedEdited = edited;
    }
    submit({
      decision: 'edited',
      edited_output: parsedEdited,
      comment: comment.trim() || undefined,
    });
  };

  const onReject = () => {
    setSubmitting('rejected');
    submit({
      decision: 'rejected',
      comment: comment.trim() || undefined,
    });
  };

  return (
    <aside className="w-80 h-full bg-[var(--bg-panel)] border-l border-[var(--border)] flex flex-col overflow-hidden">
      <div className="px-3 py-2 border-b border-[var(--border)]"
           style={{ borderTop: '2px solid var(--node-qc)' }}>
        <p className="text-[10px] uppercase tracking-widest font-semibold"
           style={{ color: 'var(--node-qc)' }}>
          ◐ Awaiting human review
        </p>
        <p className="text-sm font-semibold mt-1 font-mono">{pending.node_name}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <Section title="Reviewer prompt">
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
            {pending.prompt}
          </p>
        </Section>

        <Section title="Upstream output">
          {mode === 'idle' ? (
            <pre className="bg-[var(--bg-input)] border border-[var(--border)] rounded p-2 text-[11px] font-mono whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
              {upstreamText}
            </pre>
          ) : (
            <>
              <textarea
                value={edited}
                onChange={(e) => setEdited(e.target.value)}
                rows={12}
                spellCheck={false}
                className="w-full bg-[var(--bg-input)] border border-[var(--accent)] rounded p-2 text-[11px] font-mono resize-none focus:outline-none"
              />
              <p className="text-[10px] text-[var(--text-muted)] mt-1 italic">
                Will be parsed as JSON if possible, otherwise kept as text.
              </p>
            </>
          )}
        </Section>

        <Section title="Comment (optional)">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            placeholder="Why this decision? Goes into the run log."
            className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded p-2 text-xs focus:outline-none focus:border-[var(--accent)] resize-none"
          />
        </Section>
      </div>

      <div className="p-3 border-t border-[var(--border)] space-y-2">
        {mode === 'idle' ? (
          <>
            <button
              onClick={onApprove}
              disabled={submitting !== null}
              className="w-full py-2 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
            >
              {submitting === 'approved' ? 'Approving…' : 'Approve'}
            </button>
            <button
              onClick={() => setMode('editing')}
              disabled={submitting !== null}
              className="w-full py-2 rounded border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--bg-input)] text-sm font-semibold disabled:opacity-50 transition-colors"
            >
              Edit before approving…
            </button>
            <button
              onClick={onReject}
              disabled={submitting !== null}
              className="w-full py-2 rounded border border-red-900 text-red-300 hover:bg-red-950 text-sm font-semibold disabled:opacity-50 transition-colors"
            >
              {submitting === 'rejected' ? 'Rejecting…' : 'Reject'}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onEditApprove}
              disabled={submitting !== null}
              className="w-full py-2 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
            >
              {submitting === 'edited' ? 'Submitting…' : 'Approve edited output'}
            </button>
            <button
              onClick={() => { setMode('idle'); setEdited(upstreamText); }}
              disabled={submitting !== null}
              className="w-full py-2 rounded border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-secondary)] text-sm transition-colors"
            >
              Cancel edit
            </button>
          </>
        )}
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

function formatPayload(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && 'text' in value && typeof (value as { text: unknown }).text === 'string') {
    return (value as { text: string }).text;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default QcInspector;
