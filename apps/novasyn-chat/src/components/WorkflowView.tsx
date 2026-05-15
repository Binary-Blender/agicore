import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Plus, Play, CheckCircle, XCircle, Clock, Loader, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { useAppStore } from '../store/appStore';

interface WorkflowStep {
  name: string;
  description?: string;
  prompt?: string;
}

interface StepResult {
  status: 'pending' | 'running' | 'completed' | 'failed';
  output: string;
}

interface Orchestration {
  id: string;
  name: string;
  description?: string;
  steps: string;
  isTemplate: boolean;
  createdAt: string;
}

interface OrchestrationRun {
  id: string;
  status: string;
  currentStepIndex: number;
  stepResults: string;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  orchestrationId: string;
  createdAt: string;
}

interface StreamDelta { requestId: string; delta: string; done: boolean; }

function parseSteps(stepsJson: string): WorkflowStep[] {
  try { return JSON.parse(stepsJson); } catch { return []; }
}

function parseResults(json: string): StepResult[] {
  try { return JSON.parse(json); } catch { return []; }
}

function statusIcon(status: StepResult['status']) {
  switch (status) {
    case 'completed': return <CheckCircle size={16} className="text-green-400 flex-shrink-0" />;
    case 'failed':    return <XCircle size={16} className="text-red-400 flex-shrink-0" />;
    case 'running':   return <Loader size={16} className="text-blue-400 animate-spin flex-shrink-0" />;
    default:          return <Clock size={16} className="text-gray-500 flex-shrink-0" />;
  }
}

function statusColor(status: StepResult['status']) {
  switch (status) {
    case 'completed': return 'border-green-500/30 bg-green-900/10';
    case 'failed':    return 'border-red-500/30 bg-red-900/10';
    case 'running':   return 'border-blue-500/50 bg-blue-900/15';
    default:          return 'border-slate-700 bg-slate-800/50';
  }
}

// ─── Step Card ────────────────────────────────────────────────────────────────

interface StepCardProps {
  step: WorkflowStep;
  result: StepResult;
  index: number;
  isActive: boolean;
  selectedModel: string;
  onComplete: (output: string) => void;
  onFail: (error: string) => void;
}

