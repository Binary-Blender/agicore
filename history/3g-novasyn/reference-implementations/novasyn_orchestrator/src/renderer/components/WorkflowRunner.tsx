import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { WorkflowRun, StepResult, Workflow, ModuleConfig, ModuleType } from '../../shared/types';

interface Props {
  runId: string;
  workflowName: string;
  onClose: () => void;
}

// ---------- Module type display metadata ----------

const MODULE_TYPE_LABELS: Record<string, string> = {
  ai_action: 'AI Action',
  cross_app_action: 'Cross-App',
  qc_checkpoint: 'QC Check',
  transform: 'Transform',
  vault_save: 'Vault Save',
  vault_load: 'Vault Load',
};

const MODULE_TYPE_COLORS: Record<string, string> = {
  ai_action: 'bg-blue-600/30 text-blue-300 border-blue-500/50',
  cross_app_action: 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50',
  qc_checkpoint: 'bg-yellow-600/30 text-yellow-300 border-yellow-500/50',
  transform: 'bg-purple-600/30 text-purple-300 border-purple-500/50',
  vault_save: 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50',
  vault_load: 'bg-cyan-600/30 text-cyan-300 border-cyan-500/50',
};

const RUN_STATUS_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-gray-600', text: 'text-gray-200', label: 'Pending' },
  running: { bg: 'bg-blue-600', text: 'text-blue-100', label: 'Running' },
  paused_for_qc: { bg: 'bg-yellow-600', text: 'text-yellow-100', label: 'Paused for QC' },
  completed: { bg: 'bg-green-600', text: 'text-green-100', label: 'Completed' },
  failed: { bg: 'bg-red-600', text: 'text-red-100', label: 'Failed' },
};

