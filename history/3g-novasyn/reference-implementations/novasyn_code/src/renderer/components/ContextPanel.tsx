import React, { useState, useCallback } from 'react';
import { useCodeStore } from '../store/codeStore';

/** Per-file token estimate stored locally so we can recalculate totals on remove. */
const fileTokenMap = new Map<string, number>();

function truncatePath(filePath: string): string {
  const parts = filePath.replace(/\\/g, '/').split('/');
  return parts.length <= 2 ? parts.join('/') : parts.slice(-2).join('/');
}

function formatTokens(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

export default function ContextPanel() {
  const {
    contextFiles, contextTokens, showContextPanel, tokenBudget,
    selectedFilePath, models, selectedModels, systemPrompt,
    addContextFile, removeContextFile, setContextTokens,
    setShowContextPanel, setSystemPrompt, setSelectedModels,
  } = useCodeStore();

  const [pathInput, setPathInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // ---- helpers ----
  const recalcTotal = useCallback(() => {
    let total = 0;
    for (const tokens of fileTokenMap.values()) total += tokens;
    setContextTokens(total);
  }, [setContextTokens]);

  const resolveAndAdd = useCallback(async (rawPath: string) => {
    const trimmed = rawPath.trim();
    if (!trimmed) return;

    // Build full path: if it looks absolute keep it, otherwise prepend project path
    let fullPath = trimmed;
    const project = useCodeStore.getState().projects.find(
      (p) => p.id === useCodeStore.getState().currentProjectId,
    );
    if (project && !trimmed.startsWith('/') && !trimmed.match(/^[A-Z]:\\/i)) {
      fullPath = project.path.replace(/\/$/, '') + '/' + trimmed.replace(/^\.\//, '');
    }

    // Avoid duplicates
    if (useCodeStore.getState().contextFiles.includes(fullPath)) return;

    try {
      const content: string = await (window as any).electronAPI.readFile(fullPath);
      const tokens = Math.ceil(content.length / 4);
      fileTokenMap.set(fullPath, tokens);
      addContextFile(fullPath);
      recalcTotal();
    } catch {
      // If file can't be read, still add it but with 0 tokens
      fileTokenMap.set(fullPath, 0);
      addContextFile(fullPath);
      recalcTotal();
    }
  }, [addContextFile, recalcTotal]);

  const handleRemove = useCallback((path: string) => {
    fileTokenMap.delete(path);
    removeContextFile(path);
    // Recalculate after state update
    setTimeout(() => {
      let total = 0;
      for (const tokens of fileTokenMap.values()) total += tokens;
      setContextTokens(total);
    }, 0);
  }, [removeContextFile, setContextTokens]);

  const handleAddPath = useCallback(async () => {
    if (!pathInput.trim()) return;
    setIsAdding(true);
    await resolveAndAdd(pathInput);
    setPathInput('');
    setIsAdding(false);
  }, [pathInput, resolveAndAdd]);

  const handleAddOpenFile = useCallback(async () => {
    const path = useCodeStore.getState().selectedFilePath;
    if (!path) return;
    setIsAdding(true);
    await resolveAndAdd(path);
    setIsAdding(false);
  }, [resolveAndAdd]);

  // ---- budget bar ----
  const ratio = tokenBudget > 0 ? contextTokens / tokenBudget : 0;
  const pct = Math.min(ratio * 100, 100);
  const barColor = ratio > 0.8 ? 'bg-red-500' : ratio > 0.5 ? 'bg-yellow-500' : 'bg-green-500';

  if (!showContextPanel) return null;

  return (
    <div className="w-[280px] min-w-[280px] bg-slate-900 border-l border-slate-700 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Context</span>
          <span className="text-[10px] text-slate-500">
            {contextFiles.length} file{contextFiles.length !== 1 ? 's' : ''} &middot; {formatTokens(contextTokens)} tokens
          </span>
        </div>
        <button
          onClick={() => setShowContextPanel(false)}
          className="text-slate-500 hover:text-slate-300 text-sm leading-none"
        >
          &times;
        </button>
      </div>

      {/* Token budget bar */}
      <div className="px-3 py-2 border-b border-slate-800">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-slate-500">Token budget</span>
          <span className="text-[10px] text-slate-500">
            {formatTokens(contextTokens)} / {formatTokens(tokenBudget)}
          </span>
        </div>
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Attached files list */}
      <div className="flex-1 overflow-y-auto px-1 py-1">
        {contextFiles.length === 0 && (
          <div className="text-[11px] text-slate-600 text-center py-4">No files attached</div>
        )}
        {contextFiles.map((filePath) => (
          <div
            key={filePath}
            className="flex items-center justify-between px-2 py-1 rounded hover:bg-slate-800 group"
          >
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs text-slate-300 truncate" title={filePath}>
                {truncatePath(filePath)}
              </span>
              <span className="text-[10px] text-slate-600">
                {formatTokens(fileTokenMap.get(filePath) ?? 0)} tokens
              </span>
            </div>
            <button
              onClick={() => handleRemove(filePath)}
              className="text-slate-600 hover:text-red-400 text-sm ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              &times;
            </button>
          </div>
        ))}
      </div>

      {/* Add file controls */}
      <div className="px-3 py-2 border-t border-slate-800 space-y-1.5">
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={pathInput}
            onChange={(e) => setPathInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddPath();
              }
            }}
            placeholder="path/to/file..."
            disabled={isAdding}
            className="flex-1 bg-slate-800 text-slate-300 text-[11px] px-2 py-1 rounded border border-slate-700 focus:outline-none focus:border-blue-500 placeholder-slate-600 disabled:opacity-50"
          />
          <button
            onClick={handleAddPath}
            disabled={isAdding || !pathInput.trim()}
            className="text-[11px] text-blue-400 hover:text-blue-300 disabled:text-slate-600 disabled:cursor-default whitespace-nowrap"
          >
            + Add
          </button>
        </div>
        <button
          onClick={handleAddOpenFile}
          disabled={!selectedFilePath || isAdding}
          className="w-full text-[11px] text-left text-blue-400 hover:text-blue-300 disabled:text-slate-600 disabled:cursor-default"
        >
          + Add Open File{selectedFilePath ? ` (${truncatePath(selectedFilePath)})` : ''}
        </button>
      </div>

      {/* System prompt */}
      <div className="px-3 py-2 border-t border-slate-800">
        <label className="text-[10px] text-slate-500 uppercase tracking-wide mb-1 block">System Prompt</label>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          placeholder="Custom instructions..."
          rows={3}
          className="w-full bg-slate-800 text-slate-300 text-[11px] px-2 py-1.5 rounded border border-slate-700 focus:outline-none focus:border-blue-500 resize-none placeholder-slate-600"
        />
      </div>

      {/* Model selector */}
      <div className="px-3 py-2 border-t border-slate-700">
        <label className="text-[10px] text-slate-500 uppercase tracking-wide mb-1 block">Model</label>
        <select
          value={selectedModels[0] || ''}
          onChange={(e) => setSelectedModels([e.target.value])}
          className="w-full bg-slate-800 text-slate-300 text-[11px] px-2 py-1.5 rounded border border-slate-700 focus:outline-none focus:border-blue-500"
        >
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
          {models.length === 0 && (
            <option value={selectedModels[0] || ''}>{selectedModels[0] || 'No models loaded'}</option>
          )}
        </select>
      </div>
    </div>
  );
}