function StepCard({ step, result, index, isActive, selectedModel, onComplete, onFail }: StepCardProps) {
  const [expanded, setExpanded] = useState(isActive);
  const [streaming, setStreaming] = useState(false);
  const [streamBuffer, setStreamBuffer] = useState('');

  useEffect(() => { if (isActive) setExpanded(true); }, [isActive]);

  async function runWithAI() {
    if (!step.prompt) return;
    setStreaming(true);
    setStreamBuffer('');
    const requestId = crypto.randomUUID();
    let finalText = '';
    const unlisten = await listen<StreamDelta>('chat-stream', (event) => {
      const { requestId: rid, delta, done } = event.payload;
      if (rid !== requestId) return;
      if (done) return;
      finalText += delta;
      setStreamBuffer(finalText);
    });
    try {
      await invoke('send_chat', {
        request: {
          messages: [{ role: 'user', content: step.prompt }],
          model: selectedModel,
        },
        requestId,
      });
      onComplete(finalText || streamBuffer);
    } catch (err) {
      onFail(String(err));
    } finally {
      unlisten();
      setStreaming(false);
    }
  }

  const displayOutput = streaming ? streamBuffer : result.output;

  return (
    <div className={`rounded-lg border transition-colors ${statusColor(result.status)}`}>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <span className="text-xs text-gray-500 w-5 text-right flex-shrink-0">{index + 1}</span>
        {statusIcon(result.status)}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{step.name}</p>
          {step.description && (
            <p className="text-xs text-gray-500 truncate">{step.description}</p>
          )}
        </div>
        {expanded ? <ChevronDown size={14} className="text-gray-500 flex-shrink-0" /> : <ChevronRight size={14} className="text-gray-500 flex-shrink-0" />}
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-3 border-t border-slate-700/50 pt-3">
          {step.prompt && (
            <div>
              <p className="text-xs text-gray-500 mb-1">AI Prompt</p>
              <p className="text-xs text-gray-300 font-mono bg-slate-900/50 rounded px-2 py-1.5 whitespace-pre-wrap">{step.prompt}</p>
            </div>
          )}

          {displayOutput && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Output</p>
              <p className="text-xs text-gray-200 bg-slate-900/50 rounded px-2 py-1.5 whitespace-pre-wrap max-h-40 overflow-y-auto">{displayOutput}</p>
            </div>
          )}

          {isActive && result.status !== 'completed' && result.status !== 'failed' && (
            <div className="flex gap-2 flex-wrap">
              {step.prompt && (
                <button
                  onClick={runWithAI}
                  disabled={streaming}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-gray-500 text-white text-xs rounded-lg transition"
                >
                  {streaming ? <Loader size={12} className="animate-spin" /> : <Play size={12} />}
                  {streaming ? 'Running…' : 'Run with AI'}
                </button>
              )}
              <button
                onClick={() => onComplete(displayOutput || 'Step completed.')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white text-xs rounded-lg transition"
              >
                <CheckCircle size={12} /> Complete
              </button>
              <button
                onClick={() => onFail('Step marked as failed.')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-800 hover:bg-red-700 text-white text-xs rounded-lg transition"
              >
                <XCircle size={12} /> Fail
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Create Modal ─────────────────────────────────────────────────────────────

function CreateModal({ onClose, onCreate }: { onClose: () => void; onCreate: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [stepsText, setStepsText] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!name.trim() || !stepsText.trim()) return;
    setSaving(true);
    const lines = stepsText.split('\n').map((l) => l.trim()).filter(Boolean);
    const steps: WorkflowStep[] = lines.map((line) => {
      const [namePart, ...rest] = line.split('|').map((s) => s.trim());
      return { name: namePart ?? line, description: rest[0], prompt: rest[1] };
    });
    try {
      await invoke('create_orchestration', {
        input: {
          name: name.trim(),
          description: description.trim() || null,
          steps: JSON.stringify(steps),
          isTemplate: false,
        },
      });
      onCreate();
      onClose();
    } catch (err) {
      console.error('Create orchestration failed:', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-white">New Workflow</h2>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Onboard User"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this workflow do?"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Steps — one per line</label>
            <p className="text-xs text-gray-600 mb-1.5">Format: <code className="text-gray-500">Step Name | description | optional AI prompt</code></p>
            <textarea
              value={stepsText}
              onChange={(e) => setStepsText(e.target.value)}
              placeholder={"Gather Requirements | Collect user needs | Summarize what the user needs in bullet points\nDraft Proposal | Write the proposal\nReview & Approve | Final review"}
              rows={5}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500/50 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-1">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || !stepsText.trim() || saving}
            className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-gray-500 rounded-lg transition"
          >
            {saving ? 'Creating…' : 'Create Workflow'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export function WorkflowView() {
  const selectedModel = useAppStore((s) => s.selectedModel);
  const [orchestrations, setOrchestrations] = useState<Orchestration[]>([]);
  const [selected, setSelected] = useState<Orchestration | null>(null);
  const [activeRun, setActiveRun] = useState<OrchestrationRun | null>(null);
  const [pastRuns, setPastRuns] = useState<OrchestrationRun[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [starting, setStarting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function loadOrchestrations() {
    try {
      const list = await invoke<Orchestration[]>('list_orchestrations');
      setOrchestrations(list);
    } catch (err) { console.error(err); }
  }

  async function loadRunsForSelected(orch: Orchestration) {
    try {
      const all = await invoke<OrchestrationRun[]>('list_orchestration_runs');
      const runs = all.filter((r) => r.orchestrationId === orch.id);
      const running = runs.find((r) => r.status === 'running' || r.status === 'pending');
      setActiveRun(running ?? null);
      setPastRuns(runs.filter((r) => r !== running).slice(0, 5));
    } catch (err) { console.error(err); }
  }

  useEffect(() => { loadOrchestrations(); }, []);

  useEffect(() => {
    if (selected) loadRunsForSelected(selected);
  }, [selected]);

  async function startRun() {
    if (!selected || starting) return;
    const steps = parseSteps(selected.steps);
    const initial: StepResult[] = steps.map((_, i) => ({
      status: i === 0 ? 'running' : 'pending',
      output: '',
    }));
    setStarting(true);
    try {
      const run = await invoke<OrchestrationRun>('create_orchestration_run', {
        input: {
          orchestrationId: selected.id,
          status: 'running',
          currentStepIndex: 0,
          stepResults: JSON.stringify(initial),
          startedAt: new Date().toISOString(),
        },
      });
      setActiveRun(run);
    } catch (err) { console.error(err); }
    finally { setStarting(false); }
  }

  async function advanceStep(runId: string, stepIndex: number, output: string, failed: boolean) {
    if (!selected) return;
    const steps = parseSteps(selected.steps);
    const currentResults = parseResults(activeRun?.stepResults ?? '[]');
    const updated: StepResult[] = currentResults.map((r, i) => {
      if (i === stepIndex) return { status: failed ? 'failed' : 'completed', output };
      if (!failed && i === stepIndex + 1) return { status: 'running', output: '' };
      return r;
    });
    const isLast = stepIndex >= steps.length - 1;
    const overallStatus = failed ? 'failed' : isLast ? 'completed' : 'running';
    const nextStep = failed ? stepIndex : isLast ? stepIndex : stepIndex + 1;

    try {
      const updated_run = await invoke<OrchestrationRun>('update_orchestration_run', {
        id: runId,
        input: {
          status: overallStatus,
          currentStepIndex: nextStep,
          stepResults: JSON.stringify(updated),
          ...(overallStatus !== 'running' ? { completedAt: new Date().toISOString() } : {}),
        },
      });
      setActiveRun(updated_run);
      if (overallStatus !== 'running') {
        setPastRuns((prev) => [updated_run, ...prev].slice(0, 5));
        setActiveRun(null);
      }
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch (err) { console.error(err); }
  }

  async function deleteOrchestration(id: string) {
    try {
      await invoke('delete_orchestration', { id });
      if (selected?.id === id) { setSelected(null); setActiveRun(null); setPastRuns([]); }
      setConfirmDelete(null);
      await loadOrchestrations();
    } catch (err) { console.error(err); }
  }

  const steps = selected ? parseSteps(selected.steps) : [];
  const results = activeRun ? parseResults(activeRun.stepResults) : [];

  return (
    <div className="flex h-full overflow-hidden">
      {showCreate && (
        <CreateModal onClose={() => setShowCreate(false)} onCreate={loadOrchestrations} />
      )}

      {/* Workflow List */}
      <div className="w-64 flex-shrink-0 border-r border-slate-700 flex flex-col bg-slate-900/50">
        <div className="px-3 py-3 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Workflows</h2>
          <button
            onClick={() => setShowCreate(true)}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-slate-700 transition"
            title="New Workflow"
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {orchestrations.length === 0 && (
            <p className="text-xs text-gray-600 px-3 py-4 text-center">No workflows yet.<br />Click + to create one.</p>
          )}
          {orchestrations.map((o) => (
            <div key={o.id} className="group relative mx-1 mb-0.5">
              {confirmDelete === o.id ? (
                <div className="px-2 py-1.5 bg-red-900/20 border border-red-800/30 rounded">
                  <p className="text-xs text-red-300 mb-1.5">Delete "{o.name}"?</p>
                  <div className="flex gap-1">
                    <button onClick={() => deleteOrchestration(o.id)} className="text-xs text-white bg-red-600 hover:bg-red-700 px-2 py-0.5 rounded transition">Delete</button>
                    <button onClick={() => setConfirmDelete(null)} className="text-xs text-gray-400 bg-slate-700 hover:bg-slate-600 px-2 py-0.5 rounded transition">Cancel</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setSelected(o)}
                  className={`w-full text-left flex items-center gap-2 px-2 py-2 rounded transition ${
                    selected?.id === o.id ? 'bg-blue-600/20 text-blue-200' : 'text-gray-300 hover:bg-slate-700/50 hover:text-white'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{o.name}</p>
                    {o.description && <p className="text-xs text-gray-500 truncate">{o.description}</p>}
                    <p className="text-xs text-gray-600">{parseSteps(o.steps).length} steps</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(o.id); }}
                    className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 p-0.5 rounded hover:bg-slate-600 transition"
                  >
                    <Trash2 size={11} />
                  </button>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Trace Panel */}
      <div className="flex-1 overflow-y-auto">
        {!selected ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-600">
              <Play size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select a workflow to view its execution trace</p>
              <button onClick={() => setShowCreate(true)} className="mt-3 text-xs text-blue-400 hover:text-blue-300 transition">
                or create a new workflow
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto px-6 py-6 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-lg font-semibold text-white">{selected.name}</h1>
                {selected.description && <p className="text-sm text-gray-400 mt-0.5">{selected.description}</p>}
                <p className="text-xs text-gray-600 mt-1">{steps.length} steps</p>
              </div>
              {!activeRun && (
                <button
                  onClick={startRun}
                  disabled={starting || steps.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-gray-500 text-white text-sm rounded-lg transition flex-shrink-0"
                >
                  <Play size={14} />
                  {starting ? 'Starting…' : 'Start Run'}
                </button>
              )}
              {activeRun && (
                <div className="flex items-center gap-2 text-sm text-blue-300">
                  <Loader size={14} className="animate-spin" />
                  Run in progress
                </div>
              )}
            </div>

            {/* Active run trace */}
            {activeRun && (
              <div className="space-y-2">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Active Run</h2>
                {steps.map((step, i) => (
                  <StepCard
                    key={i}
                    step={step}
                    result={results[i] ?? { status: 'pending', output: '' }}
                    index={i}
                    isActive={activeRun.currentStepIndex === i}
                    selectedModel={selectedModel}
                    onComplete={(output) => advanceStep(activeRun.id, i, output, false)}
                    onFail={(error) => advanceStep(activeRun.id, i, error, true)}
                  />
                ))}
              </div>
            )}

            {/* Step definition (when no active run) */}
            {!activeRun && (
              <div className="space-y-2">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Steps</h2>
                {steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-3 rounded-lg border border-slate-700 bg-slate-800/50">
                    <span className="text-xs text-gray-600 w-5 text-right flex-shrink-0 mt-0.5">{i + 1}</span>
                    <Clock size={16} className="text-gray-600 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-sm text-white">{step.name}</p>
                      {step.description && <p className="text-xs text-gray-500">{step.description}</p>}
                      {step.prompt && <p className="text-xs text-blue-400/70 mt-1 font-mono truncate">{step.prompt}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Past runs */}
            {pastRuns.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Recent Runs</h2>
                {pastRuns.map((run) => {
                  const runResults = parseResults(run.stepResults);
                  const done = runResults.filter((r) => r.status === 'completed').length;
                  const failed = runResults.filter((r) => r.status === 'failed').length;
                  return (
                    <div key={run.id} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border ${
                      run.status === 'completed' ? 'border-green-500/20 bg-green-900/5' :
                      run.status === 'failed' ? 'border-red-500/20 bg-red-900/5' :
                      'border-slate-700 bg-slate-800/30'
                    }`}>
                      {run.status === 'completed' ? <CheckCircle size={14} className="text-green-400" /> :
                       run.status === 'failed' ? <XCircle size={14} className="text-red-400" /> :
                       <Clock size={14} className="text-gray-500" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-300 capitalize">{run.status}</p>
                        <p className="text-xs text-gray-600">{done} completed · {failed} failed · {run.startedAt ? new Date(run.startedAt).toLocaleString() : '—'}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </div>
  );
}
