// Diff preview modal — shows the unified-style line diff between the
// .agi text the emitter would write and whatever is on disk right
// now. New files (no on-disk version) render as a pure-add diff.
// Cancel just closes; Save commits.

import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useWorkflowStore } from '../store/workflowStore';
import { emitAgi } from '../lib/agi-emitter';
import { countChanges, diffLines, type DiffOp } from '../lib/line-diff';
import { saveCurrentWorkflow } from '../lib/persistence';

interface Props {
  onClose: () => void;
}

const DiffPreviewModal: React.FC<Props> = ({ onClose }) => {
  const workflow = useWorkflowStore((s) => s.workflow);
  const filePath = useWorkflowStore((s) => s.filePath);
  const [ops, setOps] = useState<DiffOp[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const incoming = emitAgi(workflow);
      let existing = '';
      if (filePath) {
        try {
          const loaded = await invoke<{ agiSource: string }>(
            'load_workflow_from_disk',
            { path: filePath },
          );
          existing = loaded.agiSource;
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e));
        }
      }
      setOps(diffLines(existing, incoming));
    })();
  }, [workflow, filePath]);

  const onSave = async () => {
    setSaving(true);
    try {
      await saveCurrentWorkflow();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  };

  const isNewFile = !filePath;
  const changes = ops ? countChanges(ops) : { added: 0, removed: 0 };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl h-[80vh] flex flex-col bg-[var(--bg-panel)] border border-[var(--border)] rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
              Preview save
            </p>
            <h2 className="text-sm font-semibold mt-0.5 font-mono">
              {filePath ? basename(filePath) : `${workflow.name}.agi (new file)`}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono">
              <span className="text-emerald-400">+{changes.added}</span>
              <span className="text-[var(--text-muted)] mx-1">·</span>
              <span className="text-red-400">−{changes.removed}</span>
            </span>
            <button
              onClick={onClose}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto bg-[var(--bg-canvas)] font-mono text-[11px] leading-relaxed">
          {ops === null ? (
            <p className="px-5 py-4 text-[var(--text-muted)]">Computing diff…</p>
          ) : ops.length === 0 ? (
            <p className="px-5 py-4 text-[var(--text-muted)]">
              No content. Add some nodes first.
            </p>
          ) : isCleanEqual(ops) ? (
            <p className="px-5 py-4 text-[var(--text-muted)]">
              No changes. The on-disk version matches the canvas.
            </p>
          ) : (
            <DiffBody ops={ops} isNewFile={isNewFile} />
          )}
        </div>

        {error && (
          <p className="px-5 py-2 text-[11px] text-red-400 font-mono border-t border-[var(--border)]">
            {error}
          </p>
        )}

        <div className="px-5 py-3 border-t border-[var(--border)] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="text-xs px-3 py-1.5 rounded border border-[var(--border)] hover:border-[var(--text-secondary)] disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving || (ops !== null && isCleanEqual(ops))}
            className="text-xs px-3 py-1.5 rounded bg-[var(--accent)] text-black font-semibold hover:bg-[var(--accent-hot)] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

const DiffBody: React.FC<{ ops: DiffOp[]; isNewFile: boolean }> = ({ ops, isNewFile }) => {
  return (
    <>
      {isNewFile && (
        <p className="px-5 py-2 text-[10px] text-amber-300 border-b border-[var(--border)]">
          This file doesn't exist on disk yet — every line is new.
        </p>
      )}
      <table className="w-full">
        <tbody>
          {ops.map((op, i) => {
            const sign =
              op.kind === 'add'    ? '+' :
              op.kind === 'remove' ? '−' : ' ';
            const lineNo =
              op.kind === 'add'    ? (op as Extract<DiffOp, { kind: 'add' }>).bIndex + 1 :
              op.kind === 'remove' ? (op as Extract<DiffOp, { kind: 'remove' }>).aIndex + 1 :
                                     (op as Extract<DiffOp, { kind: 'equal' }>).bIndex + 1;
            const rowClass =
              op.kind === 'add'    ? 'bg-emerald-950/40 text-emerald-200' :
              op.kind === 'remove' ? 'bg-red-950/40 text-red-200' :
                                     'text-[var(--text-secondary)]';
            return (
              <tr key={i} className={rowClass}>
                <td className="px-3 py-0.5 text-right text-[var(--text-muted)] select-none w-12">
                  {lineNo}
                </td>
                <td className="px-1 py-0.5 text-center select-none w-6">{sign}</td>
                <td className="py-0.5 pr-3 whitespace-pre-wrap break-all">{op.line}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
};

function isCleanEqual(ops: DiffOp[]): boolean {
  return ops.every((op) => op.kind === 'equal');
}

function basename(p: string): string {
  const slash = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'));
  return slash === -1 ? p : p.slice(slash + 1);
}

export default DiffPreviewModal;
