// Welcome panel — centered overlay on an empty canvas.
//
// Shown when the workflow has zero nodes AND no file is open. Dismisses
// the moment the user picks any action — including "Start blank", which
// just dismisses (the palette is already there, the user knows what to do).
//
// First-five-minutes shape: a contributor `npm run tauri:dev`s, sees this,
// clicks "Load the canonical example", watches the canvas populate with
// the demo workflow, hits Run, sees the QC pause, decides, done. Sub-30s
// to "I get it."

import React from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { useRunStore } from '../store/runStore';
import { useProjectStore } from '../store/projectStore';
import { openWorkflowFromDisk } from '../lib/persistence';
import { getTemplate } from '../lib/templates';

const WelcomePanel: React.FC = () => {
  const resetTo = useWorkflowStore((s) => s.resetTo);
  const setName = useWorkflowStore((s) => s.setWorkflowName);
  const resetRun = useRunStore((s) => s.reset);
  const pickAndOpenProject = useProjectStore((s) => s.pickAndOpen);

  const startBlank = () => {
    setName('untitled_workflow');
    resetRun();
  };

  const loadCanonical = () => {
    const t = getTemplate('canonical');
    if (!t) return;
    resetTo(t.build());
    resetRun();
  };

  const onOpen = async () => {
    try { await openWorkflowFromDisk(); }
    catch (e) { console.error('open failed:', e); }
  };

  const onOpenProject = async () => {
    try { await pickAndOpenProject(); }
    catch (e) { console.error('open project failed:', e); }
  };

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
      <div className="pointer-events-auto w-full max-w-xl px-10 py-9 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)] shadow-2xl">
        <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-2">
          Agicore Studio · MVP
        </p>
        <h1 className="text-2xl font-bold tracking-tight mb-2">
          Visual authoring for the Agicore DSL.
        </h1>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-7">
          Build a workflow on the canvas. The <code className="font-mono text-[var(--accent)]">.agi</code> source
          writes itself. Human QC checkpoints are first-class — runs pause for
          a human and resume when you decide.
        </p>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <Action
            label="Open project folder…"
            hint="Pick a directory of .agi files."
            onClick={onOpenProject}
            variant="ghost"
          />
          <Action
            label="Open file…"
            hint="Load a single .agi from disk."
            onClick={onOpen}
            variant="ghost"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 mb-6">
          <Action
            label="Start blank"
            hint="Empty canvas. Drag from the palette."
            onClick={startBlank}
            variant="ghost"
          />
          <Action
            label="Canonical example"
            hint="The five-node demo. Includes a QC pause."
            onClick={loadCanonical}
            variant="primary"
          />
        </div>

        <p className="text-[10px] text-[var(--text-muted)] italic">
          Or drag a node from the palette to begin.
        </p>
      </div>
    </div>
  );
};

const Action: React.FC<{
  label: string;
  hint: string;
  onClick: () => void;
  variant: 'primary' | 'ghost';
}> = ({ label, hint, onClick, variant }) => (
  <button
    onClick={onClick}
    className={
      variant === 'primary'
        ? 'flex flex-col items-start gap-1 p-3 rounded-md border border-[var(--accent)] bg-[var(--accent)] text-black hover:bg-[var(--accent-hot)] hover:text-white transition-colors text-left'
        : 'flex flex-col items-start gap-1 p-3 rounded-md border border-[var(--border)] hover:border-[var(--text-secondary)] transition-colors text-left'
    }
  >
    <span className={`text-sm font-semibold ${variant === 'primary' ? '' : 'text-[var(--text-primary)]'}`}>
      {label}
    </span>
    <span className={`text-[10px] leading-snug ${variant === 'primary' ? 'opacity-80' : 'text-[var(--text-muted)]'}`}>
      {hint}
    </span>
  </button>
);

export default WelcomePanel;
