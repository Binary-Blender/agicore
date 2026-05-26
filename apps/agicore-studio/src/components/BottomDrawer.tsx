// Tabbed bottom drawer. Tabs: Source (live-emitted .agi, EDITABLE),
// Run (event log), Tests (TEST-block runner). Auto-switches to Run
// when a workflow run starts.
//
// Source is editable as of Alpha — typing in the .agi text re-parses
// after a 600 ms idle and updates the workflow store, which re-emits
// to the canvas. Cycle prevention: canvas edits bump docResetCounter
// to force the editor to reflect the new source, but only when the
// user isn't actively typing.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { useRunStore } from '../store/runStore';
import { useTestStore } from '../store/testStore';
import { emitAgi } from '../lib/agi-emitter';
import { tryParseAgi } from '../lib/agi-parser';
import { parseTestBlocks } from '../lib/agi-test-parser';
import AgiEditor from './AgiEditor';
import RunEventLog from './RunEventLog';
import TestsPanel from './TestsPanel';

type Tab = 'source' | 'run' | 'tests';

/** Live state of the text↔canvas sync loop. */
type SyncState =
  | { kind: 'synced' }
  | { kind: 'typing' }
  | { kind: 'parse_error'; errors: string[] };

const PARSE_DEBOUNCE_MS = 600;

const BottomDrawer: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('source');
  const workflow = useWorkflowStore((s) => s.workflow);
  const resetTo = useWorkflowStore((s) => s.resetTo);
  const filePath = useWorkflowStore((s) => s.filePath);
  const runStatus = useRunStore((s) => s.status);
  const eventCount = useRunStore((s) => s.log.length);
  const testRecords = useTestStore((s) => s.records);

  // Auto-open + switch to Run tab when a run starts
  useEffect(() => {
    if (runStatus === 'running' || runStatus === 'paused_qc' || runStatus === 'paused_breakpoint') {
      setTab('run');
      setOpen(true);
    }
  }, [runStatus]);

  const source = useMemo(() => emitAgi(workflow), [workflow]);
  const lineCount = source.split('\n').length;
  const testCount = useMemo(() => parseTestBlocks(source).length, [source]);
  const testSummary = useMemo(() => {
    let passed = 0;
    let failed = 0;
    for (const r of Object.values(testRecords)) {
      if (r.status === 'passed') passed += 1;
      else if (r.status === 'failed' || r.status === 'error') failed += 1;
    }
    return { passed, failed };
  }, [testRecords]);

  // ---- Text↔canvas sync state ----
  const [syncState, setSyncState] = useState<SyncState>({ kind: 'synced' });
  const [docResetCounter, setDocResetCounter] = useState(0);
  // True while a text→canvas update is in flight or just landed.
  // The next workflow effect that fires for that reason should NOT bump
  // the editor's doc — the editor already has what the user typed.
  const lastUpdateFromTextRef = useRef(false);
  const typingTimerRef = useRef<number | null>(null);

  // When the workflow changes from a canvas action, push the new source
  // into the editor. Skip when it changed because we just parsed text.
  // If a canvas edit lands while typing is pending, cancel the typing
  // timer — otherwise it would later parse stale text and clobber the
  // canvas edit on the rebound.
  useEffect(() => {
    if (lastUpdateFromTextRef.current) {
      lastUpdateFromTextRef.current = false;
      return;
    }
    if (typingTimerRef.current !== null) {
      window.clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
      setSyncState({ kind: 'synced' });
    }
    setDocResetCounter((c) => c + 1);
  }, [source]);

  const onEditorChange = (text: string) => {
    setSyncState({ kind: 'typing' });
    if (typingTimerRef.current !== null) {
      window.clearTimeout(typingTimerRef.current);
    }
    typingTimerRef.current = window.setTimeout(() => {
      typingTimerRef.current = null;
      const result = tryParseAgi(text);
      if (result.errors.length === 0 && result.workflow.nodes.length > 0) {
        lastUpdateFromTextRef.current = true;
        resetTo(result.workflow, filePath, { dirty: true });
        setSyncState({ kind: 'synced' });
      } else if (result.errors.length > 0) {
        setSyncState({ kind: 'parse_error', errors: result.errors });
      } else {
        // No errors but no nodes either — empty workflow body. Allow it
        // so users can clear the canvas by deleting the WORKFLOW body.
        lastUpdateFromTextRef.current = true;
        resetTo(result.workflow, filePath, { dirty: true });
        setSyncState({ kind: 'synced' });
      }
    }, PARSE_DEBOUNCE_MS);
  };

  useEffect(() => {
    return () => {
      if (typingTimerRef.current !== null) {
        window.clearTimeout(typingTimerRef.current);
      }
    };
  }, []);

  return (
    <div
      className={`flex flex-col border-t border-[var(--border)] bg-[var(--bg-panel)] transition-all duration-200 ${
        open ? 'h-72' : 'h-9'
      }`}
    >
      <div className="h-9 flex items-stretch flex-shrink-0">
        <button
          onClick={() => { setTab('source'); setOpen(true); }}
          className={`px-4 text-xs uppercase tracking-widest border-r border-[var(--border)] transition-colors flex items-center gap-2 ${
            tab === 'source' && open ? 'bg-[var(--bg-page)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-input)]'
          }`}
        >
          Source
          <SyncIndicator state={syncState} />
          <span className="text-[10px] text-[var(--text-muted)] font-mono normal-case tracking-normal">
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
          {(runStatus === 'running' || runStatus === 'paused_qc' || runStatus === 'paused_breakpoint') && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          )}
          {eventCount > 0 && (
            <span className="text-[10px] text-[var(--text-muted)] font-mono normal-case tracking-normal">
              {eventCount} events
            </span>
          )}
        </button>
        <button
          onClick={() => { setTab('tests'); setOpen(true); }}
          className={`px-4 text-xs uppercase tracking-widest border-r border-[var(--border)] transition-colors flex items-center gap-2 ${
            tab === 'tests' && open ? 'bg-[var(--bg-page)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-input)]'
          }`}
        >
          Tests
          {testCount > 0 && (
            <span className="text-[10px] text-[var(--text-muted)] font-mono normal-case tracking-normal">
              {testCount}
              {(testSummary.passed > 0 || testSummary.failed > 0) && (
                <>
                  {' · '}
                  <span className="text-emerald-400">{testSummary.passed}✓</span>
                  {testSummary.failed > 0 && (
                    <span className="text-red-400 ml-1">{testSummary.failed}✕</span>
                  )}
                </>
              )}
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
          {tab === 'source' && (
            <AgiEditor
              initialDoc={source}
              docResetCounter={docResetCounter}
              onChange={onEditorChange}
              readOnly={false}
            />
          )}
          {tab === 'run' && <RunEventLog />}
          {tab === 'tests' && <TestsPanel />}
        </div>
      )}
    </div>
  );
};

const SyncIndicator: React.FC<{ state: SyncState }> = ({ state }) => {
  switch (state.kind) {
    case 'synced':
      return (
        <span
          title="In sync with the canvas"
          className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"
        />
      );
    case 'typing':
      return (
        <span
          title="Typing — will parse when you pause"
          className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block animate-pulse"
        />
      );
    case 'parse_error':
      return (
        <span
          title={state.errors.join('\n')}
          className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"
        />
      );
  }
};

export default BottomDrawer;
