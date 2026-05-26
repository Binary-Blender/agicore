// Workflow toolbar — top strip above the canvas.
// Hosts the workflow-name input, save/open buttons, and the Run button
// (Run is wired in a later MVP ticket; for now it's an explicit stub).

import React, { useState } from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { saveCurrentWorkflow, openWorkflowFromDisk } from '../lib/persistence';

const WorkflowToolbar: React.FC = () => {
  const name = useWorkflowStore((s) => s.workflow.name);
  const setName = useWorkflowStore((s) => s.setWorkflowName);
  const dirty = useWorkflowStore((s) => s.dirty);
  const filePath = useWorkflowStore((s) => s.filePath);
  const [busy, setBusy] = useState<'saving' | 'opening' | null>(null);

  const onSave = async () => {
    setBusy('saving');
    try {
      await saveCurrentWorkflow();
    } catch (e) {
      console.error('save failed:', e);
    } finally {
      setBusy(null);
    }
  };

  const onOpen = async () => {
    setBusy('opening');
    try {
      await openWorkflowFromDisk();
    } catch (e) {
      console.error('open failed:', e);
    } finally {
      setBusy(null);
    }
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
      <button
        disabled
        title="Run is wired in the next MVP ticket"
        className="text-xs px-3 py-1.5 rounded bg-[var(--accent)] text-black font-semibold opacity-40 cursor-not-allowed"
      >
        Run ▶
      </button>
    </div>
  );
};

function basename(p: string): string {
  const slash = p.lastIndexOf('/');
  const back = p.lastIndexOf('\\');
  return p.slice(Math.max(slash, back) + 1);
}

export default WorkflowToolbar;
