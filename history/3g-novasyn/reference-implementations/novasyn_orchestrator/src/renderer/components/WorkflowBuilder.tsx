import React, { useState, useEffect } from 'react';
import type { Workflow, WorkflowRow, ModuleConfig, ModuleType } from '../../shared/types';

interface Props {
  workflow?: Workflow;
  onClose: () => void;
  onSaved: (workflow: Workflow) => void;
  onRun: (workflowId: string) => void;
}

// ---------- Module type metadata ----------

interface ModuleTypeMeta {
  type: ModuleType;
  label: string;
  description: string;
  icon: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
}

const MODULE_TYPES: ModuleTypeMeta[] = [
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
    type: 'cross_app_action',
    label: 'Cross-App Action',
    description: 'Invoke a macro on another NovaSyn app',
    icon: '\u2194',
    bgClass: 'bg-indigo-500/20',
    borderClass: 'border-indigo-500',
    textClass: 'text-indigo-400',
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

function getModuleMeta(type: ModuleType): ModuleTypeMeta {
  return MODULE_TYPES.find((m) => m.type === type) ?? MODULE_TYPES[0];
}

function generateId(): string {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

function createEmptyModule(type: ModuleType): ModuleConfig {
  const meta = getModuleMeta(type);
  return {
    id: generateId(),
    type,
    name: meta.label,
    config: {},
  };
}

function createEmptyRow(level: number): WorkflowRow {
  return {
    id: generateId(),
    level,
    modules: [],
  };
}

function getModuleSummary(mod: ModuleConfig): string {
  switch (mod.type) {
    case 'ai_action': {
      const parts: string[] = [];
      if (mod.config.model) parts.push(mod.config.model);
      if (mod.config.inputSource) parts.push(`input: ${mod.config.inputSource}`);
      if (mod.config.saveToVault) parts.push('save to vault');
      return parts.join(' \u00B7 ') || 'Not configured';
    }
    case 'cross_app_action': {
      if (mod.targetApp && mod.macro) {
        return `${mod.targetApp} \u2192 ${mod.macro}`;
      }
      return 'Not configured';
    }
    case 'qc_checkpoint':
      return mod.config.qcDescription?.slice(0, 50) || 'No description';
    case 'transform': {
      const labels: Record<string, string> = {
        extract_json: 'Extract JSON',
        format_text: 'Format text',
        regex: 'Regex',
      };
      return mod.config.transformType
        ? labels[mod.config.transformType] || mod.config.transformType
        : 'Not configured';
    }
    case 'vault_save':
      return mod.config.tags?.length
        ? `Tags: ${mod.config.tags.join(', ')}`
        : 'No tags';
    case 'vault_load':
      return mod.config.vaultItemId || 'No item selected';
    default:
      return '';
  }
}

// ---------- Available Apps (for cross-app) ----------

interface AvailableApp {
  id: string;
  name: string;
  macros: { id: string; name: string; description: string }[];
}

// ---------- Component ----------

export function WorkflowBuilder({ workflow, onClose, onSaved, onRun }: Props) {
  // Workflow-level state
  const [name, setName] = useState(workflow?.name ?? 'New Workflow');
  const [description, setDescription] = useState(workflow?.description ?? '');
  const [rows, setRows] = useState<WorkflowRow[]>(
    workflow?.rows.length ? workflow.rows : [createEmptyRow(0)]
  );
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Data for config panels
  const [models, setModels] = useState<{ id: string; name: string }[]>([]);
  const [vaultTags, setVaultTags] = useState<{ id: string; name: string; color: string }[]>([]);
  const [availableApps, setAvailableApps] = useState<AvailableApp[]>([]);

  useEffect(() => {
    // Load models (try/catch for when IPC isn't wired yet)
    window.electronAPI.getApiKeys().then(() => {
      // Models would come from a getModels call; for now, use macroGetAvailable for apps
    }).catch(() => {});

    window.electronAPI.vaultGetTags().then(setVaultTags).catch(() => {});

    // Load available apps and their macros
    window.electronAPI.macroGetAvailable().then((apps: AvailableApp[]) => {
      setAvailableApps(apps || []);
    }).catch(() => {});
  }, []);

  // Find the selected module across all rows
  const selectedModule = rows.flatMap((r) => r.modules).find((m) => m.id === selectedModuleId) ?? null;
  const selectedModuleRowIndex = selectedModule
    ? rows.findIndex((r) => r.modules.some((m) => m.id === selectedModuleId))
    : -1;

  // ---- Row manipulation ----

  function addRow() {
    setRows((prev) => [...prev, createEmptyRow(prev.length)]);
  }

  function deleteRow(rowId: string) {
    setRows((prev) => {
      const filtered = prev.filter((r) => r.id !== rowId);
      // Re-number levels
      return filtered.map((r, i) => ({ ...r, level: i }));
    });
    // If selected module was in that row, deselect
    const row = rows.find((r) => r.id === rowId);
    if (row && selectedModuleId && row.modules.some((m) => m.id === selectedModuleId)) {
      setSelectedModuleId(null);
    }
  }

  function moveRow(rowId: string, direction: 'up' | 'down') {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.id === rowId);
      if (idx < 0) return prev;
      const target = direction === 'up' ? idx - 1 : idx + 1;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[target]] = [copy[target], copy[idx]];
      // Re-number levels
      return copy.map((r, i) => ({ ...r, level: i }));
    });
  }

  // ---- Module manipulation ----

  function addModuleToRow(rowId: string, type: ModuleType) {
    const mod = createEmptyModule(type);
    setRows((prev) =>
      prev.map((r) =>
        r.id === rowId ? { ...r, modules: [...r.modules, mod] } : r
      )
    );
    setSelectedModuleId(mod.id);
  }

  function addModuleToSelectedRowOrFirst(type: ModuleType) {
    // Add to the row containing the selected module, or the last row
    let targetRowId: string;
    if (selectedModuleId) {
      const row = rows.find((r) => r.modules.some((m) => m.id === selectedModuleId));
      targetRowId = row ? row.id : rows[rows.length - 1].id;
    } else {
      targetRowId = rows[rows.length - 1].id;
    }
    addModuleToRow(targetRowId, type);
  }

  function deleteModule(moduleId: string) {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        modules: r.modules.filter((m) => m.id !== moduleId),
      }))
    );
    if (selectedModuleId === moduleId) setSelectedModuleId(null);
  }

  function updateModule(moduleId: string, updates: Partial<ModuleConfig>) {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        modules: r.modules.map((m) =>
          m.id === moduleId ? { ...m, ...updates } : m
        ),
      }))
    );
  }

  function updateModuleConfig(moduleId: string, configUpdates: Partial<ModuleConfig['config']>) {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        modules: r.modules.map((m) =>
          m.id === moduleId
            ? { ...m, config: { ...m.config, ...configUpdates } }
            : m
        ),
      }))
    );
  }

  // ---- Save / Run ----

  async function handleSave() {
    setSaving(true);
    try {
      let saved: Workflow;
      if (workflow?.id) {
        saved = await window.electronAPI.workflowUpdate(workflow.id, {
          name,
          description,
          rows,
        });
      } else {
        saved = await window.electronAPI.workflowCreate({
          name,
          description,
          rows,
        });
      }
      onSaved(saved);
    } catch (err) {
      console.error('Failed to save workflow:', err);
    }
    setSaving(false);
  }

  async function handleRun() {
    setSaving(true);
    try {
      let wf: Workflow;
      if (workflow?.id) {
        wf = await window.electronAPI.workflowUpdate(workflow.id, {
          name,
          description,
          rows,
        });
      } else {
        wf = await window.electronAPI.workflowCreate({
          name,
          description,
          rows,
        });
      }
      onSaved(wf);
      onRun(wf.id);
    } catch (err) {
      console.error('Failed to save/run workflow:', err);
    }
    setSaving(false);
  }

  const totalModules = rows.reduce((sum, r) => sum + r.modules.length, 0);

  // ---------- Render ----------

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-800">
      {/* Top bar: name, description, actions */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700 bg-slate-800">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Workflow name"
          className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
        />
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="px-4 py-2 text-sm bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={handleRun}
          disabled={saving || totalModules === 0 || !name.trim()}
          className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Run'}
        </button>
      </div>

      {/* Description */}
      <div className="px-4 py-2 border-b border-slate-700">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          rows={1}
          className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-gray-300 placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
        />
      </div>

      {/* 3-column body */}
      <div className="flex flex-1 overflow-hidden">
        {/* ===== Left Panel -- Module Palette ===== */}
        <div className="w-[200px] border-r border-slate-700 p-3 flex flex-col gap-2 overflow-y-auto bg-slate-850">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
            Module Palette
          </h3>
          {MODULE_TYPES.map((meta) => (
            <button
              key={meta.type}
              onClick={() => addModuleToSelectedRowOrFirst(meta.type)}
              className={`text-left p-2.5 rounded-lg border ${meta.bgClass} ${meta.borderClass} border-opacity-40 hover:border-opacity-80 transition cursor-pointer`}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-base">{meta.icon}</span>
                <span className={`text-xs font-medium ${meta.textClass}`}>{meta.label}</span>
              </div>
              <p className="text-[10px] text-gray-400 leading-snug">{meta.description}</p>
            </button>
          ))}
        </div>

        {/* ===== Center Panel -- Workflow Canvas ===== */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-700">
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {rows.map((row, rowIdx) => (
              <div
                key={row.id}
                className="rounded-lg border border-slate-600 bg-slate-800/50"
              >
                {/* Row header */}
                <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-700/50">
                  <span className="text-xs font-semibold text-purple-400">
                    Level {rowIdx + 1}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {row.modules.length} module{row.modules.length !== 1 ? 's' : ''} (parallel)
                  </span>

                  <div className="ml-auto flex items-center gap-1">
                    <button
                      onClick={() => moveRow(row.id, 'up')}
                      disabled={rowIdx === 0}
                      className="text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-default text-xs px-1"
                      title="Move row up"
                    >
                      &#9650;
                    </button>
                    <button
                      onClick={() => moveRow(row.id, 'down')}
                      disabled={rowIdx === rows.length - 1}
                      className="text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-default text-xs px-1"
                      title="Move row down"
                    >
                      &#9660;
                    </button>
                    <button
                      onClick={() => deleteRow(row.id)}
                      disabled={rows.length <= 1}
                      className="text-gray-400 hover:text-red-400 text-xs px-1 ml-1 disabled:opacity-30 disabled:cursor-default"
                      title="Delete row"
                    >
                      &times;
                    </button>
                  </div>
                </div>

                {/* Module cards -- horizontal layout */}
                <div className="flex flex-wrap gap-2 p-3 min-h-[60px]">
                  {row.modules.length === 0 ? (
                    <div className="flex items-center justify-center w-full text-gray-600 text-xs py-2">
                      Add modules from the palette or click + below
                    </div>
                  ) : (
                    row.modules.map((mod) => {
                      const meta = getModuleMeta(mod.type);
                      const isSelected = selectedModuleId === mod.id;
                      return (
                        <div
                          key={mod.id}
                          onClick={() => setSelectedModuleId(mod.id)}
                          className={`rounded-lg border p-2.5 cursor-pointer transition min-w-[160px] max-w-[220px] flex-shrink-0 ${
                            isSelected
                              ? `${meta.bgClass} ${meta.borderClass}`
                              : 'border-slate-600 bg-slate-700/50 hover:bg-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <span
                              className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${meta.bgClass} ${meta.textClass}`}
                            >
                              {meta.icon} {meta.label}
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteModule(mod.id); }}
                              className="text-gray-400 hover:text-red-400 text-xs px-0.5 ml-auto"
                              title="Delete module"
                            >
                              &times;
                            </button>
                          </div>
                          <input
                            type="text"
                            value={mod.name}
                            onChange={(e) => updateModule(mod.id, { name: e.target.value })}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full bg-transparent text-xs text-white focus:outline-none focus:bg-slate-900/50 px-1 rounded mb-1 truncate"
                          />
                          <p className="text-[10px] text-gray-400 truncate px-1">
                            {getModuleSummary(mod)}
                          </p>
                        </div>
                      );
                    })
                  )}

                  {/* Add module button within row */}
                  <button
                    onClick={() => addModuleToRow(row.id, 'ai_action')}
                    className="flex items-center justify-center min-w-[60px] h-[70px] border border-dashed border-slate-600 rounded-lg text-gray-500 hover:text-gray-300 hover:border-slate-400 transition text-lg"
                    title="Add module to this row"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}

            {/* Add Row */}
            <button
              onClick={addRow}
              className="w-full border border-dashed border-slate-600 rounded-lg py-3 text-sm text-gray-400 hover:text-white hover:border-slate-400 transition"
            >
              + Add Level
            </button>
          </div>

          {/* Bottom status */}
          <div className="px-4 py-2 border-t border-slate-700 text-xs text-gray-500 flex items-center gap-4">
            <span>{rows.length} level{rows.length !== 1 ? 's' : ''}</span>
            <span>{totalModules} module{totalModules !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* ===== Right Panel -- Module Configuration ===== */}
        <div className="w-[300px] overflow-y-auto p-4 bg-slate-800">
          {selectedModule ? (
            <ModuleConfigPanel
              module={selectedModule}
              rowIndex={selectedModuleRowIndex}
              models={models}
              vaultTags={vaultTags}
              availableApps={availableApps}
              onUpdateConfig={(updates) => updateModuleConfig(selectedModule.id, updates)}
              onUpdateModule={(updates) => updateModule(selectedModule.id, updates)}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">
              Select a module to configure it
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Module configuration sub-panel ----------

interface ModuleConfigPanelProps {
  module: ModuleConfig;
  rowIndex: number;
  models: { id: string; name: string }[];
  vaultTags: { id: string; name: string; color: string }[];
  availableApps: AvailableApp[];
  onUpdateConfig: (updates: Partial<ModuleConfig['config']>) => void;
  onUpdateModule: (updates: Partial<ModuleConfig>) => void;
}

function ModuleConfigPanel({
  module: mod,
  rowIndex,
  models,
  vaultTags,
  availableApps,
  onUpdateConfig,
  onUpdateModule,
}: ModuleConfigPanelProps) {
  const meta = getModuleMeta(mod.type);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded ${meta.bgClass} ${meta.textClass}`}
        >
          {meta.icon} {meta.label}
        </span>
        <span className="text-sm text-white font-medium truncate">{mod.name}</span>
      </div>
      <p className="text-[10px] text-gray-500 mb-4">Level {rowIndex + 1}</p>

      <div className="space-y-4">
        {mod.type === 'ai_action' && (
          <AIActionConfig module={mod} models={models} onUpdate={onUpdateConfig} />
        )}
        {mod.type === 'cross_app_action' && (
          <CrossAppActionConfig
            module={mod}
            availableApps={availableApps}
            onUpdateConfig={onUpdateConfig}
            onUpdateModule={onUpdateModule}
          />
        )}
        {mod.type === 'qc_checkpoint' && (
          <QCCheckpointConfig module={mod} onUpdate={onUpdateConfig} />
        )}
        {mod.type === 'transform' && (
          <TransformConfig module={mod} onUpdate={onUpdateConfig} />
        )}
        {mod.type === 'vault_save' && (
          <VaultSaveConfig module={mod} vaultTags={vaultTags} onUpdate={onUpdateConfig} />
        )}
        {mod.type === 'vault_load' && (
          <VaultLoadConfig module={mod} onUpdate={onUpdateConfig} />
        )}
      </div>
    </div>
  );
}

// ---------- Per-type config forms ----------

const fieldLabelClass = 'block text-xs font-medium text-gray-400 mb-1';
const inputClass =
  'w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500';
const selectClass =
  'w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500';
const textareaClass =
  'w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none';

function AIActionConfig({
  module: mod,
  models,
  onUpdate,
}: {
  module: ModuleConfig;
  models: { id: string; name: string }[];
  onUpdate: (u: Partial<ModuleConfig['config']>) => void;
}) {
  return (
    <>
      {/* Model */}
      <div>
        <label className={fieldLabelClass}>Model</label>
        <select
          value={mod.config.model ?? ''}
          onChange={(e) => onUpdate({ model: e.target.value })}
          className={selectClass}
        >
          <option value="">Select a model</option>
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      {/* Prompt template */}
      <div>
        <label className={fieldLabelClass}>Prompt Template</label>
        <textarea
          value={mod.config.promptTemplate ?? ''}
          onChange={(e) => onUpdate({ promptTemplate: e.target.value })}
          placeholder="Enter your prompt. Use {{input}} for the input from the previous level."
          rows={4}
          className={textareaClass}
        />
        <p className="text-xs text-gray-500 mt-1">
          Use <code className="text-purple-400">{'{{input}}'}</code> to reference output from the previous level.
        </p>
      </div>

      {/* Input source */}
      <div>
        <label className={fieldLabelClass}>Input Source</label>
        <div className="space-y-1.5">
          {(['previous', 'manual', 'vault'] as const).map((src) => {
            const labels = {
              previous: 'Previous level output',
              manual: 'Manual text',
              vault: 'Vault item',
            };
            return (
              <label key={src} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                  type="radio"
                  name={`input-source-${mod.id}`}
                  checked={mod.config.inputSource === src}
                  onChange={() => onUpdate({ inputSource: src })}
                  className="accent-purple-500"
                />
                {labels[src]}
              </label>
            );
          })}
        </div>
      </div>

      {/* Manual input */}
      {mod.config.inputSource === 'manual' && (
        <div>
          <label className={fieldLabelClass}>Manual Input</label>
          <textarea
            value={mod.config.manualInput ?? ''}
            onChange={(e) => onUpdate({ manualInput: e.target.value })}
            placeholder="Enter the input text..."
            rows={3}
            className={textareaClass}
          />
        </div>
      )}

      {/* Vault item */}
      {mod.config.inputSource === 'vault' && (
        <div>
          <label className={fieldLabelClass}>Vault Item ID</label>
          <input
            type="text"
            value={mod.config.vaultItemId ?? ''}
            onChange={(e) => onUpdate({ vaultItemId: e.target.value })}
            placeholder="Paste a vault item ID"
            className={inputClass}
          />
        </div>
      )}

      {/* Output type */}
      <div>
        <label className={fieldLabelClass}>Output Type</label>
        <select
          value={mod.config.outputType ?? ''}
          onChange={(e) => onUpdate({ outputType: e.target.value })}
          className={selectClass}
        >
          <option value="">Default (text)</option>
          <option value="text">Text</option>
          <option value="json">JSON</option>
          <option value="markdown">Markdown</option>
          <option value="code">Code</option>
        </select>
      </div>

      {/* Save to vault */}
      <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
        <input
          type="checkbox"
          checked={mod.config.saveToVault ?? false}
          onChange={(e) => onUpdate({ saveToVault: e.target.checked })}
          className="accent-purple-500"
        />
        Save output to Vault
      </label>
    </>
  );
}

function CrossAppActionConfig({
  module: mod,
  availableApps,
  onUpdateConfig,
  onUpdateModule,
}: {
  module: ModuleConfig;
  availableApps: AvailableApp[];
  onUpdateConfig: (u: Partial<ModuleConfig['config']>) => void;
  onUpdateModule: (u: Partial<ModuleConfig>) => void;
}) {
  const selectedApp = availableApps.find((a) => a.id === mod.targetApp);
  const macros = selectedApp?.macros ?? [];

  return (
    <>
      {/* Target App */}
      <div>
        <label className={fieldLabelClass}>Target App</label>
        <select
          value={mod.targetApp ?? ''}
          onChange={(e) => onUpdateModule({ targetApp: e.target.value, macro: '' })}
          className={selectClass}
        >
          <option value="">Select an app</option>
          {availableApps.map((app) => (
            <option key={app.id} value={app.id}>
              {app.name}
            </option>
          ))}
        </select>
        {availableApps.length === 0 && (
          <p className="text-xs text-yellow-400/80 mt-1">
            No running NovaSyn apps detected. Start another app first.
          </p>
        )}
      </div>

      {/* Macro */}
      {mod.targetApp && (
        <div>
          <label className={fieldLabelClass}>Macro</label>
          <select
            value={mod.macro ?? ''}
            onChange={(e) => onUpdateModule({ macro: e.target.value })}
            className={selectClass}
          >
            <option value="">Select a macro</option>
            {macros.map((macro) => (
              <option key={macro.id} value={macro.id}>
                {macro.name}
              </option>
            ))}
          </select>
          {macros.length === 0 && (
            <p className="text-xs text-gray-500 mt-1">
              No macros available on this app.
            </p>
          )}
        </div>
      )}

      {/* Input mapping */}
      <div>
        <label className={fieldLabelClass}>Input Mapping</label>
        <textarea
          value={mod.config.manualInput ?? ''}
          onChange={(e) => onUpdateConfig({ manualInput: e.target.value })}
          placeholder="What to pass from the previous level's output. Use {{input}} or leave empty for full output."
          rows={3}
          className={textareaClass}
        />
        <p className="text-xs text-gray-500 mt-1">
          Use <code className="text-indigo-400">{'{{input}}'}</code> to reference output from the previous level.
        </p>
      </div>

      {/* Summary label */}
      {mod.targetApp && mod.macro && (
        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg px-3 py-2 text-xs text-indigo-300">
          This step invokes <span className="font-semibold">{mod.macro}</span> on{' '}
          <span className="font-semibold">{selectedApp?.name || mod.targetApp}</span>
        </div>
      )}
    </>
  );
}

function QCCheckpointConfig({
  module: mod,
  onUpdate,
}: {
  module: ModuleConfig;
  onUpdate: (u: Partial<ModuleConfig['config']>) => void;
}) {
  return (
    <div>
      <label className={fieldLabelClass}>What should the reviewer check?</label>
      <textarea
        value={mod.config.qcDescription ?? ''}
        onChange={(e) => onUpdate({ qcDescription: e.target.value })}
        placeholder="Describe what the reviewer should look for at this checkpoint..."
        rows={6}
        className={textareaClass}
      />
    </div>
  );
}

function TransformConfig({
  module: mod,
  onUpdate,
}: {
  module: ModuleConfig;
  onUpdate: (u: Partial<ModuleConfig['config']>) => void;
}) {
  return (
    <>
      <div>
        <label className={fieldLabelClass}>Transform Type</label>
        <select
          value={mod.config.transformType ?? ''}
          onChange={(e) => onUpdate({ transformType: e.target.value })}
          className={selectClass}
        >
          <option value="">Select a type</option>
          <option value="extract_json">Extract JSON field</option>
          <option value="format_text">Format text</option>
          <option value="regex">Regex</option>
        </select>
      </div>

      <div>
        <label className={fieldLabelClass}>Pattern</label>
        <input
          type="text"
          value={mod.config.transformPattern ?? ''}
          onChange={(e) => onUpdate({ transformPattern: e.target.value })}
          placeholder={
            mod.config.transformType === 'extract_json'
              ? 'e.g. data.result'
              : mod.config.transformType === 'regex'
                ? 'e.g. /pattern/flags'
                : 'Format pattern...'
          }
          className={inputClass}
        />
        {mod.config.transformType === 'extract_json' && (
          <p className="text-xs text-gray-500 mt-1">Dot-notation path to the JSON field.</p>
        )}
        {mod.config.transformType === 'regex' && (
          <p className="text-xs text-gray-500 mt-1">Regular expression with optional flags.</p>
        )}
      </div>
    </>
  );
}

function VaultSaveConfig({
  module: mod,
  vaultTags,
  onUpdate,
}: {
  module: ModuleConfig;
  vaultTags: { id: string; name: string; color: string }[];
  onUpdate: (u: Partial<ModuleConfig['config']>) => void;
}) {
  const selectedTags = mod.config.tags ?? [];

  function toggleTag(tagName: string) {
    const updated = selectedTags.includes(tagName)
      ? selectedTags.filter((t) => t !== tagName)
      : [...selectedTags, tagName];
    onUpdate({ tags: updated });
  }

  return (
    <>
      <div>
        <label className={fieldLabelClass}>Title Template</label>
        <input
          type="text"
          value={mod.config.promptTemplate ?? ''}
          onChange={(e) => onUpdate({ promptTemplate: e.target.value })}
          placeholder="e.g. Summary -- {{date}}"
          className={inputClass}
        />
        <p className="text-xs text-gray-500 mt-1">
          Template for the vault item title.
        </p>
      </div>

      <div>
        <label className={fieldLabelClass}>Tags</label>
        {vaultTags.length === 0 ? (
          <p className="text-xs text-gray-500">No vault tags available.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {vaultTags.map((tag) => {
              const isActive = selectedTags.includes(tag.name);
              return (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.name)}
                  className={`text-xs px-2 py-1 rounded border transition ${
                    isActive
                      ? 'bg-green-500/20 border-green-500 text-green-400'
                      : 'bg-slate-700 border-slate-600 text-gray-400 hover:text-white'
                  }`}
                >
                  {tag.name}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

function VaultLoadConfig({
  module: mod,
  onUpdate,
}: {
  module: ModuleConfig;
  onUpdate: (u: Partial<ModuleConfig['config']>) => void;
}) {
  return (
    <div>
      <label className={fieldLabelClass}>Vault Item ID</label>
      <input
        type="text"
        value={mod.config.vaultItemId ?? ''}
        onChange={(e) => onUpdate({ vaultItemId: e.target.value })}
        placeholder="Paste a vault item ID"
        className={inputClass}
      />
      <p className="text-xs text-gray-500 mt-1">
        The item's content will be loaded as input for modules in this level.
      </p>
    </div>
  );
}
