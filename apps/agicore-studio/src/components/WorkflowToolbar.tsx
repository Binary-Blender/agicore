// Workflow toolbar — top strip above the canvas. Hosts the workflow-name
// input, save/open buttons, and the live Run / Cancel control.

import React, { useEffect, useState } from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { useProjectStore } from '../store/projectStore';
import { useRunStore } from '../store/runStore';
import {
  saveCurrentWorkflow,
  openWorkflowFromDisk,
  reloadActiveWorkflow,
} from '../lib/persistence';
import { makeRunner } from '../lib/runner';

const WorkflowToolbar: React.FC = () => {
  const name = useWorkflowStore((s) => s.workflow.name);
  const workflow = useWorkflowStore((s) => s.workflow);
  const setName = useWorkflowStore((s) => s.setWorkflowName);
  const dirty = useWorkflowStore((s) => s.dirty);
  const filePath = useWorkflowStore((s) => s.filePath);
  const loadedMtime = useWorkflowStore((s) => s.loadedMtime);

  // External-modification check: compare loaded mtime against the
  // polled mtime in the project store. >loadedMtime means the file
  // was touched outside the Studio since we read it.
  const projectFile = useProjectStore((s) =>
    filePath ? s.files.find((f) => f.path === filePath) : undefined,
  );
  const externallyModified =
    !!projectFile && loadedMtime > 0 && projectFile.modifiedAt > loadedMtime;

  const runStatus = useRunStore((s) => s.status);
  const startedAt = useRunStore((s) => s.startedAt);
  const finishedAt = useRunStore((s) => s.finishedAt);
  const startRun = useRunStore((s) => s.startRun);
  const ingest = useRunStore((s) => s.ingest);
  const cancel = useRunStore((s) => s.cancel);

  const [busy, setBusy] = useState<'saving' | 'opening' | null>(null);
  const [elapsed, setElapsed] = useState<string>('');

  // Live elapsed-time tick while a run is in flight
  useEffect(() => {
    if (runStatus !== 'running' && runStatus !== 'paused_qc') {
      if (startedAt && finishedAt) {
        setElapsed(formatElapsed(finishedAt - startedAt));
      } else {
        setElapsed('');
      }
      return;
    }
    if (!startedAt) return;
    const i = setInterval(() => {
      setElapsed(formatElapsed(Date.now() - startedAt));
    }, 100);
    return () => clearInterval(i);
  }, [runStatus, startedAt, finishedAt]);

  const onSave = async () => {
    setBusy('saving');
    try { await saveCurrentWorkflow(); }
    catch (e) { console.error('save failed:', e); }
    finally { setBusy(null); }
  };
  const onOpen = async () => {
    setBusy('opening');
    try { await openWorkflowFromDisk(); }
    catch (e) { console.error('open failed:', e); }
    finally { setBusy(null); }
  };

  const onReload = async () => {
    if (dirty) {
      const ok = confirm(
        'Reload from disk?\n\n' +
        'This will discard your unsaved canvas edits and replace them with ' +
        'whatever is currently in the file on disk.',
      );
      if (!ok) return;
    }
    try { await reloadActiveWorkflow(); }
    catch (e) { console.error('reload failed:', e); }
  };

  const canRun =
    workflow.nodes.length > 0 &&
    runStatus !== 'running' &&
    runStatus !== 'paused_qc';

  const onRun = () => {
    const runner = makeRunner();
    startRun(runner);
    runner.start(workflow, (event) => ingest(event));
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-panel)] border-b border-[var(--border)]">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="flex-1 max-w-md bg-[var(--bg-input)] border border-[var(--border)] rounded px-3 py-1.5 text-sm font-mono focus:outline-none focus:border-[var(--accent)]"
        placeholder="workflow_name"
      />
      <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)] font-mono">
        {filePath ? <span title={filePath}>📄 {basename(filePath)}</span> : <span>● unsaved</span>}
        {dirty && <span className="text-[var(--node-branch)]">● modified</span>}
        {externallyModified && (
          <button
            onClick={onReload}
            className="px-1.5 py-0.5 rounded text-[9px] uppercase tracking-widest text-cyan-300 border border-cyan-700 hover:bg-cyan-950 transition-colors animate-pulse"
            title="The file changed on disk since you loaded it. Click to reload."
          >
            ↻ disk newer · reload
          </button>
        )}
        {elapsed && <RunStatusPill status={runStatus} elapsed={elapsed} />}
      </div>
      <div className="flex-1" />
      <button
        onClick={onOpen}
        disabled={busy !== null}
        className="text-xs px-3 py-1.5 rounded border border-[var(--border)] hover:border-[var(--text-secondary)] disabled:opacity-50 transition-colors"
      >
        {busy === 'opening' ? 'Opening…' : 'Open'}
      </button>
      <button
        onClick={onSave}
        disabled={busy !== null}
        className="text-xs px-3 py-1.5 rounded border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--bg-input)] disabled:opacity-50 transition-colors"
      >
        {busy === 'saving' ? 'Saving…' : 'Save'}
      </button>
      {runStatus === 'running' || runStatus === 'paused_qc' ? (
        <button
          onClick={cancel}
          className="text-xs px-3 py-1.5 rounded bg-red-700 text-white font-semibold hover:bg-red-600 transition-colors"
        >
          ◼ Cancel
        </button>
      ) : (
        <button
          onClick={onRun}
          disabled={!canRun}
          title={canRun ? undefined : 'Add at least one node before running'}
          className="text-xs px-3 py-1.5 rounded bg-[var(--accent)] text-black font-semibold hover:bg-[var(--accent-hot)] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Run ▶
        </button>
      )}
    </div>
  );
};

const RunStatusPill: React.FC<{ status: string; elapsed: string }> = ({ status, elapsed }) => {
  const variant = STATUS_VARIANTS[status] ?? { label: status, color: '#a1a1aa' };
  // Per OQ-3 (no modal): a paused-QC state has to be visible from anywhere
  // on the screen. The pill animates so the user notices without being trapped.
  const isPaused = status === 'paused_qc';
  return (
    <span
      className={`px-1.5 py-0.5 rounded text-[9px] uppercase tracking-widest ${isPaused ? 'animate-pulse' : ''}`}
      style={{
        color: variant.color,
        borderColor: variant.color,
        borderWidth: 1,
        borderStyle: 'solid',
        backgroundColor: isPaused ? 'rgba(6, 182, 212, 0.12)' : undefined,
      }}
    >
      {variant.label} · {elapsed}
    </span>
  );
};

const STATUS_VARIANTS: Record<string, { label: string; color: string }> = {
  running:    { label: 'running',    color: '#fbbf24' },
  paused_qc:  { label: 'paused: qc', color: '#06b6d4' },
  succeeded:  { label: 'succeeded',  color: '#10b981' },
  failed:     { label: 'failed',     color: '#ef4444' },
  cancelled:  { label: 'cancelled',  color: '#a1a1aa' },
};

function basename(p: string): string {
  const slash = p.lastIndexOf('/');
  const back = p.lastIndexOf('\\');
  return p.slice(Math.max(slash, back) + 1);
}

function formatElapsed(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export default WorkflowToolbar;
