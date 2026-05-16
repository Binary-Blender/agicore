import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import {
  Brain, Play, Clock, CheckCircle, XCircle, Loader,
  ChevronDown, ChevronRight, RefreshCw, Calendar,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReasonerRun {
  id: string;
  reasonerName: string;
  status: 'running' | 'completed' | 'failed';
  recordsAnalyzed: number;
  output?: string;
  error?: string;
  model?: string;
  startedAt: string;
  completedAt?: string;
  createdAt: string;
}

interface ReasonerStatus {
  name: string;
  description: string;
  schedule: string;
  lastRun?: ReasonerRun;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scheduleLabel(schedule: string) {
  switch (schedule) {
    case 'daily':       return 'Runs daily';
    case 'weekly':      return 'Runs weekly';
    case 'hourly':      return 'Runs hourly';
    case 'on_demand':   return 'On-demand';
    case 'event_triggered': return 'Event-triggered';
    default:            return schedule;
  }
}

function timeAgo(iso?: string) {
  if (!iso) return 'Never';
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function StatusBadge({ status }: { status: ReasonerRun['status'] }) {
  if (status === 'completed') return (
    <span className="flex items-center gap-1 text-green-400 text-xs">
      <CheckCircle size={12} /> completed
    </span>
  );
  if (status === 'failed') return (
    <span className="flex items-center gap-1 text-red-400 text-xs">
      <XCircle size={12} /> failed
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-blue-400 text-xs">
      <Loader size={12} className="animate-spin" /> running
    </span>
  );
}

// ─── Run Detail ───────────────────────────────────────────────────────────────

function RunCard({ run, defaultExpanded = false }: { run: ReasonerRun; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className={`rounded-lg border transition-colors ${
      run.status === 'completed' ? 'border-slate-700 bg-slate-800/40' :
      run.status === 'failed'   ? 'border-red-500/20 bg-red-900/5' :
                                  'border-blue-500/30 bg-blue-900/10'
    }`}>
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <StatusBadge status={run.status} />
        <span className="flex-1 text-xs text-gray-500">
          {run.recordsAnalyzed} records · {timeAgo(run.startedAt)}
          {run.model && <span className="ml-2 text-gray-600">{run.model}</span>}
        </span>
        {expanded
          ? <ChevronDown size={12} className="text-gray-600 flex-shrink-0" />
          : <ChevronRight size={12} className="text-gray-600 flex-shrink-0" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-700/50 pt-3">
          {run.output && (
            <div className="prose prose-invert prose-sm max-w-none">
              <pre className="text-xs text-gray-200 whitespace-pre-wrap font-sans leading-relaxed bg-slate-900/60 rounded-lg p-3 max-h-96 overflow-y-auto">
                {run.output}
              </pre>
            </div>
          )}
          {run.error && (
            <p className="text-xs text-red-400 bg-red-900/20 rounded px-3 py-2">{run.error}</p>
          )}
          {!run.output && !run.error && (
            <p className="text-xs text-gray-600">No output recorded.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Reasoner Panel ───────────────────────────────────────────────────────────

function ReasonerPanel({
  status,
  onRun,
  runningName,
}: {
  status: ReasonerStatus;
  onRun: (name: string) => void;
  runningName: string | null;
}) {
  const [runs, setRuns] = useState<ReasonerRun[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const isRunning = runningName === status.name;

  async function loadRuns() {
    setLoadingRuns(true);
    try {
      const list = await invoke<ReasonerRun[]>('list_reasoner_runs', { name: status.name });
      setRuns(list);
    } catch (err) { console.error(err); }
    finally { setLoadingRuns(false); }
  }

  useEffect(() => {
    if (showHistory) loadRuns();
  }, [showHistory, status.name]);

  const lastRun = status.lastRun;

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/50 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 flex items-start gap-4">
        <div className="w-9 h-9 rounded-lg bg-blue-600/15 border border-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Brain size={18} className="text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-sm font-semibold text-white">
              {status.name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </h3>
            <span className="text-xs text-gray-600 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded flex items-center gap-1">
              <Calendar size={10} /> {scheduleLabel(status.schedule)}
            </span>
          </div>
          <p className="text-xs text-gray-500">{status.description}</p>
        </div>
        <button
          onClick={() => onRun(status.name)}
          disabled={isRunning}
          title="Run now"
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition flex-shrink-0 ${
            isRunning
              ? 'bg-slate-700 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500 text-white'
          }`}
        >
          {isRunning
            ? <><Loader size={12} className="animate-spin" /> Running…</>
            : <><Play size={12} /> Run Now</>}
        </button>
      </div>

      {/* Last run summary */}
      {lastRun ? (
        <div className="px-5 pb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-gray-600">Last run:</span>
            <StatusBadge status={lastRun.status} />
            <span className="text-xs text-gray-600">{timeAgo(lastRun.startedAt)} · {lastRun.recordsAnalyzed} records</span>
          </div>
          {lastRun.status === 'completed' && lastRun.output && (
            <RunCard run={lastRun} defaultExpanded />
          )}
          {lastRun.status === 'failed' && lastRun.error && (
            <p className="text-xs text-red-400 bg-red-900/20 rounded px-3 py-2">{lastRun.error}</p>
          )}
        </div>
      ) : (
        <div className="px-5 pb-4">
          <p className="text-xs text-gray-600 flex items-center gap-1.5">
            <Clock size={12} /> Never run — click Run Now to analyze
          </p>
        </div>
      )}

      {/* History toggle */}
      <div className="border-t border-slate-700/50">
        <button
          onClick={() => setShowHistory(v => !v)}
          className="w-full flex items-center gap-2 px-5 py-2 text-xs text-gray-600 hover:text-gray-400 transition"
        >
          {showHistory ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          Run history
          {loadingRuns && <Loader size={10} className="animate-spin ml-1" />}
        </button>

        {showHistory && (
          <div className="px-5 pb-4 space-y-2">
            {runs.length === 0 && !loadingRuns && (
              <p className="text-xs text-gray-600">No runs yet.</p>
            )}
            {runs.map(run => (
              <RunCard key={run.id} run={run} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export function ReasonerView() {
  const selectedModel = useAppStore(s => s.selectedModel);
  const [statuses, setStatuses] = useState<ReasonerStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningName, setRunningName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStatuses = useCallback(async () => {
    try {
      const list = await invoke<ReasonerStatus[]>('list_reasoner_statuses');
      setStatuses(list);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadStatuses();

    // Listen for background scheduler completions
    const unlisten = listen<ReasonerRun>('reasoner-completed', () => {
      loadStatuses();
    });
    return () => { unlisten.then(fn => fn()); };
  }, [loadStatuses]);

  async function handleRun(name: string) {
    setRunningName(name);
    setError(null);
    try {
      await invoke('run_reasoner', { name, model: selectedModel });
      await loadStatuses();
    } catch (err) {
      setError(String(err));
    } finally {
      setRunningName(null);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain size={20} className="text-blue-400" />
          <div>
            <h1 className="text-base font-semibold text-white">Reasoners</h1>
            <p className="text-xs text-gray-500">Periodic AI analysis loops that surface insights from your data</p>
          </div>
        </div>
        <button
          onClick={loadStatuses}
          className="text-gray-500 hover:text-white p-1.5 rounded hover:bg-slate-700 transition"
          title="Refresh"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-900/20 border border-red-500/30 rounded-lg text-sm text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-32 text-gray-600">
            <Loader size={20} className="animate-spin mr-2" /> Loading reasoners…
          </div>
        ) : (
          <div className="max-w-2xl space-y-4">
            {statuses.map(status => (
              <ReasonerPanel
                key={status.name}
                status={status}
                onRun={handleRun}
                runningName={runningName}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
