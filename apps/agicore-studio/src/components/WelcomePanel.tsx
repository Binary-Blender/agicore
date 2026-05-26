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
//
// On second launch, a "Recent" list appears above the action grid so
// the user picks up where they left off in one click. Empty on first
// run (no entries), grows as projects are opened.

import React, { useEffect, useState } from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { useRunStore } from '../store/runStore';
import { useProjectStore } from '../store/projectStore';
import { openWorkflowFromDisk } from '../lib/persistence';
import { getTemplate } from '../lib/templates';
import {
  readRecentProjects,
  removeRecentProject,
  type RecentProject,
} from '../lib/recent-projects';

const WelcomePanel: React.FC = () => {
  const resetTo = useWorkflowStore((s) => s.resetTo);
  const setName = useWorkflowStore((s) => s.setWorkflowName);
  const resetRun = useRunStore((s) => s.reset);
  const pickAndOpenProject = useProjectStore((s) => s.pickAndOpen);
  const openProject = useProjectStore((s) => s.openProject);

  const [recents, setRecents] = useState<RecentProject[]>([]);

  useEffect(() => {
    void (async () => {
      try { setRecents(await readRecentProjects()); }
      catch { setRecents([]); }
    })();
  }, []);

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

  const onOpenRecent = async (rp: RecentProject) => {
    try { await openProject(rp.rootPath); }
    catch (e) { console.error('open recent failed:', e); }
  };

  const onRemoveRecent = async (rp: RecentProject, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const next = await removeRecentProject(rp.rootPath);
      setRecents(next);
    } catch (err) {
      console.error('remove recent failed:', err);
    }
  };

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
      <div className="pointer-events-auto w-full max-w-xl px-10 py-9 rounded-xl bg-[var(--bg-panel)] border border-[var(--border)] shadow-2xl">
        <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-2">
          Agicore Studio
        </p>
        <h1 className="text-2xl font-bold tracking-tight mb-2">
          Visual authoring for the Agicore DSL.
        </h1>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-7">
          Build a workflow on the canvas. The <code className="font-mono text-[var(--accent)]">.agi</code> source
          writes itself. Human QC checkpoints are first-class — runs pause for
          a human and resume when you decide.
        </p>

        {recents.length > 0 && (
          <div className="mb-6">
            <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-2">
              Recent
            </p>
            <ul className="space-y-0.5 max-h-40 overflow-y-auto">
              {recents.map((rp) => (
                <li key={rp.rootPath}>
                  <div
                    onClick={() => onOpenRecent(rp)}
                    className="group flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[var(--bg-input)] cursor-pointer transition-colors"
                  >
                    <span className="text-xs font-semibold text-[var(--text-primary)] truncate flex-shrink-0">
                      {rp.name}
                    </span>
                    <span
                      className="text-[10px] font-mono text-[var(--text-muted)] truncate flex-1"
                      title={rp.rootPath}
                    >
                      {rp.rootPath}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] font-mono">
                      {timeSince(rp.lastOpenedAt)}
                    </span>
                    <button
                      onClick={(e) => onRemoveRecent(rp, e)}
                      title="Remove from recent"
                      className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-red-400 transition-opacity text-[10px]"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

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

function timeSince(unixSeconds: number): string {
  const delta = Math.max(0, Math.floor(Date.now() / 1000) - unixSeconds);
  if (delta < 60) return 'just now';
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
  if (delta < 604800) return `${Math.floor(delta / 86400)}d ago`;
  return `${Math.floor(delta / 604800)}w ago`;
}

export default WelcomePanel;
