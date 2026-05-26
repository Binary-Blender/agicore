// Tests panel — third tab of the BottomDrawer. Lists every TEST block
// the parser found in the current .agi source. Run All at the top;
// per-test Run + collapse/expand row. Expanded rows show each EXPECT
// with a green/red dot and the source line.

import React, { useMemo, useState } from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { useTestStore } from '../store/testStore';
import { emitAgi } from '../lib/agi-emitter';
import { parseTestBlocks } from '../lib/agi-test-parser';
import { runAllTestBlocks, runTestBlock } from '../lib/test-runner';
import type { TestBlock, TestStatus } from '../types/test';

const TestsPanel: React.FC = () => {
  const workflow = useWorkflowStore((s) => s.workflow);
  const records = useTestStore((s) => s.records);
  const runningAny = useTestStore((s) => s.runningAny);
  const startTest = useTestStore((s) => s.startTest);
  const ingestAssert = useTestStore((s) => s.ingestAssert);
  const finishTest = useTestStore((s) => s.finishTest);
  const startBatch = useTestStore((s) => s.startBatch);
  const endBatch = useTestStore((s) => s.endBatch);

  const tests = useMemo<TestBlock[]>(
    () => parseTestBlocks(emitAgi(workflow)),
    [workflow],
  );

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExpand = (name: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  const onRunAll = async () => {
    if (tests.length === 0) return;
    startBatch();
    try {
      await runAllTestBlocks(tests, {
        onTestStart: startTest,
        onAssertResult: ingestAssert,
        onTestFinish: finishTest,
      });
    } finally {
      endBatch();
    }
  };

  const onRunOne = async (block: TestBlock) => {
    setExpanded((p) => new Set(p).add(block.name));
    startBatch();
    try {
      await runTestBlock(block, {
        onTestStart: startTest,
        onAssertResult: ingestAssert,
        onTestFinish: finishTest,
      });
    } finally {
      endBatch();
    }
  };

  if (tests.length === 0) {
    return (
      <div className="h-full flex items-center justify-center px-6">
        <p className="text-xs text-[var(--text-muted)] text-center leading-relaxed max-w-md">
          No TEST blocks in this workflow.
          Add a <code className="font-mono text-[var(--accent)]">TEST</code> declaration
          in the Source tab to author one — the parser picks it up on save.
        </p>
      </div>
    );
  }

  const summary = computeSummary(tests, records);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 px-3 py-1.5 border-b border-[var(--border)] flex-shrink-0">
        <button
          onClick={onRunAll}
          disabled={runningAny}
          className="text-[10px] uppercase tracking-widest px-2.5 py-1 rounded bg-[var(--accent)] text-black font-semibold hover:bg-[var(--accent-hot)] hover:text-white disabled:opacity-50 transition-colors"
        >
          {runningAny ? 'Running…' : `Run all (${tests.length})`}
        </button>
        <span className="text-[10px] font-mono text-[var(--text-muted)]">
          <span className="text-emerald-400">{summary.passed} passed</span>
          <span className="mx-1.5">·</span>
          <span className="text-red-400">{summary.failed} failed</span>
          <span className="mx-1.5">·</span>
          <span>{summary.idle} idle</span>
        </span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <ul>
          {tests.map((block) => (
            <TestRow
              key={block.name}
              block={block}
              status={records[block.name]?.status ?? 'idle'}
              record={records[block.name]}
              expanded={expanded.has(block.name)}
              onToggle={() => toggleExpand(block.name)}
              onRun={() => onRunOne(block)}
              disabled={runningAny}
            />
          ))}
        </ul>
      </div>
    </div>
  );
};

const TestRow: React.FC<{
  block: TestBlock;
  status: TestStatus;
  record: ReturnType<typeof useTestStore.getState>['records'][string] | undefined;
  expanded: boolean;
  onToggle: () => void;
  onRun: () => void;
  disabled: boolean;
}> = ({ block, status, record, expanded, onToggle, onRun, disabled }) => {
  const dotColor = STATUS_COLOR[status];
  const passCount = record?.results.filter((r) => r.passed).length ?? 0;
  const failCount = record?.results.filter((r) => !r.passed).length ?? 0;

  return (
    <li className="border-b border-[var(--border)]">
      <div className="flex items-center gap-3 px-3 py-1.5 hover:bg-[var(--bg-input)] transition-colors">
        <button
          onClick={onToggle}
          className="w-3 text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          {expanded ? '▾' : '▸'}
        </button>
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: dotColor }}
          title={status}
        />
        <span className="flex-1 text-xs font-mono truncate" title={block.name}>
          {block.name}
        </span>
        {record && (
          <span className="text-[9px] font-mono text-[var(--text-muted)]">
            {passCount}/{block.expects.length}
            {failCount > 0 && <span className="text-red-400 ml-1">({failCount} failed)</span>}
          </span>
        )}
        <button
          onClick={onRun}
          disabled={disabled}
          className="text-[10px] px-2 py-0.5 rounded border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-40 transition-colors"
        >
          Run
        </button>
      </div>
      {expanded && (
        <div className="bg-[var(--bg-canvas)] px-9 py-2 border-t border-[var(--border)]">
          {block.expects.length === 0 ? (
            <p className="text-[10px] text-[var(--text-muted)] italic">
              No assertions in this test.
            </p>
          ) : (
            <ul className="space-y-1">
              {block.expects.map((expect, i) => {
                const result = record?.results[i];
                const dot = result
                  ? result.passed ? '#10b981' : '#ef4444'
                  : '#52525b';
                return (
                  <li key={i} className="flex items-start gap-2 text-[11px] font-mono">
                    <span
                      className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                      style={{ backgroundColor: dot }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[var(--text-secondary)] truncate" title={expect.source}>
                        {expect.source}
                      </p>
                      {result?.detail && (
                        <p className="text-[10px] text-[var(--text-muted)] italic mt-0.5">
                          {result.detail}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </li>
  );
};

const STATUS_COLOR: Record<TestStatus, string> = {
  idle:    '#52525b',
  running: '#fbbf24',
  passed:  '#10b981',
  failed:  '#ef4444',
  error:   '#f97316',
};

function computeSummary(tests: TestBlock[], records: Record<string, ReturnType<typeof useTestStore.getState>['records'][string]>) {
  let passed = 0;
  let failed = 0;
  let idle = 0;
  for (const t of tests) {
    const status = records[t.name]?.status ?? 'idle';
    if (status === 'passed') passed += 1;
    else if (status === 'failed' || status === 'error') failed += 1;
    else idle += 1;
  }
  return { passed, failed, idle };
}

export default TestsPanel;
