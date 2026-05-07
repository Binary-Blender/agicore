import React, { useEffect, useState } from 'react';
import { useWriterStore } from '../store/writerStore';
import type { PipelineStep } from '../../shared/types';

const PRESET_PIPELINES = [
  {
    name: 'Expand & Polish',
    description: 'Expand a short passage, then polish the writing quality',
    steps: [
      { id: '1', label: 'Expand', prompt: 'Expand this text with more detail, description, and depth. Write at least 2x the original length.\n\n{{input}}' },
      { id: '2', label: 'Polish', prompt: 'Polish and refine this writing. Improve clarity, flow, and word choice while preserving the content and voice.\n\n{{input}}' },
    ],
  },
  {
    name: 'Draft → Edit → Tighten',
    description: 'Three-pass writing pipeline: draft, self-edit, then compress',
    steps: [
      { id: '1', label: 'Draft', prompt: 'Write a full scene or passage based on this prompt/outline. Focus on getting the story down with vivid details.\n\n{{input}}' },
      { id: '2', label: 'Edit', prompt: 'Edit this draft for clarity, consistency, and engagement. Fix any awkward phrasing, pacing issues, or weak passages.\n\n{{input}}' },
      { id: '3', label: 'Tighten', prompt: 'Tighten this text. Remove unnecessary words, redundancies, and filler. Make every sentence count while preserving voice.\n\n{{input}}' },
    ],
  },
  {
    name: 'Show Don\'t Tell → Dialogue Polish',
    description: 'Convert telling to showing, then refine dialogue',
    steps: [
      { id: '1', label: 'Show Don\'t Tell', prompt: 'Rewrite this passage using "show don\'t tell." Replace abstract statements with concrete sensory details, actions, and dialogue.\n\n{{input}}' },
      { id: '2', label: 'Dialogue Polish', prompt: 'Polish all dialogue in this passage. Make each character sound distinct and natural. Keep the action and description as-is.\n\n{{input}}' },
    ],
  },
  {
    name: 'Outline → Scene → Refine',
    description: 'Turn outline beats into a full, polished scene',
    steps: [
      { id: '1', label: 'Scene Draft', prompt: 'Write a complete, vivid scene from these outline beats. Include sensory details, dialogue, and emotional depth.\n\n{{input}}' },
      { id: '2', label: 'Deepen', prompt: 'Deepen this scene with more interiority, subtext in dialogue, and layered sensory details. Add emotional complexity.\n\n{{input}}' },
      { id: '3', label: 'Final Pass', prompt: 'Do a final editing pass on this scene. Fix any inconsistencies, improve pacing, and ensure the prose flows naturally.\n\n{{input}}' },
    ],
  },
];

