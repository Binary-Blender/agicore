// Tabbed bottom drawer. Tabs: Source (live-emitted .agi) and Run (event log).
// Auto-switches to Run when a run starts so the user sees activity.

import React, { useEffect, useMemo, useState } from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { useRunStore } from '../store/runStore';
import { emitAgi } from '../lib/agi-emitter';
import AgiEditor from './AgiEditor';
import RunEventLog from './RunEventLog';

type Tab = 'source' | 'run';

const BottomDrawer: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('source');
  const workflow = useWorkflowStore((s) => s.workflow);
  const runStatus = useRunStore((s) => s.status);
  const eventCount = useRunStore((s) => s.log.length);

  // Auto-open + switch to Run tab when a run starts
  useEffect(() => {
    if (runStatus === 'running' || runStatus === 'paused_qc') {
      setTab('run');
      setOpen(true);
    }
  }, [runStatus]);

  const source = useMemo(() => emitAgi(workflow), [workflow]);
  const lineCount = source.split('\n').length;

  return (
    <div
      className={`flex flex-col border-t border-[var(--border)] bg-[var(--bg-panel)] transition-all duration-200 ${
        open ? 'h-72' : 'h-9'
      }`}
    >
      <div className="h-9 flex items-stretch flex-shrink-0">
        <button
          onClick={() => { setTab('source'); setOpen(true); }}
          className={`px-4 text-xs uppercase tracking-widest border-r border-[var(--border)] transition-colors ${
            tab === 'source' && open ? 'bg-[var(--bg-page)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-input)]'
          }`}
        >
          Source
          <span className="ml-2 text-[10px] text-[var(--text-muted)] font-mono normal-case tracking-normal">
            {workflow.name}.agi · {lineCount}L
          </span>
        </button>
        <button
          onClick={() => { setTab('run'); setOpen(true); }}
          className={`px-4 text-xs uppercase tracking-widest border-r border-[var(--border)] transition-colors flex items-center gap-2 ${
            tab === 'run' && open ? 'bg-[var(--bg-page)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-input)]'
          }`}
        >
          Run
          {(runStatus === 'running' || runStatus === 'paused_qc') && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          )}
          {eventCount > 0 && (
            <span className="text-[10px] text-[var(--text-muted)] font-mono normal-case tracking-normal">
              {eventCount} events
            </span>
          )}
        </button>
        <div className="flex-1" data-tauri-drag-region />
        <button
          onClick={() => setOpen((o) => !o)}
          className="px-4 text-[10px] text-[var(--text-muted)] hover:bg-[var(--bg-input)] transition-colors"
        >
          {open ? '▾ collapse' : '▴ expand'}
        </button>
      </div>
      {open && (
        <div className="flex-1 min-h-0 overflow-hidden">
          {tab === 'source' ? (
            // key forces CodeMirror to re-mount when source changes — simpler
            // than reaching into the editor state for MVP.
            <AgiEditor key={source} initialDoc={source} readOnly />
          ) : (
            <RunEventLog />
          )}
        </div>
      )}
    </div>
  );
};

export default BottomDrawer;
