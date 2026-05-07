import React, { useState, useCallback } from 'react';
import { useWriterStore } from '../store/writerStore';
import type { PresetValidationResult } from '../../shared/types';

const PRESETS = [
  { id: 'kdp', name: 'Kindle Direct Publishing', platform: 'Amazon KDP', format: 'epub' as const, color: 'bg-orange-600/20 text-orange-300', description: 'Amazon Kindle eBooks. EPUB format, requires TOC and title page.' },
  { id: 'ingram', name: 'IngramSpark', platform: 'IngramSpark', format: 'epub' as const, color: 'bg-blue-600/20 text-blue-300', description: 'Wide distribution. EPUB format, requires ISBN, TOC, and title page.' },
  { id: 'd2d', name: 'Draft2Digital', platform: 'Draft2Digital', format: 'epub' as const, color: 'bg-purple-600/20 text-purple-300', description: 'Multi-retailer distribution. EPUB format, requires TOC.' },
  { id: 'smashwords', name: 'Smashwords', platform: 'Smashwords', format: 'epub' as const, color: 'bg-cyan-600/20 text-cyan-300', description: 'eBook retailer. EPUB format, requires TOC and title page. Max 500k words.' },
  { id: 'blog', name: 'Blog Post', platform: 'Blog', format: 'html' as const, color: 'bg-green-600/20 text-green-300', description: 'Web publishing. HTML format. 300-10,000 words.' },
];

export default function PublishingPresetsPanel() {
  const { currentProject, setShowPublishingPresets } = useWriterStore();
  const [validationResults, setValidationResults] = useState<Record<string, PresetValidationResult>>({});
  const [validating, setValidating] = useState<string | null>(null);

  const handleValidate = useCallback(async (presetId: string) => {
    if (!currentProject) return;
    setValidating(presetId);
    try {
      const result = await window.electronAPI.validatePublishingPreset(currentProject.id, presetId);
      setValidationResults(prev => ({ ...prev, [presetId]: result }));
    } catch (err) {
      console.error('Validation failed:', err);
    }
    setValidating(null);
  }, [currentProject]);

  const handleExport = useCallback(async (presetId: string) => {
    if (!currentProject) return;
    const preset = PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    const options: any = {
      format: preset.format,
      scope: 'all' as const,
      includeTitlePage: true,
      includeToc: true,
    };
    await window.electronAPI.exportProject(currentProject.id, options);
  }, [currentProject]);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#16213e] rounded-lg border border-[var(--border)] w-[680px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between shrink-0">
          <h2 className="text-sm font-semibold text-surface-200">Publishing Presets</h2>
          <button onClick={() => setShowPublishingPresets(false)} className="text-surface-500 hover:text-surface-300">x</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {PRESETS.map(preset => {
            const result = validationResults[preset.id];
            return (
              <div key={preset.id} className="bg-[#1a1a2e]/80 border border-[var(--border)] rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-xs rounded ${preset.color}`}>{preset.platform}</span>
                      <span className="text-sm font-medium text-surface-200">{preset.name}</span>
                    </div>
                    <p className="text-xs text-surface-500 mt-1">{preset.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleValidate(preset.id)}
                      disabled={validating === preset.id}
                      className="px-3 py-1 text-xs bg-primary-600/20 text-primary-300 hover:bg-primary-600/30 rounded transition-colors disabled:opacity-50"
                    >
                      {validating === preset.id ? 'Checking...' : 'Validate'}
                    </button>
                    <button
                      onClick={() => handleExport(preset.id)}
                      className="px-3 py-1 text-xs bg-primary-600 text-white hover:bg-primary-500 rounded transition-colors"
                    >
                      Export {preset.format.toUpperCase()}
                    </button>
                  </div>
                </div>

                {/* Validation Results */}
                {result && (
                  <div className={`mt-3 p-3 rounded border ${result.passed ? 'border-green-500/30 bg-green-600/10' : 'border-red-500/30 bg-red-600/10'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs font-semibold ${result.passed ? 'text-green-400' : 'text-red-400'}`}>
                        {result.passed ? 'All checks passed' : 'Some checks failed'}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {result.checks.map((check, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <span className={check.passed ? 'text-green-400' : 'text-red-400'}>
                            {check.passed ? '✓' : '✗'}
                          </span>
                          <span className="text-surface-400">
                            <span className="font-medium text-surface-300">{check.label}:</span> {check.detail}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--border)] flex justify-end shrink-0">
          <button
            onClick={() => setShowPublishingPresets(false)}
            className="px-3 py-1.5 text-xs text-surface-400 hover:text-surface-200 rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
