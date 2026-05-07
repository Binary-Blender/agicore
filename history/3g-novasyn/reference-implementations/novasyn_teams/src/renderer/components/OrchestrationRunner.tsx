import React, { useState, useEffect, useRef, useCallback } from 'react';

// Types inlined for Teams
interface OrchestrationStep {
  id: string;
  type: string;
  name: string;
  config: Record<string, any>;
}

interface Orchestration {
  id: string;
  name: string;
  description: string;
  steps: OrchestrationStep[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface StepResult {
  stepIndex: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'awaiting_qc' | 'skipped';
  output?: any;
  error?: string;
  startedAt?: string;
  latencyMs?: number;
  vaultItemId?: string;
}

interface OrchestrationRun {
  id: string;
  orchestrationId: string;
  status: 'pending' | 'running' | 'paused_for_qc' | 'completed' | 'failed';
  currentStepIndex: number;
  stepResults: StepResult[];
  startedAt?: string;
  completedAt?: string;
  pausedAt?: string;
  error?: string;
}

interface Props {
  runId: string;
  orchestrationName: string;
  onClose: () => void;
}

const STEP_TYPE_LABELS: Record<string, string> = {
  ai_action: 'AI Action',
  qc_checkpoint: 'QC Check',
  transform: 'Transform',
  vault_save: 'Vault Save',
  vault_load: 'Vault Load',
};

const STEP_TYPE_COLORS: Record<string, string> = {
  ai_action: 'bg-purple-600/30 text-purple-300 border-purple-500/50',
  qc_checkpoint: 'bg-yellow-600/30 text-yellow-300 border-yellow-500/50',
  transform: 'bg-cyan-600/30 text-cyan-300 border-cyan-500/50',
  vault_save: 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50',
  vault_load: 'bg-blue-600/30 text-blue-300 border-blue-500/50',
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

export function OrchestrationRunner({ runId, orchestrationName, onClose }: Props) {
  const [run, setRun] = useState<OrchestrationRun | null>(null);
  const [orchestration, setOrchestration] = useState<Orchestration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const loadOrchestration = useCallback(async (orchestrationId: string) => {
    try {
      const orch = await window.electronAPI.orchGet(orchestrationId);
      if (orch) setOrchestration(orch);
    } catch (err) {
      console.error('Failed to load orchestration:', err);
    }
  }, []);

  const fetchRun = useCallback(async () => {
    try {
      const data = await window.electronAPI.orchGetRun(runId);
      if (data) {
        setRun(data);
        if (!orchestration) {
          loadOrchestration(data.orchestrationId);
        }
      }
      setError(null);
    } catch (err) {
      console.error('Failed to fetch orchestration run:', err);
      setError('Failed to load run data');
    }
    setLoading(false);
  }, [runId, orchestration, loadOrchestration]);

  useEffect(() => {
    fetchRun();

    const unsubscribe = window.electronAPI.onOrchStepProgress((data: any) => {
      if (data.runId !== runId) return;
      setRun((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, stepResults: [...prev.stepResults] };
        const existing = updated.stepResults.find((r) => r.stepIndex === data.stepIndex);
        if (existing) {
          existing.status = data.status;
          if (data.output !== undefined) existing.output = data.output;
        }
        if (data.status === 'awaiting_qc') {
          updated.status = 'paused_for_qc';
          updated.pausedAt = new Date().toISOString();
        } else if (data.status === 'running') {
          updated.status = 'running';
          updated.currentStepIndex = data.stepIndex;
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

  useEffect(() => {
    if (run && (run.status === 'completed' || run.status === 'failed')) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
  }, [run?.status]);

  const handleQcDecision = async (decision: 'approved' | 'rejected') => {
    try {
      const updated = await window.electronAPI.orchResume(runId, decision);
      setRun(updated);
    } catch (err) {
      console.error('Failed to submit QC decision:', err);
      setError('Failed to submit QC decision');
    }
  };

  const steps: OrchestrationStep[] = orchestration?.steps || [];
  const stepResults: StepResult[] = run?.stepResults || [];
  const vaultItemsCreated = stepResults.filter((r) => r.vaultItemId).length;
  const stepsCompleted = stepResults.filter((r) => r.status === 'completed').length;
  const totalSteps = steps.length || stepResults.length;

  const getStepResult = (index: number): StepResult | undefined =>
    stepResults.find((r) => r.stepIndex === index);

  const getPreviousStepOutput = (currentIndex: number): string => {
    if (currentIndex <= 0) return '(no previous step output)';
    const prev = getStepResult(currentIndex - 1);
    if (!prev || !prev.output) return '(no output from previous step)';
    return typeof prev.output === 'string' ? prev.output : JSON.stringify(prev.output, null, 2);
  };

  const statusBadge = run ? RUN_STATUS_BADGES[run.status] || RUN_STATUS_BADGES.pending : RUN_STATUS_BADGES.pending;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-slate-800 border border-slate-600 rounded-xl w-[700px] h-[650px] shadow-2xl flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-600">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-lg font-semibold text-white truncate">{orchestrationName}</h2>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusBadge.bg} ${statusBadge.text}`}>
              {statusBadge.label}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl flex-shrink-0 ml-3">&times;</button>
        </div>

        {/* Step execution list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">Loading run data...</div>
          ) : error && !run ? (
            <div className="flex items-center justify-center h-full text-red-400 text-sm">{error}</div>
          ) : steps.length === 0 && stepResults.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">Waiting for steps...</div>
          ) : (
            (steps.length > 0 ? steps : Array.from({ length: stepResults.length }, (_, i) => null)).map((step, index) => {
              const result = getStepResult(index);
              const status = result?.status || 'pending';
              const stepName = step?.name || `Step ${index + 1}`;
              const stepType = step?.type || 'ai_action';
              const typeBadgeClass = STEP_TYPE_COLORS[stepType] || STEP_TYPE_COLORS.ai_action;

              let cardClass = 'rounded-lg border p-3 transition-all ';
              switch (status) {
                case 'pending': cardClass += 'bg-slate-700 border-slate-600 opacity-60'; break;
                case 'running': cardClass += 'bg-blue-900/30 border-blue-500 orch-pulse'; break;
                case 'completed': cardClass += 'bg-green-900/20 border-green-600'; break;
                case 'failed': cardClass += 'bg-red-900/20 border-red-500'; break;
                case 'awaiting_qc': cardClass += 'bg-yellow-900/20 border-yellow-500'; break;
                case 'skipped': cardClass += 'bg-slate-700 border-slate-600 opacity-50'; break;
                default: cardClass += 'bg-slate-700 border-slate-600';
              }

              return (
                <div key={step?.id || `step-${index}`} className={cardClass}>
                  <div className="flex items-center gap-2 mb-1">
                    {status === 'pending' && <div className="w-4 h-4 rounded-full border-2 border-gray-500 flex-shrink-0" />}
                    {status === 'running' && <div className="w-4 h-4 rounded-full bg-blue-500 flex-shrink-0 animate-pulse" />}
                    {status === 'completed' && (
                      <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {status === 'failed' && (
                      <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    {status === 'awaiting_qc' && (
                      <svg className="w-4 h-4 text-yellow-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    {status === 'skipped' && (
                      <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                      </svg>
                    )}

                    <span className={`text-sm font-medium ${status === 'pending' ? 'text-gray-500' : 'text-white'}`}>
                      {index + 1}. {stepName}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded border ${typeBadgeClass}`}>
                      {STEP_TYPE_LABELS[stepType] || stepType}
                    </span>

                    <div className="ml-auto flex items-center gap-2">
                      {status === 'running' && result?.startedAt && (
                        <>
                          <span className="text-blue-300 text-xs">Running...</span>
                          <ElapsedTimer startedAt={result.startedAt} />
                        </>
                      )}
                      {status === 'completed' && result?.latencyMs != null && (
                        <span className="text-green-400 text-xs font-mono">{formatLatency(result.latencyMs)}</span>
                      )}
                    </div>
                  </div>

                  {status === 'completed' && result?.output && (
                    <div className="mt-2 bg-slate-900/50 rounded px-2.5 py-2 text-xs text-gray-300 font-mono whitespace-pre-wrap break-words">
                      {truncateOutput(result.output)}
                    </div>
                  )}

                  {status === 'failed' && (
                    <div className="mt-2 bg-red-900/30 rounded px-2.5 py-2 text-xs text-red-300">
                      {result?.error || 'Unknown error'}
                    </div>
                  )}

                  {status === 'awaiting_qc' && (
                    <div className="mt-3 space-y-3">
                      {step?.config?.qcDescription && (
                        <div className="text-sm text-yellow-200">
                          <span className="font-medium text-yellow-400">Review: </span>
                          {step.config.qcDescription}
                        </div>
                      )}
                      <div className="bg-slate-900/60 rounded-lg p-3">
                        <div className="text-xs font-medium text-gray-400 mb-1.5">Output from previous step:</div>
                        <div className="text-sm text-gray-200 whitespace-pre-wrap break-words max-h-48 overflow-y-auto font-mono">
                          {getPreviousStepOutput(index)}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
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
              {run?.startedAt ? <TotalElapsedTimer startedAt={run.startedAt} completedAt={run.completedAt} /> : '--'}
            </span>
            <span>Steps: <span className="text-gray-200">{stepsCompleted}/{totalSteps}</span></span>
            <span>Vault items: <span className="text-gray-200">{vaultItemsCreated}</span></span>
          </div>
          {run?.error && (
            <span className="text-red-400 truncate max-w-[300px]" title={run.error}>{run.error}</span>
          )}
        </div>
      </div>

      <style>{`
        .orch-pulse {
          animation: orch-border-pulse 2s ease-in-out infinite;
        }
        @keyframes orch-border-pulse {
          0%, 100% { border-color: rgba(59, 130, 246, 0.5); }
          50% { border-color: rgba(59, 130, 246, 1); }
        }
      `}</style>
    </div>
  );
}
