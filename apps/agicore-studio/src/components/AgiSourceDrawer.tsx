// Collapsible bottom drawer showing the live-generated .agi text.
//
// This is the visible proof of AD-1 (text is the source of truth). Every
// canvas edit produces clean .agi text. The user can open the drawer to
// see it; the act of opening should reinforce "this is real, this is what
// will be on disk."

import React, { useMemo, useState } from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { emitAgi } from '../lib/agi-emitter';
import AgiEditor from './AgiEditor';

const AgiSourceDrawer: React.FC = () => {
  const [open, setOpen] = useState(false);
  const workflow = useWorkflowStore((s) => s.workflow);

  const source = useMemo(() => emitAgi(workflow), [workflow]);
  const lineCount = source.split('\n').length;

  return (
    <div className={`flex flex-col border-t border-[var(--border)] bg-[var(--bg-panel)] transition-all duration-200 ${open ? 'h-72' : 'h-9'}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="h-9 flex items-center justify-between px-3 hover:bg-[var(--bg-input)] transition-colors flex-shrink-0"
      >
        <span className="flex items-center gap-3">
          <span className="text-xs uppercase tracking-widest text-[var(--text-secondary)]">
            Source
          </span>
          <span className="text-[10px] text-[var(--text-muted)] font-mono">
            {workflow.name}.agi · {lineCount} lines
          </span>
        </span>
        <span className="text-[10px] text-[var(--text-muted)]">
          {open ? '▾ collapse' : '▴ expand'}
        </span>
      </button>
      {open && (
        <div className="flex-1 min-h-0 overflow-hidden">
          {/* key forces CodeMirror to remount when source changes — simpler
              than reaching into the editor state for MVP. */}
          <AgiEditor key={source} initialDoc={source} readOnly />
        </div>
      )}
    </div>
  );
};

export default AgiSourceDrawer;
