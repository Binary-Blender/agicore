// Recovery banner — surfaces orphan autosave drafts on startup. The
// banner is the entire UX: a horizontal strip across the top of the
// app with per-draft Recover / Discard buttons. Clearing all drafts
// dismisses the banner.

import React, { useEffect, useState } from 'react';
import {
  dropRecoveryById,
  listRecoveryDrafts,
  type RecoveryDraft,
} from '../lib/recovery';
import { useWorkflowStore } from '../store/workflowStore';
import { useProjectStore } from '../store/projectStore';
import { parseAgiToWorkflow } from '../lib/agi-parser';

const RecoveryBanner: React.FC = () => {
  const [drafts, setDrafts] = useState<RecoveryDraft[] | null>(null);
  const resetTo = useWorkflowStore((s) => s.resetTo);
  const setLoadedMtime = useWorkflowStore((s) => s.setLoadedMtime);
  const adoptForFile = useProjectStore((s) => s.adoptForFile);

  useEffect(() => {
    void (async () => {
      const found = await listRecoveryDrafts();
      setDrafts(found);
    })();
  }, []);

  if (!drafts || drafts.length === 0) return null;

  const onRecover = async (draft: RecoveryDraft) => {
    const wf = parseAgiToWorkflow(draft.agiSource);
    if (draft.layoutJson) {
      try {
        const layout = JSON.parse(draft.layoutJson);
        const positions = layout.positions ?? {};
        for (const node of wf.nodes) {
          const p = positions[node.id];
          if (p) node.position = p;
        }
      } catch { /* ignore bad layout */ }
    }
    // Restored drafts arrive dirty — they haven't been written to the
    // origin file yet, just to the recovery store.
    resetTo(wf, draft.sourcePath ?? null, { dirty: true });
    setLoadedMtime(0);  // unknown baseline; next save establishes one
    if (draft.sourcePath) {
      void adoptForFile(draft.sourcePath);
    }
    await dropRecoveryById(draft.id);
    setDrafts((d) => (d ?? []).filter((x) => x.id !== draft.id));
  };

  const onDiscard = async (draft: RecoveryDraft) => {
    await dropRecoveryById(draft.id);
    setDrafts((d) => (d ?? []).filter((x) => x.id !== draft.id));
  };

  const onDiscardAll = async () => {
    if (!confirm(`Discard all ${drafts.length} recovery drafts? Cannot be undone.`)) {
      return;
    }
    for (const d of drafts) await dropRecoveryById(d.id);
    setDrafts([]);
  };

  return (
    <div className="bg-amber-950/60 border-b border-amber-800 text-amber-100">
      <div className="flex items-center gap-3 px-3 py-1.5">
        <span className="text-[10px] uppercase tracking-widest text-amber-300 font-semibold">
          Recovery
        </span>
        <span className="text-[11px] text-amber-100/80 leading-snug">
          {drafts.length === 1
            ? '1 unsaved workflow from a prior session was found.'
            : `${drafts.length} unsaved workflows from prior sessions were found.`}
        </span>
        <div className="flex-1" />
        <button
          onClick={onDiscardAll}
          className="text-[10px] text-amber-300/70 hover:text-amber-200 transition-colors"
        >
          discard all
        </button>
      </div>
      <ul className="px-3 pb-2 space-y-1">
        {drafts.map((draft) => (
          <li
            key={draft.id}
            className="flex items-center gap-3 px-2 py-1 rounded bg-amber-950/40"
          >
            <span className="text-[11px] font-mono truncate flex-1" title={draft.sourcePath ?? '(unsaved)'}>
              {draft.sourcePath
                ? basename(draft.sourcePath)
                : <em className="text-amber-200/70">unsaved workflow</em>}
            </span>
            <span className="text-[10px] text-amber-200/60 font-mono">
              {timeSince(draft.savedAt)}
            </span>
            <button
              onClick={() => onRecover(draft)}
              className="text-[10px] px-2 py-0.5 rounded bg-amber-700 hover:bg-amber-600 text-amber-50 font-semibold transition-colors"
            >
              Recover
            </button>
            <button
              onClick={() => onDiscard(draft)}
              className="text-[10px] px-2 py-0.5 rounded border border-amber-800 hover:bg-amber-950 text-amber-300 transition-colors"
            >
              Discard
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

function basename(p: string): string {
  const slash = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'));
  return slash === -1 ? p : p.slice(slash + 1);
}

function timeSince(unixSeconds: number): string {
  const delta = Math.max(0, Math.floor(Date.now() / 1000) - unixSeconds);
  if (delta < 60) return `${delta}s ago`;
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
  return `${Math.floor(delta / 86400)}d ago`;
}

export default RecoveryBanner;
