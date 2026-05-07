import React, { useState, useEffect } from 'react';
import { useWriterStore } from '../store/writerStore';
import type { WriterPlugin, PluginResult } from '../../shared/types';

export default function PluginsPanel() {
  const { setShowPlugins, currentChapter } = useWriterStore();
  const [plugins, setPlugins] = useState<WriterPlugin[]>([]);
  const [running, setRunning] = useState<string | null>(null);
  const [result, setResult] = useState<PluginResult | null>(null);

  useEffect(() => {
    window.electronAPI.getPlugins().then(setPlugins);
  }, []);

  const handleToggle = async (pluginId: string, enabled: boolean) => {
    await window.electronAPI.togglePlugin(pluginId, enabled);
    setPlugins(prev => prev.map(p => p.id === pluginId ? { ...p, enabled } : p));
  };

  const handleRun = async (pluginId: string) => {
    setRunning(pluginId);
    setResult(null);
    try {
      // Get text from editor
      const editor = (window as any).__tiptapEditor;
      let text = '';
      if (editor) {
        const { from, to } = editor.state.selection;
        if (from !== to) {
          text = editor.state.doc.textBetween(from, to);
        } else {
          text = editor.state.doc.textContent;
        }
      }

      const res = await window.electronAPI.runPlugin(pluginId, {
        text,
        chapterContent: currentChapter?.content || '',
      });
      setResult(res);
    } catch (err: any) {
      setResult({ pluginId, title: 'Error', content: err.message || 'Plugin failed', type: 'text' });
    }
    setRunning(null);
  };

  const handleInsertResult = () => {
    if (!result) return;
    const editor = (window as any).__tiptapEditor;
    if (editor) {
      editor.chain().focus().insertContent(result.content.replace(/\n/g, '<br/>')).run();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#16213e] rounded-lg border border-[var(--border)] w-[600px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between shrink-0">
          <h2 className="text-sm font-semibold text-surface-200">Plugins</h2>
          <button onClick={() => setShowPlugins(false)} className="text-surface-500 hover:text-surface-300">x</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Plugin list */}
          {plugins.map(plugin => (
            <div
              key={plugin.id}
              className={`p-3 rounded border ${plugin.enabled ? 'border-primary-500/30 bg-primary-600/5' : 'border-[var(--border)] bg-[var(--bg-page)]'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-surface-200">{plugin.name}</span>
                    <span className="text-[9px] text-surface-600">v{plugin.version}</span>
                    {plugin.builtIn && (
                      <span className="px-1.5 py-0.5 text-[9px] bg-blue-600/20 text-blue-300 rounded">Built-in</span>
                    )}
                  </div>
                  <p className="text-[10px] text-surface-500 mt-0.5">{plugin.description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleRun(plugin.id)}
                    disabled={!plugin.enabled || running === plugin.id}
                    className="px-2 py-0.5 text-[10px] bg-primary-600/20 text-primary-300 hover:bg-primary-600/30 disabled:opacity-50 rounded transition-colors"
                  >
                    {running === plugin.id ? 'Running...' : 'Run'}
                  </button>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={plugin.enabled}
                      onChange={e => handleToggle(plugin.id, e.target.checked)}
                      className="accent-primary-500"
                    />
                    <span className="text-[10px] text-surface-400">{plugin.enabled ? 'On' : 'Off'}</span>
                  </label>
                </div>
              </div>
            </div>
          ))}

          {plugins.length === 0 && (
            <div className="text-center py-8 text-xs text-surface-600">No plugins available</div>
          )}

          {/* Result */}
          {result && (
            <div className="p-3 bg-[#1a1a2e]/80 border border-primary-500/30 rounded">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-primary-300">{result.title}</span>
                {result.pluginId === 'lorem-ipsum' && (
                  <button onClick={handleInsertResult} className="px-2 py-0.5 text-[10px] bg-green-600/20 text-green-300 hover:bg-green-600/30 rounded transition-colors">
                    Insert into Editor
                  </button>
                )}
              </div>
              <div className="text-xs text-surface-300 whitespace-pre-wrap font-mono leading-relaxed max-h-60 overflow-y-auto">
                {result.content.split('\n').map((line, i) => {
                  // Basic markdown bold rendering
                  const parts = line.split(/\*\*(.*?)\*\*/g);
                  return (
                    <div key={i}>
                      {parts.map((part, j) =>
                        j % 2 === 1 ? <strong key={j} className="text-surface-200">{part}</strong> : part
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--border)] flex justify-between items-center shrink-0">
          <span className="text-[10px] text-surface-600">
            {plugins.filter(p => p.enabled).length}/{plugins.length} plugins enabled
          </span>
          <button onClick={() => setShowPlugins(false)} className="px-3 py-1.5 text-xs text-surface-400 hover:text-surface-200 rounded transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
}
