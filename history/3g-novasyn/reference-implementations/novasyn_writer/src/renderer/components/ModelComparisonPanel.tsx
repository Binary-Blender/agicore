import React, { useState } from 'react';
import { useWriterStore } from '../store/writerStore';

const AI_TOOLS = [
  { id: 'continue', label: 'Continue', prompt: 'Continue writing from where the text left off. Maintain the same style, tone, and voice. Write 2-3 paragraphs.' },
  { id: 'expand', label: 'Expand', prompt: 'Expand on the following text with more detail, description, and depth. Keep the same style and voice.' },
  { id: 'rewrite', label: 'Rewrite', prompt: 'Rewrite the following text to improve clarity, flow, and engagement while preserving the original meaning and voice.' },
  { id: 'brainstorm', label: 'Brainstorm', prompt: 'Help me brainstorm ideas for what could happen next in this story. Provide 3-5 creative suggestions with brief descriptions.' },
  { id: 'custom', label: 'Custom', prompt: '' },
];

export default function ModelComparisonPanel() {
  const {
    models,
    apiKeys,
    encyclopediaEntries,
    comparisonResults,
    comparisonLoading,
    compareModels,
    setShowModelComparison,
    clearComparisonResults,
  } = useWriterStore();

  const [selectedTool, setSelectedTool] = useState('continue');
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([]);
  const [pickedIndex, setPickedIndex] = useState<number | null>(null);

  const availableModels = models.filter((m) => apiKeys[m.provider]);

  const toggleModel = (id: string) => {
    setSelectedModelIds((prev) => {
      if (prev.includes(id)) return prev.filter((m) => m !== id);
      if (prev.length >= 3) return prev; // max 3
      return [...prev, id];
    });
  };

  const toggleEntry = (id: string) => {
    setSelectedEntryIds((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id],
    );
  };

  const handleCompare = async () => {
    if (selectedModelIds.length < 2) return;

    const tool = AI_TOOLS.find((t) => t.id === selectedTool);
    if (!tool) return;

    let prompt = selectedTool === 'custom' ? customPrompt : tool.prompt;
    if (!prompt.trim()) return;

    // Get selected text from editor if available
    const editor = (window as any).__tiptapEditor;
    if (editor) {
      const { from, to } = editor.state.selection;
      if (from !== to) {
        const selectedText = editor.state.doc.textBetween(from, to);
        prompt = `${prompt}\n\nSelected text:\n${selectedText}`;
      }
    }

    setPickedIndex(null);
    await compareModels(prompt, selectedModelIds, selectedEntryIds, selectedTool);
  };

  const handleAcceptResult = (index: number) => {
    const result = comparisonResults[index];
    if (!result || result.error) return;

    const editor = (window as any).__tiptapEditor;
    if (!editor) return;

    editor.chain().focus().insertContent(result.content).run();

    // Mark the operation as accepted
    if (result.operationId) {
      window.electronAPI.updateAiOperation(result.operationId, { accepted: 1 }).catch(() => {});
    }

    setPickedIndex(index);
  };

  const handleRate = async (operationId: string | undefined, rating: number) => {
    if (!operationId) return;
    await window.electronAPI.updateAiOperation(operationId, { rating });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[var(--bg-panel)] rounded-lg border border-[var(--border)] w-[900px] max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] shrink-0">
          <h2 className="text-sm font-semibold text-surface-200">Model Comparison</h2>
          <button
            onClick={() => setShowModelComparison(false)}
            className="text-surface-500 hover:text-surface-300 text-sm"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Model selector */}
          <div>
            <label className="text-xs text-surface-500 block mb-1">
              Select 2-3 models to compare
            </label>
            <div className="flex flex-wrap gap-1.5">
              {availableModels.map((m) => (
                <button
                  key={m.id}
                  onClick={() => toggleModel(m.id)}
                  className={`px-2.5 py-1 text-xs rounded transition-colors ${
                    selectedModelIds.includes(m.id)
                      ? 'bg-primary-600/30 text-primary-300 ring-1 ring-primary-500/50'
                      : 'bg-[var(--bg-page)] text-surface-400 hover:text-surface-200'
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>
            {selectedModelIds.length > 0 && (
              <p className="text-[10px] text-surface-600 mt-1">
                {selectedModelIds.length}/3 selected
              </p>
            )}
          </div>

          {/* Writing tool selector */}
          <div>
            <label className="text-xs text-surface-500 block mb-1">Writing Tool</label>
            <div className="flex flex-wrap gap-1">
              {AI_TOOLS.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => setSelectedTool(tool.id)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    selectedTool === tool.id
                      ? 'bg-primary-600/30 text-primary-300'
                      : 'bg-[var(--bg-page)] text-surface-400 hover:text-surface-200'
                  }`}
                >
                  {tool.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom prompt */}
          {selectedTool === 'custom' && (
            <div>
              <textarea
                className="w-full bg-[var(--bg-page)] text-surface-200 rounded px-2 py-1.5 text-xs border border-[var(--border)] focus:border-primary-500 focus:outline-none resize-none h-20"
                placeholder="Enter your prompt..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
              />
            </div>
          )}

          {/* Context entries */}
          {encyclopediaEntries.length > 0 && (
            <div>
              <label className="text-xs text-surface-500 block mb-1">Include Context</label>
              <div className="max-h-24 overflow-y-auto space-y-0.5">
                {encyclopediaEntries.map((entry) => (
                  <label
                    key={entry.id}
                    className="flex items-center gap-2 px-2 py-1 text-xs text-surface-400 hover:bg-white/5 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedEntryIds.includes(entry.id)}
                      onChange={() => toggleEntry(entry.id)}
                      className="rounded"
                    />
                    <span className="truncate">{entry.name}</span>
                    <span className="text-surface-600 shrink-0 ml-auto">{entry.tokens}t</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Compare button */}
          <button
            onClick={handleCompare}
            disabled={
              selectedModelIds.length < 2 ||
              comparisonLoading ||
              (selectedTool === 'custom' && !customPrompt.trim())
            }
            className="w-full py-2 bg-primary-600 hover:bg-primary-500 disabled:bg-surface-700 disabled:text-surface-500 text-white text-sm rounded transition-colors"
          >
            {comparisonLoading
              ? 'Comparing...'
              : `Compare ${selectedModelIds.length} Models`}
          </button>

          {/* Results side by side */}
          {comparisonResults.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-surface-500">Results</label>
                <button
                  onClick={clearComparisonResults}
                  className="text-[10px] text-surface-600 hover:text-surface-400"
                >
                  Clear
                </button>
              </div>
              <div className={`grid gap-3 ${
                comparisonResults.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
              }`}>
                {comparisonResults.map((result, idx) => (
                  <div
                    key={idx}
                    className={`bg-[var(--bg-page)] rounded border p-3 flex flex-col ${
                      pickedIndex === idx
                        ? 'border-green-500/50 ring-1 ring-green-500/30'
                        : 'border-[var(--border)]'
                    }`}
                  >
                    {/* Model header */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-surface-200">
                        {result.modelName}
                      </span>
                      <span className="text-[10px] text-surface-600">
                        {result.totalTokens}t
                      </span>
                    </div>

                    {/* Content */}
                    {result.error ? (
                      <div className="text-xs text-red-400 flex-1">
                        Error: {result.error}
                      </div>
                    ) : (
                      <div className="text-xs text-surface-300 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto flex-1 mb-2">
                        {result.content}
                      </div>
                    )}

                    {/* Actions */}
                    {!result.error && (
                      <div className="flex items-center gap-2 mt-auto pt-2 border-t border-[var(--border)]">
                        <button
                          onClick={() => handleAcceptResult(idx)}
                          disabled={pickedIndex !== null}
                          className={`flex-1 py-1 text-[10px] rounded transition-colors ${
                            pickedIndex === idx
                              ? 'bg-green-600/20 text-green-400'
                              : pickedIndex !== null
                              ? 'bg-surface-800 text-surface-600 cursor-not-allowed'
                              : 'bg-primary-600/20 text-primary-400 hover:bg-primary-600/30'
                          }`}
                        >
                          {pickedIndex === idx ? 'Accepted' : 'Accept & Insert'}
                        </button>
                        {/* Star rating */}
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => handleRate(result.operationId, star)}
                              className="text-[10px] text-surface-600 hover:text-yellow-400 transition-colors"
                            >
                              *
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
