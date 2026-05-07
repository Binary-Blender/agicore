import React, { useState, useEffect } from 'react';

// Types inlined for Teams (matches shared types)
interface OrchestrationStep {
  id: string;
  type: OrchestrationStepType;
  name: string;
  config: Record<string, any>;
}

type OrchestrationStepType = 'ai_action' | 'qc_checkpoint' | 'transform' | 'vault_save' | 'vault_load';

interface Orchestration {
  id: string;
  name: string;
  description: string;
  steps: OrchestrationStep[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface AIModel {
  id: string;
  name: string;
  provider: string;
}

interface Props {
  orchestration?: Orchestration;
  onClose: () => void;
  onSaved: (orch: Orchestration) => void;
  onRun: (orchId: string) => void;
}

// ---------- Step type metadata ----------

interface StepTypeMeta {
  type: OrchestrationStepType;
  label: string;
  description: string;
  icon: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
}

const STEP_TYPES: StepTypeMeta[] = [
  {
    type: 'ai_action',
    label: 'AI Action',
    description: 'Send a prompt to an AI model',
    icon: '\u2728',
    bgClass: 'bg-blue-500/20',
    borderClass: 'border-blue-500',
    textClass: 'text-blue-400',
  },
  {
    type: 'qc_checkpoint',
    label: 'QC Checkpoint',
    description: 'Pause for human review',
    icon: '\u2714',
    bgClass: 'bg-yellow-500/20',
    borderClass: 'border-yellow-500',
    textClass: 'text-yellow-400',
  },
  {
    type: 'transform',
    label: 'Transform',
    description: 'Extract or reformat data',
    icon: '\u21C4',
    bgClass: 'bg-purple-500/20',
    borderClass: 'border-purple-500',
    textClass: 'text-purple-400',
  },
  {
    type: 'vault_save',
    label: 'Vault Save',
    description: 'Save output to NS Vault',
    icon: '\u2193',
    bgClass: 'bg-green-500/20',
    borderClass: 'border-green-500',
    textClass: 'text-green-400',
  },
  {
    type: 'vault_load',
    label: 'Vault Load',
    description: 'Load an item from NS Vault',
    icon: '\u2191',
    bgClass: 'bg-cyan-500/20',
    borderClass: 'border-cyan-500',
    textClass: 'text-cyan-400',
  },
];

function getStepMeta(type: OrchestrationStepType): StepTypeMeta {
  return STEP_TYPES.find((s) => s.type === type) ?? STEP_TYPES[0];
}

function generateId(): string {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

function createEmptyStep(type: OrchestrationStepType): OrchestrationStep {
  const meta = getStepMeta(type);
  return {
    id: generateId(),
    type,
    name: meta.label,
    config: {},
  };
}

function getStepSummary(step: OrchestrationStep): string {
  switch (step.type) {
    case 'ai_action': {
      const parts: string[] = [];
      if (step.config.model) parts.push(step.config.model);
      if (step.config.inputSource) parts.push(`input: ${step.config.inputSource}`);
      if (step.config.saveToVault) parts.push('save to vault');
      return parts.join(' \u00B7 ') || 'Not configured';
    }
    case 'qc_checkpoint':
      return step.config.qcDescription?.slice(0, 60) || 'No description';
    case 'transform': {
      const labels: Record<string, string> = {
        extract_json: 'Extract JSON',
        format_text: 'Format text',
        regex: 'Regex',
      };
      return step.config.transformType
        ? labels[step.config.transformType] || step.config.transformType
        : 'Not configured';
    }
    case 'vault_save':
      return step.config.tags?.length
        ? `Tags: ${step.config.tags.join(', ')}`
        : 'No tags';
    case 'vault_load':
      return step.config.vaultItemId || 'No item selected';
    default:
      return '';
  }
}

// ---------- Component ----------

export function OrchestrationBuilder({ orchestration, onClose, onSaved, onRun }: Props) {
  const [name, setName] = useState(orchestration?.name ?? 'New Orchestration');
  const [description, setDescription] = useState(orchestration?.description ?? '');
  const [steps, setSteps] = useState<OrchestrationStep[]>(orchestration?.steps ?? []);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [models, setModels] = useState<AIModel[]>([]);
  const [vaultTags, setVaultTags] = useState<{ id: string; name: string; color: string }[]>([]);

  useEffect(() => {
    window.electronAPI.getModels().then(setModels).catch(console.error);
    window.electronAPI.vaultGetTags().then(setVaultTags).catch(console.error);
  }, []);

  const selectedStep = steps.find((s) => s.id === selectedStepId) ?? null;

  function addStep(type: OrchestrationStepType) {
    const step = createEmptyStep(type);
    setSteps((prev) => [...prev, step]);
    setSelectedStepId(step.id);
  }

  function deleteStep(id: string) {
    setSteps((prev) => prev.filter((s) => s.id !== id));
    if (selectedStepId === id) setSelectedStepId(null);
  }

  function moveStep(id: string, direction: 'up' | 'down') {
    setSteps((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx < 0) return prev;
      const target = direction === 'up' ? idx - 1 : idx + 1;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[target]] = [copy[target], copy[idx]];
      return copy;
    });
  }

  function updateStep(id: string, updates: Partial<OrchestrationStep>) {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    );
  }