function formatElapsed(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining}s`;
}

function formatLatency(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function truncateOutput(output: any): string {
  if (output == null) return '';
  const text = typeof output === 'string' ? output : JSON.stringify(output);
  if (text.length <= 200) return text;
  return text.slice(0, 200) + '...';
}

// ---------- Timer components ----------

function ElapsedTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const update = () => setElapsed(Date.now() - start);
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return <span className="text-blue-300 text-xs font-mono">{formatElapsed(elapsed)}</span>;
}

function TotalElapsedTimer({ startedAt, completedAt }: { startedAt: string; completedAt?: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(startedAt).getTime();
    if (completedAt) {
      setElapsed(new Date(completedAt).getTime() - start);
      return;
    }
    const update = () => setElapsed(Date.now() - start);
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startedAt, completedAt]);

  return <span className="font-mono">{formatElapsed(elapsed)}</span>;
}

// ---------- Status indicator ----------

function StatusIndicator({ status }: { status: string }) {
  switch (status) {
    case 'pending':
      return <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-500 flex-shrink-0" />;
    case 'running':
      return <div className="w-3.5 h-3.5 rounded-full bg-blue-500 flex-shrink-0 animate-pulse" />;
    case 'completed':
      return (
        <svg className="w-3.5 h-3.5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    case 'failed':
      return (
        <svg className="w-3.5 h-3.5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    case 'awaiting_qc':
      return (
        <svg className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    default:
      return <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-600 flex-shrink-0" />;
  }
}

// ---------- Module card status classes ----------

function getModuleCardClass(status: string): string {
  let cls = 'rounded-lg border p-2.5 transition-all min-w-[160px] max-w-[220px] flex-shrink-0 ';
  switch (status) {
    case 'pending':
      cls += 'bg-slate-700 border-slate-600 opacity-60';
      break;
    case 'running':
      cls += 'bg-blue-900/30 border-blue-500 wf-pulse';
      break;
    case 'completed':
      cls += 'bg-green-900/20 border-green-600';
      break;
    case 'failed':
      cls += 'bg-red-900/20 border-red-500';
      break;
    case 'awaiting_qc':
      cls += 'bg-yellow-900/20 border-yellow-500';
      break;
    default:
      cls += 'bg-slate-700 border-slate-600';
  }
  return cls;
}

// ---------- Component ----------

export function WorkflowRunner({ runId, workflowName, onClose }: Props) {
  const [run, setRun] = useState<WorkflowRun | null>(null);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Load workflow details
  const loadWorkflow = useCallback(async (workflowId: string) => {
    try {
      const wf = await window.electronAPI.workflowGet(workflowId);
      if (wf) setWorkflow(wf);
    } catch (err) {
      console.error('Failed to load workflow:', err);
    }
  }, []);

  // Fetch run data
  const fetchRun = useCallback(async () => {
    try {
      const data = await window.electronAPI.workflowGetRun(runId);
      if (data) {
        setRun(data);
        if (!workflow) {
          loadWorkflow(data.workflowId);
        }
      }
      setError(null);
    } catch (err) {
      console.error('Failed to fetch workflow run:', err);
      setError('Failed to load run data');
    }
    setLoading(false);
  }, [runId, workflow, loadWorkflow]);

  // Real-time listener + polling
  useEffect(() => {
    fetchRun();

    const unsubscribe = window.electronAPI.onWorkflowStepProgress((data) => {
      if (data.runId !== runId) return;
      setRun((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, stepResults: [...prev.stepResults] };
        const existing = updated.stepResults.find((r) => r.moduleId === data.moduleId);
        if (existing) {
          existing.status = data.status as StepResult['status'];
          if (data.output !== undefined) existing.output = data.output;
        }
        // Update run-level status
        if (data.status === 'awaiting_qc') {
          updated.status = 'paused_for_qc';
        } else if (data.status === 'running') {
          updated.status = 'running';
          updated.currentLevel = data.level;
        }
        return updated;
      });
    });
    cleanupRef.current = unsubscribe;

    pollRef.current = setInterval(fetchRun, 2000);

    return () => {
      if (cleanupRef.current) cleanupRef.current();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [runId, fetchRun]);

  // Stop polling on terminal state
  useEffect(() => {
    if (run && (run.status === 'completed' || run.status === 'failed')) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
  }, [run?.status]);

  // QC decision
  const handleQcDecision = async (decision: 'approved' | 'rejected') => {
    try {
      const updated = await window.electronAPI.workflowResume(runId, decision);
      setRun(updated);
    } catch (err) {
      console.error('Failed to submit QC decision:', err);
      setError('Failed to submit QC decision');
    }
  };

  // Derive data
  const rows = workflow?.rows || [];
  const stepResults: StepResult[] = run?.stepResults || [];
  const vaultItemsCreated = stepResults.filter((r) => r.vaultItemId).length;
  const levelsCompleted = new Set(
    stepResults.filter((r) => r.status === 'completed').map((r) => r.level)
  ).size;
  const totalLevels = rows.length || new Set(stepResults.map((r) => r.level)).size;

  // Find result for a module
  const getModuleResult = (moduleId: string): StepResult | undefined =>
    stepResults.find((r) => r.moduleId === moduleId);

  // Find previous level output for QC display
  const getPreviousLevelOutput = (currentLevel: number): string => {
    if (currentLevel <= 0) return '(no previous level output)';
    const prevResults = stepResults.filter((r) => r.level === currentLevel - 1 && r.status === 'completed');
    if (prevResults.length === 0) return '(no output from previous level)';
    const outputs = prevResults.map((r) =>
      typeof r.output === 'string' ? r.output : JSON.stringify(r.output, null, 2)
    );
    return outputs.join('\n---\n');
  };

  const statusBadge = run
    ? RUN_STATUS_BADGES[run.status] || RUN_STATUS_BADGES.pending
    : RUN_STATUS_BADGES.pending;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-slate-800 border border-slate-600 rounded-xl w-[850px] h-[650px] shadow-2xl flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-600">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-lg font-semibold text-white truncate">{workflowName}</h2>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusBadge.bg} ${statusBadge.text}`}>
              {statusBadge.label}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl flex-shrink-0 ml-3"
          >
            &times;
          </button>
        </div>

        {/* Center -- Row-based execution view */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              Loading run data...
            </div>
          ) : error && !run ? (
            <div className="flex items-center justify-center h-full text-red-400 text-sm">
              {error}
            </div>
          ) : rows.length === 0 && stepResults.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">
              Waiting for execution...
            </div>
          ) : (
            // Render each row
            (rows.length > 0 ? rows : Array.from({ length: totalLevels }, (_, i) => ({
              id: `level-${i}`,
              level: i,
              modules: [] as ModuleConfig[],
            }))).map((row, rowIdx) => {
              // Determine overall row status
              const rowModuleResults = row.modules.length > 0
                ? row.modules.map((m) => getModuleResult(m.id))
                : stepResults.filter((r) => r.level === rowIdx);
              const rowStatuses = rowModuleResults.map((r) => r?.status || 'pending');
              const rowHasQC = rowStatuses.includes('awaiting_qc');
              const rowAllComplete = rowStatuses.length > 0 && rowStatuses.every((s) => s === 'completed');
              const rowHasRunning = rowStatuses.includes('running');
              const rowHasFailed = rowStatuses.includes('failed');

              let rowBorderClass = 'border-slate-600';
              if (rowHasQC) rowBorderClass = 'border-yellow-500/50';
              else if (rowHasRunning) rowBorderClass = 'border-blue-500/50';
              else if (rowAllComplete) rowBorderClass = 'border-green-600/50';
              else if (rowHasFailed) rowBorderClass = 'border-red-500/50';

              return (
                <div key={row.id} className={`rounded-lg border ${rowBorderClass} bg-slate-800/50`}>
                  {/* Row header */}
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-700/50">
                    <span className="text-xs font-semibold text-purple-400">
                      Level {rowIdx + 1}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {row.modules.length || rowModuleResults.length} module{(row.modules.length || rowModuleResults.length) !== 1 ? 's' : ''}
                    </span>
                    {rowHasRunning && (
                      <span className="text-[10px] text-blue-300 ml-auto">Running...</span>
                    )}
                    {rowAllComplete && (
                      <span className="text-[10px] text-green-400 ml-auto">Complete</span>
                    )}
                  </div>

                  {/* Module cards -- horizontal */}
                  <div className="flex flex-wrap gap-2 p-3">
                    {(row.modules.length > 0 ? row.modules : rowModuleResults.filter(Boolean).map((r) => ({
                      id: r!.moduleId,
                      type: 'ai_action' as ModuleType,
                      name: `Module ${r!.moduleId.slice(0, 6)}`,
                      config: {},
                    }))).map((mod) => {
                      const result = getModuleResult(mod.id);
                      const status = result?.status || 'pending';
                      const typeBadgeClass = MODULE_TYPE_COLORS[mod.type] || MODULE_TYPE_COLORS.ai_action;

                      return (
                        <div key={mod.id} className={getModuleCardClass(status)}>
                          {/* Module header */}
                          <div className="flex items-center gap-1.5 mb-1">
                            <StatusIndicator status={status} />
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${typeBadgeClass}`}>
                              {MODULE_TYPE_LABELS[mod.type] || mod.type}
                            </span>
                          </div>

                          {/* Module name */}
                          <div className={`text-xs font-medium mb-1 ${status === 'pending' ? 'text-gray-500' : 'text-white'}`}>
                            {mod.name}
                          </div>

                          {/* Cross-app indicator */}
                          {mod.type === 'cross_app_action' && mod.targetApp && (
                            <div className="text-[10px] text-indigo-400 mb-1">
                              {status === 'running' ? 'Invoking' : 'Target'}: {mod.targetApp}
                              {mod.macro && ` / ${mod.macro}`}
                            </div>
                          )}

                          {/* Status-specific content */}
                          {status === 'running' && result?.startedAt && (
                            <div className="flex items-center gap-1 mt-1">
                              <ElapsedTimer startedAt={result.startedAt} />
                            </div>
                          )}

                          {status === 'completed' && result?.output && (
                            <div className="mt-1.5 bg-slate-900/50 rounded px-2 py-1.5 text-[10px] text-gray-300 font-mono whitespace-pre-wrap break-words max-h-16 overflow-hidden">
                              {truncateOutput(result.output)}
                            </div>
                          )}

                          {status === 'completed' && result?.latencyMs != null && (
                            <div className="text-[10px] text-green-400 font-mono mt-1">
                              {formatLatency(result.latencyMs)}
                            </div>
                          )}

                          {status === 'failed' && (
                            <div className="mt-1.5 bg-red-900/30 rounded px-2 py-1.5 text-[10px] text-red-300">
                              {result?.error || 'Unknown error'}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* QC Checkpoint expanded view (shown when any module in this row is awaiting QC) */}
                  {rowHasQC && (
                    <div className="px-3 pb-3 space-y-3">
                      <div className="border-t border-yellow-500/30 pt-3">
                        {/* Find the QC module(s) */}
                        {row.modules
                          .filter((m) => {
                            const r = getModuleResult(m.id);
                            return r?.status === 'awaiting_qc';
                          })
                          .map((qcMod) => (
                            <div key={qcMod.id} className="space-y-2">
                              {qcMod.config.qcDescription && (
                                <div className="text-sm text-yellow-200">
                                  <span className="font-medium text-yellow-400">Review: </span>
                                  {qcMod.config.qcDescription}
                                </div>
                              )}
                            </div>
                          ))}

                        {/* Previous level output for review */}
                        <div className="bg-slate-900/60 rounded-lg p-3 mt-2">
                          <div className="text-xs font-medium text-gray-400 mb-1.5">Output from previous level:</div>
                          <div className="text-sm text-gray-200 whitespace-pre-wrap break-words max-h-48 overflow-y-auto font-mono">
                            {getPreviousLevelOutput(rowIdx)}
                          </div>
                        </div>

                        {/* Approve / Reject */}
                        <div className="flex items-center gap-3 mt-3">
                          <button
                            onClick={() => handleQcDecision('approved')}
                            className="flex items-center gap-1.5 bg-green-600 hover:bg-green-500 text-white text-sm font-medium px-4 py-1.5 rounded transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Approve
                          </button>
                          <button
                            onClick={() => handleQcDecision('rejected')}
                            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white text-sm font-medium px-4 py-1.5 rounded transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Bottom bar */}
        <div className="px-4 py-2.5 border-t border-slate-700 flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-4">
            <span>
              Elapsed:{' '}
              {run?.startedAt ? (
                <TotalElapsedTimer startedAt={run.startedAt} completedAt={run.completedAt} />
              ) : (
                '--'
              )}
            </span>
            <span>
              Levels: <span className="text-gray-200">{levelsCompleted}/{totalLevels}</span>
            </span>
            <span>
              Vault items: <span className="text-gray-200">{vaultItemsCreated}</span>
            </span>
          </div>
          {run?.error && (
            <span className="text-red-400 truncate max-w-[300px]" title={run.error}>
              {run.error}
            </span>
          )}
        </div>
      </div>

      {/* Pulse animation for running modules */}
      <style>{`
        .wf-pulse {
          animation: wf-border-pulse 2s ease-in-out infinite;
        }
        @keyframes wf-border-pulse {
          0%, 100% { border-color: rgba(59, 130, 246, 0.5); }
          50% { border-color: rgba(59, 130, 246, 1); }
        }
      `}</style>
    </div>
  );
}