export default function PipelinePanel() {
  const {
    pipelines,
    pipelineRunning,
    pipelineResults,
    loadPipelines,
    createPipeline,
    updatePipeline,
    deletePipeline,
    runPipeline,
    clearPipelineResults,
    setShowPipelines,
  } = useWriterStore();

  const [activeTab, setActiveTab] = useState<'run' | 'build'>('run');
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');

  // Builder state
  const [builderName, setBuilderName] = useState('');
  const [builderDesc, setBuilderDesc] = useState('');
  const [builderSteps, setBuilderSteps] = useState<PipelineStep[]>([
    { id: '1', label: 'Step 1', prompt: '{{input}}' },
  ]);
  const [editingPipelineId, setEditingPipelineId] = useState<string | null>(null);

  useEffect(() => {
    loadPipelines();
  }, []);

  const handleRun = async () => {
    if (!selectedPipelineId || !inputText.trim()) return;
    await runPipeline(selectedPipelineId, inputText.trim());
  };

  const handleAcceptFinal = () => {
    if (pipelineResults.length === 0) return;
    const finalResult = pipelineResults[pipelineResults.length - 1];
    if (finalResult.error || !finalResult.content) return;

    const editor = (window as any).__tiptapEditor;
    if (!editor) return;
    editor.chain().focus().insertContent(finalResult.content).run();
  };

  const handleGetSelectedText = () => {
    const editor = (window as any).__tiptapEditor;
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from !== to) {
      setInputText(editor.state.doc.textBetween(from, to));
    }
  };

  const addStep = () => {
    const newId = String(builderSteps.length + 1);
    setBuilderSteps([...builderSteps, { id: newId, label: `Step ${newId}`, prompt: '{{input}}' }]);
  };

  const removeStep = (idx: number) => {
    if (builderSteps.length <= 1) return;
    setBuilderSteps(builderSteps.filter((_, i) => i !== idx));
  };

  const updateStep = (idx: number, field: 'label' | 'prompt', value: string) => {
    setBuilderSteps(builderSteps.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const handleSavePipeline = async () => {
    if (!builderName.trim() || builderSteps.length === 0) return;
    if (editingPipelineId) {
      await updatePipeline(editingPipelineId, {
        name: builderName.trim(),
        description: builderDesc.trim(),
        steps: builderSteps,
      });
    } else {
      await createPipeline({
        name: builderName.trim(),
        description: builderDesc.trim(),
        steps: builderSteps,
      });
    }
    resetBuilder();
  };

  const handleEditPipeline = (id: string) => {
    const p = pipelines.find((p) => p.id === id);
    if (!p || p.isPreset) return;
    setBuilderName(p.name);
    setBuilderDesc(p.description);
    setBuilderSteps(p.steps);
    setEditingPipelineId(id);
    setActiveTab('build');
  };

  const handleCreatePreset = async (preset: typeof PRESET_PIPELINES[0]) => {
    await createPipeline(preset);
  };

  const resetBuilder = () => {
    setBuilderName('');
    setBuilderDesc('');
    setBuilderSteps([{ id: '1', label: 'Step 1', prompt: '{{input}}' }]);
    setEditingPipelineId(null);
  };

  const selectedPipeline = pipelines.find((p) => p.id === selectedPipelineId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[var(--bg-panel)] rounded-lg border border-[var(--border)] w-[750px] max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] shrink-0">
          <h2 className="text-sm font-semibold text-surface-200">Transformation Pipelines</h2>
          <button
            onClick={() => setShowPipelines(false)}
            className="text-surface-500 hover:text-surface-300 text-sm"
          >
            Close
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-[var(--border)] shrink-0">
          <button
            onClick={() => setActiveTab('run')}
            className={`px-3 py-1 text-xs rounded ${
              activeTab === 'run' ? 'bg-primary-600/30 text-primary-300' : 'text-surface-400 hover:text-surface-200'
            }`}
          >
            Run Pipeline
          </button>
          <button
            onClick={() => setActiveTab('build')}
            className={`px-3 py-1 text-xs rounded ${
              activeTab === 'build' ? 'bg-primary-600/30 text-primary-300' : 'text-surface-400 hover:text-surface-200'
            }`}
          >
            Build Pipeline
          </button>
        </div>

        {activeTab === 'run' ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Pipeline selector */}
            <div>
              <label className="text-xs text-surface-500 block mb-1">Select Pipeline</label>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {pipelines.length === 0 ? (
                  <div className="text-xs text-surface-500 py-2">
                    No pipelines yet. Create one in the Build tab, or add a preset:
                    <div className="flex flex-wrap gap-1 mt-2">
                      {PRESET_PIPELINES.map((preset, i) => (
                        <button
                          key={i}
                          onClick={() => handleCreatePreset(preset)}
                          className="px-2 py-1 text-[10px] bg-accent-600/20 text-accent-400 hover:bg-accent-600/30 rounded"
                        >
                          + {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  pipelines.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPipelineId(p.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer ${
                        selectedPipelineId === p.id
                          ? 'bg-primary-600/20 ring-1 ring-primary-500/30'
                          : 'bg-[var(--bg-page)] hover:bg-white/5'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-surface-200 font-medium">{p.name}</div>
                        {p.description && (
                          <div className="text-[10px] text-surface-500 truncate">{p.description}</div>
                        )}
                      </div>
                      <span className="text-[10px] text-surface-600 shrink-0">
                        {p.steps.length} steps
                      </span>
                      {!p.isPreset && (
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEditPipeline(p.id); }}
                            className="text-[10px] text-surface-500 hover:text-surface-300"
                          >
                            Edit
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); if (confirm('Delete pipeline?')) deletePipeline(p.id); }}
                            className="text-[10px] text-red-400 hover:text-red-300"
                          >
                            Del
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Step preview */}
            {selectedPipeline && (
              <div>
                <label className="text-xs text-surface-500 block mb-1">Pipeline Steps</label>
                <div className="flex items-center gap-1">
                  {selectedPipeline.steps.map((step, i) => (
                    <React.Fragment key={step.id}>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-primary-600/20 text-primary-300">
                        {step.label}
                      </span>
                      {i < selectedPipeline.steps.length - 1 && (
                        <span className="text-surface-600 text-xs">&rarr;</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}

            {/* Input text */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-surface-500">Input Text</label>
                <button
                  onClick={handleGetSelectedText}
                  className="text-[10px] text-primary-400 hover:text-primary-300"
                >
                  Use Selection
                </button>
              </div>
              <textarea
                className="w-full bg-[var(--bg-page)] text-surface-200 rounded px-3 py-2 text-xs border border-[var(--border)] focus:border-primary-500 focus:outline-none resize-none h-24"
                placeholder="Enter text or use editor selection..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
            </div>

            {/* Run button */}
            <button
              onClick={handleRun}
              disabled={!selectedPipelineId || !inputText.trim() || pipelineRunning}
              className="w-full py-2 bg-primary-600 hover:bg-primary-500 disabled:bg-surface-700 disabled:text-surface-500 text-white text-sm rounded transition-colors"
            >
              {pipelineRunning ? 'Running Pipeline...' : 'Run Pipeline'}
            </button>

            {/* Results */}
            {pipelineResults.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-surface-500">Results</label>
                  <button
                    onClick={clearPipelineResults}
                    className="text-[10px] text-surface-600 hover:text-surface-400"
                  >
                    Clear
                  </button>
                </div>
                <div className="space-y-2">
                  {pipelineResults.map((result, i) => (
                    <div key={i} className="bg-[var(--bg-page)] rounded border border-[var(--border)] p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-600/20 text-primary-300">
                          {result.stepLabel}
                        </span>
                        <span className="text-[10px] text-surface-600">{result.tokens}t</span>
                      </div>
                      {result.error ? (
                        <div className="text-xs text-red-400">Error: {result.error}</div>
                      ) : (
                        <div className="text-xs text-surface-300 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                          {result.content}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {!pipelineResults[pipelineResults.length - 1]?.error && (
                  <button
                    onClick={handleAcceptFinal}
                    className="w-full mt-2 py-1.5 bg-green-600/20 text-green-400 hover:bg-green-600/30 text-xs rounded transition-colors"
                  >
                    Accept Final Result & Insert
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Build tab */
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div>
              <label className="text-xs text-surface-500 block mb-1">Pipeline Name</label>
              <input
                className="w-full bg-[var(--bg-page)] text-surface-200 rounded px-3 py-2 text-sm border border-[var(--border)] focus:border-primary-500 focus:outline-none"
                placeholder="e.g. My Custom Pipeline"
                value={builderName}
                onChange={(e) => setBuilderName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs text-surface-500 block mb-1">Description</label>
              <input
                className="w-full bg-[var(--bg-page)] text-surface-200 rounded px-3 py-2 text-xs border border-[var(--border)] focus:border-primary-500 focus:outline-none"
                placeholder="What does this pipeline do?"
                value={builderDesc}
                onChange={(e) => setBuilderDesc(e.target.value)}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-surface-500">Steps</label>
                <button
                  onClick={addStep}
                  className="text-[10px] text-primary-400 hover:text-primary-300"
                >
                  + Add Step
                </button>
              </div>
              <p className="text-[10px] text-surface-600 mb-2">
                Use {'{{input}}'} in prompts — it gets replaced with the previous step's output (or the initial input for step 1).
              </p>
              <div className="space-y-2">
                {builderSteps.map((step, i) => (
                  <div key={i} className="bg-[var(--bg-page)] rounded border border-[var(--border)] p-2.5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] text-surface-600 shrink-0">#{i + 1}</span>
                      <input
                        className="flex-1 bg-[var(--bg-panel)] text-surface-200 rounded px-2 py-1 text-xs border border-[var(--border)] focus:border-primary-500 focus:outline-none"
                        placeholder="Step label..."
                        value={step.label}
                        onChange={(e) => updateStep(i, 'label', e.target.value)}
                      />
                      {builderSteps.length > 1 && (
                        <button
                          onClick={() => removeStep(i)}
                          className="text-[10px] text-red-400 hover:text-red-300 shrink-0"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <textarea
                      className="w-full bg-[var(--bg-panel)] text-surface-200 rounded px-2 py-1.5 text-xs border border-[var(--border)] focus:border-primary-500 focus:outline-none resize-none h-16"
                      placeholder="Prompt for this step... Use {{input}} for the text to transform."
                      value={step.prompt}
                      onChange={(e) => updateStep(i, 'prompt', e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Preset templates */}
            {!editingPipelineId && (
              <div>
                <label className="text-xs text-surface-500 block mb-1">Or start from a template</label>
                <div className="flex flex-wrap gap-1">
                  {PRESET_PIPELINES.map((preset, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setBuilderName(preset.name);
                        setBuilderDesc(preset.description);
                        setBuilderSteps(preset.steps);
                      }}
                      className="px-2 py-1 text-[10px] bg-accent-600/20 text-accent-400 hover:bg-accent-600/30 rounded"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleSavePipeline}
                disabled={!builderName.trim() || builderSteps.length === 0}
                className="flex-1 py-2 bg-primary-600 hover:bg-primary-500 disabled:bg-surface-700 disabled:text-surface-500 text-white text-sm rounded transition-colors"
              >
                {editingPipelineId ? 'Update Pipeline' : 'Save Pipeline'}
              </button>
              {editingPipelineId && (
                <button
                  onClick={resetBuilder}
                  className="px-4 py-2 text-surface-400 hover:text-surface-200 text-sm"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