  function updateStepConfig(id: string, configUpdates: Partial<OrchestrationStep['config']>) {
    setSteps((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, config: { ...s.config, ...configUpdates } } : s,
      ),
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      let saved: Orchestration;
      if (orchestration?.id) {
        saved = await window.electronAPI.orchUpdate(orchestration.id, { name, description, steps });
      } else {
        saved = await window.electronAPI.orchCreate({ name, description, steps });
      }
      onSaved(saved);
    } catch (err) {
      console.error('Failed to save orchestration:', err);
    }
    setSaving(false);
  }

  async function handleRun() {
    setSaving(true);
    try {
      let orch: Orchestration;
      if (orchestration?.id) {
        orch = await window.electronAPI.orchUpdate(orchestration.id, { name, description, steps });
      } else {
        orch = await window.electronAPI.orchCreate({ name, description, steps });
      }
      onSaved(orch);
      onRun(orch.id);
    } catch (err) {
      console.error('Failed to save/run orchestration:', err);
    }
    setSaving(false);
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-slate-800 border border-slate-600 rounded-xl w-[1100px] h-[700px] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-600">
          <h2 className="text-lg font-semibold text-white">Orchestration Builder</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">&times;</button>
        </div>

        {/* 3-column body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left — Step Palette */}
          <div className="w-[200px] border-r border-slate-700 p-3 flex flex-col gap-2 overflow-y-auto">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Step Palette</h3>
            {STEP_TYPES.map((meta) => (
              <button
                key={meta.type}
                onClick={() => addStep(meta.type)}
                className={`text-left p-2.5 rounded-lg border ${meta.bgClass} ${meta.borderClass} border-opacity-40 hover:border-opacity-80 transition cursor-pointer`}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-base">{meta.icon}</span>
                  <span className={`text-sm font-medium ${meta.textClass}`}>{meta.label}</span>
                </div>
                <p className="text-xs text-gray-400 leading-snug">{meta.description}</p>
              </button>
            ))}
          </div>

          {/* Center — Step List */}
          <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-700">
            <div className="px-4 pt-4 pb-2 space-y-2 border-b border-slate-700">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Orchestration name"
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500"
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (optional)"
                rows={2}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-gray-300 placeholder-gray-500 focus:outline-none focus:border-teal-500 resize-none"
              />
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {steps.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                  Add steps from the palette to build your orchestration
                </div>
              ) : (
                steps.map((step, idx) => {
                  const meta = getStepMeta(step.type);
                  const isSelected = selectedStepId === step.id;
                  return (
                    <div
                      key={step.id}
                      onClick={() => setSelectedStepId(step.id)}
                      className={`rounded-lg border p-3 cursor-pointer transition ${
                        isSelected
                          ? `${meta.bgClass} ${meta.borderClass}`
                          : 'border-slate-600 bg-slate-800 hover:bg-slate-700/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-400 w-5 text-right flex-shrink-0">{idx + 1}.</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${meta.bgClass} ${meta.textClass}`}>
                          {meta.icon} {meta.label}
                        </span>
                        <input
                          type="text"
                          value={step.name}
                          onChange={(e) => updateStep(step.id, { name: e.target.value })}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 bg-transparent text-sm text-white focus:outline-none focus:bg-slate-900/50 px-1 rounded min-w-0"
                        />
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); moveStep(step.id, 'up'); }}
                            disabled={idx === 0}
                            className="text-gray-400 hover:text-white disabled:opacity-30 text-sm px-1"
                          >&#9650;</button>
                          <button
                            onClick={(e) => { e.stopPropagation(); moveStep(step.id, 'down'); }}
                            disabled={idx === steps.length - 1}
                            className="text-gray-400 hover:text-white disabled:opacity-30 text-sm px-1"
                          >&#9660;</button>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteStep(step.id); }}
                            className="text-gray-400 hover:text-red-400 text-sm px-1 ml-1"
                          >&times;</button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-1.5 ml-7 truncate">{getStepSummary(step)}</p>
                    </div>
                  );
                })
              )}
            </div>

            {steps.length > 0 && (
              <div className="px-4 pb-3">
                <button
                  onClick={() => addStep('ai_action')}
                  className="w-full border border-dashed border-slate-600 rounded-lg py-2 text-sm text-gray-400 hover:text-white hover:border-slate-400 transition"
                >
                  + Add Step
                </button>
              </div>
            )}
          </div>

          {/* Right — Step Config */}
          <div className="w-[300px] overflow-y-auto p-4">
            {selectedStep ? (
              <StepConfigPanel
                step={selectedStep}
                models={models}
                vaultTags={vaultTags}
                onUpdateConfig={(updates) => updateStepConfig(selectedStep.id, updates)}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                Select a step to configure it
              </div>
            )}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-600 bg-slate-800">
          <div className="text-xs text-gray-500">{steps.length} step{steps.length !== 1 ? 's' : ''}</div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-300 hover:text-white transition">Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="px-4 py-2 text-sm bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition disabled:opacity-50"
            >{saving ? 'Saving...' : 'Save'}</button>
            <button
              onClick={handleRun}
              disabled={saving || steps.length === 0 || !name.trim()}
              className="px-4 py-2 text-sm bg-teal-600 hover:bg-teal-500 text-white rounded-lg transition disabled:opacity-50"
            >{saving ? 'Saving...' : 'Run'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Step configuration sub-panel ----------

interface StepConfigPanelProps {
  step: OrchestrationStep;
  models: AIModel[];
  vaultTags: { id: string; name: string; color: string }[];
  onUpdateConfig: (updates: Partial<OrchestrationStep['config']>) => void;
}

function StepConfigPanel({ step, models, vaultTags, onUpdateConfig }: StepConfigPanelProps) {
  const meta = getStepMeta(step.type);

  const fieldLabelClass = 'block text-xs font-medium text-gray-400 mb-1';
  const inputClass = 'w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500';
  const selectClass = 'w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500';
  const textareaClass = 'w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 resize-none';

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className={`text-xs font-medium px-2 py-0.5 rounded ${meta.bgClass} ${meta.textClass}`}>
          {meta.icon} {meta.label}
        </span>
        <span className="text-sm text-white font-medium truncate">{step.name}</span>
      </div>

      <div className="space-y-4">
        {step.type === 'ai_action' && (
          <>
            <div>
              <label className={fieldLabelClass}>Model</label>
              <select value={step.config.model ?? ''} onChange={(e) => onUpdateConfig({ model: e.target.value })} className={selectClass}>
                <option value="">Select a model</option>
                {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className={fieldLabelClass}>Prompt Template</label>
              <textarea
                value={step.config.promptTemplate ?? ''}
                onChange={(e) => onUpdateConfig({ promptTemplate: e.target.value })}
                placeholder="Enter your prompt. Use {{input}} for previous step output."
                rows={4}
                className={textareaClass}
              />
            </div>
            <div>
              <label className={fieldLabelClass}>Input Source</label>
              <div className="space-y-1.5">
                {(['previous', 'manual', 'vault'] as const).map((src) => (
                  <label key={src} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                    <input type="radio" name={`input-source-${step.id}`} checked={step.config.inputSource === src} onChange={() => onUpdateConfig({ inputSource: src })} className="accent-teal-500" />
                    {src === 'previous' ? 'Previous step output' : src === 'manual' ? 'Manual text' : 'Vault item'}
                  </label>
                ))}
              </div>
            </div>
            {step.config.inputSource === 'manual' && (
              <div>
                <label className={fieldLabelClass}>Manual Input</label>
                <textarea value={step.config.manualInput ?? ''} onChange={(e) => onUpdateConfig({ manualInput: e.target.value })} placeholder="Enter the input text..." rows={3} className={textareaClass} />
              </div>
            )}
            {step.config.inputSource === 'vault' && (
              <div>
                <label className={fieldLabelClass}>Vault Item ID</label>
                <input type="text" value={step.config.vaultItemId ?? ''} onChange={(e) => onUpdateConfig({ vaultItemId: e.target.value })} placeholder="Paste a vault item ID" className={inputClass} />
              </div>
            )}
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input type="checkbox" checked={step.config.saveToVault ?? false} onChange={(e) => onUpdateConfig({ saveToVault: e.target.checked })} className="accent-teal-500" />
              Save output to Vault
            </label>
          </>
        )}

        {step.type === 'qc_checkpoint' && (
          <div>
            <label className={fieldLabelClass}>What should the reviewer check?</label>
            <textarea value={step.config.qcDescription ?? ''} onChange={(e) => onUpdateConfig({ qcDescription: e.target.value })} placeholder="Describe what the reviewer should look for..." rows={6} className={textareaClass} />
          </div>
        )}

        {step.type === 'transform' && (
          <>
            <div>
              <label className={fieldLabelClass}>Transform Type</label>
              <select value={step.config.transformType ?? ''} onChange={(e) => onUpdateConfig({ transformType: e.target.value })} className={selectClass}>
                <option value="">Select a type</option>
                <option value="extract_json">Extract JSON field</option>
                <option value="format_text">Format text</option>
                <option value="regex">Regex</option>
              </select>
            </div>
            <div>
              <label className={fieldLabelClass}>Pattern</label>
              <input type="text" value={step.config.transformPattern ?? ''} onChange={(e) => onUpdateConfig({ transformPattern: e.target.value })} placeholder="Pattern..." className={inputClass} />
            </div>
          </>
        )}

        {step.type === 'vault_save' && (
          <>
            <div>
              <label className={fieldLabelClass}>Title Template</label>
              <input type="text" value={step.config.promptTemplate ?? ''} onChange={(e) => onUpdateConfig({ promptTemplate: e.target.value })} placeholder="e.g. Summary - {{date}}" className={inputClass} />
            </div>
            <div>
              <label className={fieldLabelClass}>Tags</label>
              {vaultTags.length === 0 ? (
                <p className="text-xs text-gray-500">No vault tags available.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {vaultTags.map((tag) => {
                    const isActive = (step.config.tags ?? []).includes(tag.name);
                    return (
                      <button
                        key={tag.id}
                        onClick={() => {
                          const tags = step.config.tags ?? [];
                          onUpdateConfig({ tags: isActive ? tags.filter((t: string) => t !== tag.name) : [...tags, tag.name] });
                        }}
                        className={`text-xs px-2 py-1 rounded border transition ${isActive ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-slate-700 border-slate-600 text-gray-400 hover:text-white'}`}
                      >
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {step.type === 'vault_load' && (
          <div>
            <label className={fieldLabelClass}>Vault Item ID</label>
            <input type="text" value={step.config.vaultItemId ?? ''} onChange={(e) => onUpdateConfig({ vaultItemId: e.target.value })} placeholder="Paste a vault item ID" className={inputClass} />
            <p className="text-xs text-gray-500 mt-1">The item's content will be loaded as input for the next step.</p>
          </div>
        )}
      </div>
    </div>
  );
}
