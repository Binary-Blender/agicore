import React, { useState, useEffect, useRef } from 'react';
import { useForgeStore } from '../store/forgeStore';
import { PIPELINE_STEPS } from '../../shared/types';
import type { Feature, CreateFeatureInput, FeatureStep } from '../../shared/types';

function toTableName(entityName: string): string {
  return entityName
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '')
    + 's';
}

const STATUS_COLORS: Record<Feature['status'], string> = {
  in_progress: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  complete: 'text-green-400 bg-green-500/10 border-green-500/20',
  paused: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
};

const STATUS_LABELS: Record<Feature['status'], string> = {
  in_progress: 'In Progress',
  complete: 'Complete',
  paused: 'Paused',
};

export function FeaturePipeline() {
  const {
    currentProjectId,
    features,
    currentFeatureId,
    featureSteps,
    isGenerating,
    streamingText,
    setCurrentFeatureId,
    setFeatureSteps,
    addFeature,
    removeFeature,
    updateFeature,
    addOrUpdateFeatureStep,
    setIsGenerating,
    setStreamingText,
    appendStreamingText,
  } = useForgeStore();

  const [showNewForm, setShowNewForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formEntityName, setFormEntityName] = useState('');
  const [formTableName, setFormTableName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [generatingStepNumber, setGeneratingStepNumber] = useState<number | null>(null);
  const streamingRef = useRef<HTMLPreElement>(null);

  const currentFeature = features.find((f) => f.id === currentFeatureId);

  // Auto-derive table name from entity name
  useEffect(() => {
    if (formEntityName) {
      setFormTableName(toTableName(formEntityName));
    } else {
      setFormTableName('');
    }
  }, [formEntityName]);

  // Load feature steps when a feature is selected
  useEffect(() => {
    if (currentFeatureId) {
      loadFeatureSteps(currentFeatureId);
    } else {
      setFeatureSteps([]);
    }
  }, [currentFeatureId]);

  // Subscribe to streaming deltas for generation preview
  useEffect(() => {
    const unsubscribe = window.electronAPI.onChatDelta((text: string) => {
      if (isGenerating) {
        appendStreamingText(text);
      }
    });
    return unsubscribe;
  }, [isGenerating]);

  // Auto-scroll streaming preview
  useEffect(() => {
    if (streamingRef.current) {
      streamingRef.current.scrollTop = streamingRef.current.scrollHeight;
    }
  }, [streamingText]);

  async function loadFeatureSteps(featureId: string) {
    try {
      const steps = await window.electronAPI.getFeatureSteps(featureId);
      setFeatureSteps(steps);
    } catch (err) {
      console.error('Failed to load feature steps:', err);
    }
  }

  function resetForm() {
    setFormName('');
    setFormDescription('');
    setFormEntityName('');
    setFormTableName('');
    setShowNewForm(false);
  }

  async function handleCreate() {
    if (!formName.trim() || !formEntityName.trim() || !currentProjectId) return;
    setIsCreating(true);
    try {
      const input: CreateFeatureInput = {
        projectId: currentProjectId,
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        entityName: formEntityName.trim(),
        tableName: formTableName.trim(),
      };
      const feature = await window.electronAPI.createFeature(input);
      addFeature(feature);
      setCurrentFeatureId(feature.id);
      resetForm();
    } catch (err) {
      console.error('Failed to create feature:', err);
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await window.electronAPI.deleteFeature(id);
      removeFeature(id);
      setConfirmDelete(null);
    } catch (err) {
      console.error('Failed to delete feature:', err);
    }
  }

  function toggleStep(stepNumber: number) {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepNumber)) {
        next.delete(stepNumber);
      } else {
        next.add(stepNumber);
      }
      return next;
    });
  }

  async function handleGenerate(featureId: string, stepNumber: number) {
    if (isGenerating) return;
    setIsGenerating(true);
    setStreamingText('');
    setGeneratingStepNumber(stepNumber);
    setExpandedSteps((prev) => new Set(prev).add(stepNumber));

    try {
      const step = await window.electronAPI.generateStep(featureId, stepNumber);
      addOrUpdateFeatureStep(step);
      updateFeature(featureId, { currentStep: stepNumber });
    } catch (err) {
      console.error('Failed to generate step:', err);
    } finally {
      setIsGenerating(false);
      setStreamingText('');
      setGeneratingStepNumber(null);
    }
  }

  async function handleApply(stepId: string) {
    try {
      const updatedStep = await window.electronAPI.applyStep(stepId);
      addOrUpdateFeatureStep(updatedStep);
    } catch (err) {
      console.error('Failed to apply step:', err);
    }
  }

  function getStepData(stepNumber: number): FeatureStep | undefined {
    return featureSteps.find((fs) => fs.stepNumber === stepNumber);
  }

  function getStepStatus(stepNumber: number): 'applied' | 'generated' | 'pending' {
    const step = getStepData(stepNumber);
    if (!step) return 'pending';
    if (step.isApplied) return 'applied';
    return 'generated';
  }

  function getNextGenerateStep(): number | null {
    if (!currentFeature) return null;
    for (const ps of PIPELINE_STEPS) {
      const status = getStepStatus(ps.number);
      if (status === 'pending') return ps.number;
    }
    return null;
  }

  const nextStep = getNextGenerateStep();

  return (
    <div className="flex h-full">
      {/* Left panel — feature list */}
      <div className="w-64 flex-shrink-0 border-r border-slate-700 flex flex-col bg-slate-900/50">
        {/* New Feature button */}
        <div className="p-3 border-b border-slate-700">
          {!showNewForm ? (
            <button
              onClick={() => setShowNewForm(true)}
              className="w-full text-xs bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded-lg transition"
            >
              + New Feature
            </button>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Feature name *"
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500"
              />
              <input
                type="text"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Description (optional)"
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500"
              />
              <input
                type="text"
                value={formEntityName}
                onChange={(e) => setFormEntityName(e.target.value)}
                placeholder="Entity name (PascalCase) *"
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500"
              />
              <input
                type="text"
                value={formTableName}
                onChange={(e) => setFormTableName(e.target.value)}
                placeholder="Table name (auto-derived)"
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-gray-400 placeholder-gray-600 focus:outline-none focus:border-amber-500"
                readOnly
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCreate}
                  disabled={!formName.trim() || !formEntityName.trim() || isCreating}
                  className="flex-1 text-xs bg-amber-600 hover:bg-amber-700 disabled:bg-amber-600/50 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded transition"
                >
                  {isCreating ? 'Creating...' : 'Create'}
                </button>
                <button
                  onClick={resetForm}
                  className="text-xs text-gray-400 hover:text-white px-2 py-1.5 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Feature list */}
        <div className="flex-1 overflow-y-auto">
          {features.length === 0 ? (
            <div className="px-3 py-6 text-xs text-gray-500 text-center">
              No features yet
            </div>
          ) : (
            features.map((feat) => (
              <div
                key={feat.id}
                onClick={() => setCurrentFeatureId(feat.id)}
                className={`px-3 py-2.5 cursor-pointer border-b border-slate-800 group transition ${
                  currentFeatureId === feat.id
                    ? 'bg-slate-800'
                    : 'hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-white truncate">
                    {feat.name}
                  </span>
                  {confirmDelete === feat.id ? (
                    <div className="flex items-center gap-1 text-xs flex-shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(feat.id); }}
                        className="text-red-400 hover:text-red-300 transition"
                      >
                        Yes
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDelete(null); }}
                        className="text-gray-400 hover:text-white transition"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete(feat.id); }}
                      className="text-gray-600 hover:text-red-400 text-xs transition opacity-0 group-hover:opacity-100 flex-shrink-0"
                      title="Delete"
                    >
                      &#215;
                    </button>
                  )}
                </div>
                <div className="text-[10px] text-gray-500 mt-0.5 font-mono">
                  {feat.entityName}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${STATUS_COLORS[feat.status]}`}
                  >
                    {STATUS_LABELS[feat.status]}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    Step {feat.currentStep}/10
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right panel — pipeline steps */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!currentFeature ? (
          <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
            Select a feature or create a new one
          </div>
        ) : (
          <>
            {/* Feature header */}
            <div className="flex-shrink-0 px-5 py-3 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-semibold text-white">{currentFeature.name}</h2>
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${STATUS_COLORS[currentFeature.status]}`}
                >
                  {STATUS_LABELS[currentFeature.status]}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-gray-400">
                  Entity: <span className="font-mono text-gray-300">{currentFeature.entityName}</span>
                </span>
                <span className="text-xs text-gray-400">
                  Table: <span className="font-mono text-gray-300">{currentFeature.tableName}</span>
                </span>
              </div>
              {currentFeature.description && (
                <p className="text-xs text-gray-500 mt-1">{currentFeature.description}</p>
              )}
            </div>

            {/* Pipeline steps list */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {PIPELINE_STEPS.map((ps) => {
                const status = getStepStatus(ps.number);
                const stepData = getStepData(ps.number);
                const isExpanded = expandedSteps.has(ps.number);
                const isCurrentlyGenerating = isGenerating && generatingStepNumber === ps.number;
                const canGenerate = !isGenerating && nextStep === ps.number;
                const canApply = status === 'generated' && !isGenerating;

                return (
                  <div
                    key={ps.number}
                    className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden transition hover:border-slate-600"
                  >
                    {/* Step header */}
                    <button
                      onClick={() => (stepData || isCurrentlyGenerating) && toggleStep(ps.number)}
                      className={`w-full flex items-center justify-between px-4 py-3 text-left ${
                        (stepData || isCurrentlyGenerating) ? 'cursor-pointer' : 'cursor-default'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Status icon */}
                        <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                          {status === 'applied' && (
                            <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          {status === 'generated' && (
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                          )}
                          {status === 'pending' && !isCurrentlyGenerating && (
                            <span className="w-2.5 h-2.5 rounded-full border-2 border-gray-600" />
                          )}
                          {isCurrentlyGenerating && (
                            <svg className="animate-spin w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          )}
                        </span>

                        {/* Step label */}
                        <span className={`text-sm font-medium ${
                          status === 'applied' ? 'text-green-400' :
                          status === 'generated' ? 'text-amber-400' :
                          'text-gray-400'
                        }`}>
                          {ps.number}. {ps.label}
                        </span>
                      </div>

                      {/* Right side — status badge + action buttons */}
                      <div className="flex items-center gap-2">
                        {status === 'applied' && (
                          <span className="text-[10px] font-medium text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded">
                            Applied
                          </span>
                        )}
                        {status === 'generated' && (
                          <span className="text-[10px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                            Ready
                          </span>
                        )}
                        {status === 'pending' && !isCurrentlyGenerating && (
                          <span className="text-[10px] font-medium text-gray-500 bg-slate-700/50 px-2 py-0.5 rounded">
                            Not Generated
                          </span>
                        )}
                        {isCurrentlyGenerating && (
                          <span className="text-[10px] font-medium text-amber-400 animate-pulse">
                            Generating...
                          </span>
                        )}

                        {/* Expand/collapse indicator */}
                        {(stepData || isCurrentlyGenerating) && (
                          <svg
                            className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        )}
                      </div>
                    </button>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="border-t border-slate-700">
                        {/* Code preview */}
                        {isCurrentlyGenerating && streamingText ? (
                          <pre
                            ref={streamingRef}
                            className="bg-slate-950 text-sm font-mono text-gray-300 p-4 overflow-x-auto max-h-80 overflow-y-auto"
                          >
                            <code>{streamingText}</code>
                          </pre>
                        ) : isCurrentlyGenerating && !streamingText ? (
                          <div className="bg-slate-950 p-4">
                            <span className="text-sm text-gray-400 animate-pulse">Generating code...</span>
                          </div>
                        ) : stepData ? (
                          <pre className="bg-slate-950 text-sm font-mono text-gray-300 p-4 overflow-x-auto max-h-80 overflow-y-auto">
                            <code>{stepData.generatedCode}</code>
                          </pre>
                        ) : null}

                        {/* Action buttons */}
                        {(canGenerate || canApply) && (
                          <div className="px-4 py-2.5 bg-slate-800/50 flex items-center gap-2">
                            {canApply && (
                              <button
                                onClick={() => handleApply(stepData!.id)}
                                className="text-xs bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-lg transition font-medium"
                              >
                                Apply Step
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Generate button for the next pending step */}
                    {canGenerate && (
                      <div className="border-t border-slate-700 px-4 py-2.5">
                        <button
                          onClick={() => handleGenerate(currentFeature.id, ps.number)}
                          className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-4 py-1.5 rounded-lg transition font-medium"
                        >
                          Generate
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
