import React, { useState, useEffect, useCallback } from 'react';
import { useWriterStore } from '../store/writerStore';
import type { TrackedChange } from '../../shared/types';

export default function TrackedChangesPanel() {
  const { currentChapter, setShowTrackedChanges, settings, saveSettings } = useWriterStore();
  const [changes, setChanges] = useState<TrackedChange[]>([]);

  const loadChanges = useCallback(async () => {
    if (!currentChapter) return;
    const result = await window.electronAPI.getTrackedChanges(currentChapter.id);
    setChanges(result);
  }, [currentChapter]);

  useEffect(() => { loadChanges(); }, [loadChanges]);

  const handleAccept = async (change: TrackedChange) => {
    // Accept the change (it's already in the document) — just remove the tracking record
    await window.electronAPI.deleteTrackedChange(change.id);
    loadChanges();
  };

  const handleReject = async (change: TrackedChange) => {
    // Reject: revert the change in the editor
    const editor = (window as any).__tiptapEditor;
    if (editor && change.changeType === 'insertion') {
      // For insertions, remove the inserted text
      try {
        const docSize = editor.state.doc.content.size;
        const from = Math.min(change.fromPos, docSize);
        const to = Math.min(change.toPos, docSize);
        if (from < to) {
          editor.chain().focus().deleteRange({ from, to }).run();
        }
      } catch { /* position may be invalid */ }
    }
    await window.electronAPI.deleteTrackedChange(change.id);
    loadChanges();
  };

  const handleAcceptAll = async () => {
    if (!currentChapter) return;
    await window.electronAPI.clearTrackedChanges(currentChapter.id);
    loadChanges();
  };

  const handleGoTo = (change: TrackedChange) => {
    const editor = (window as any).__tiptapEditor;
    if (!editor) return;
    try {
      const docSize = editor.state.doc.content.size;
      const from = Math.min(change.fromPos, docSize);
      const to = Math.min(change.toPos, docSize);
      editor.chain().focus().setTextSelection({ from, to }).run();
    } catch { /* position may be invalid */ }
  };

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  const handleImportDocx = async () => {
    if (!currentChapter) return;
    setImporting(true);
    setImportResult(null);
    try {
      const result = await window.electronAPI.importDocxChanges(currentChapter.id);
      setImportResult(`Imported ${result.imported} tracked change(s) from DOCX`);
      loadChanges();
    } catch (err: any) {
      setImportResult(err.message || 'Failed to import');
    }
    setImporting(false);
  };

  const handleImportPdf = async () => {
    if (!currentChapter) return;
    setImporting(true);
    setImportResult(null);
    try {
      const result = await window.electronAPI.importPdfAnnotations(currentChapter.id);
      setImportResult(`Imported ${result.imported} annotation(s) from PDF`);
      loadChanges();
    } catch (err: any) {
      setImportResult(err.message || 'Failed to import PDF');
    }
    setImporting(false);
  };

  const insertions = changes.filter(c => c.changeType === 'insertion');
  const deletions = changes.filter(c => c.changeType === 'deletion');

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#16213e] rounded-lg border border-[var(--border)] w-[560px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-surface-200">Tracked Changes</h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.trackChanges || false}
                onChange={e => saveSettings({ trackChanges: e.target.checked })}
                className="accent-primary-500"
              />
              <span className="text-xs text-surface-400">Track Changes</span>
            </label>
          </div>
          <button onClick={() => setShowTrackedChanges(false)} className="text-surface-500 hover:text-surface-300">x</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Summary */}
          <div className="flex items-center gap-4 text-xs">
            <span className="text-green-400">{insertions.length} insertion(s)</span>
            <span className="text-red-400">{deletions.length} deletion(s)</span>
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={handleImportDocx}
                disabled={importing || !currentChapter}
                className="px-3 py-1 bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 disabled:opacity-50 rounded transition-colors text-xs"
                title="Import tracked changes from a .docx file"
              >
                {importing ? 'Importing...' : 'Import DOCX'}
              </button>
              <button
                onClick={handleImportPdf}
                disabled={importing || !currentChapter}
                className="px-3 py-1 bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 disabled:opacity-50 rounded transition-colors text-xs"
                title="Import annotations from a PDF file"
              >
                {importing ? 'Importing...' : 'Import PDF'}
              </button>
              {changes.length > 0 && (
                <button
                  onClick={handleAcceptAll}
                  className="px-3 py-1 bg-green-600/20 text-green-300 hover:bg-green-600/30 rounded transition-colors text-xs"
                >
                  Accept All
                </button>
              )}
            </div>
          </div>

          {/* Import result */}
          {importResult && (
            <div className="p-2 bg-blue-600/10 border border-blue-500/30 rounded text-xs text-blue-300">
              {importResult}
            </div>
          )}

          {/* Change list */}
          {changes.length === 0 ? (
            <div className="text-center py-8 text-xs text-surface-600">
              {settings.trackChanges
                ? 'No tracked changes in this chapter'
                : 'Enable "Track Changes" to start tracking edits'}
            </div>
          ) : (
            changes.map(c => (
              <div
                key={c.id}
                className={`p-3 rounded border cursor-pointer hover:bg-white/5 ${
                  c.changeType === 'insertion'
                    ? 'border-green-500/30 bg-green-600/10'
                    : 'border-red-500/30 bg-red-600/10'
                }`}
                onClick={() => handleGoTo(c)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <span className={`text-[10px] font-semibold ${c.changeType === 'insertion' ? 'text-green-400' : 'text-red-400'}`}>
                      {c.changeType === 'insertion' ? '+ Insertion' : '- Deletion'}
                    </span>
                    <p className="text-xs text-surface-300 mt-1 font-mono">
                      {c.changeType === 'insertion' ? c.newText : c.oldText}
                    </p>
                    <span className="text-[10px] text-surface-600 mt-1 block">
                      {c.author} — {new Date(c.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAccept(c); }}
                      className="px-2 py-0.5 text-[10px] bg-green-600/20 text-green-300 hover:bg-green-600/30 rounded"
                      title="Accept change"
                    >
                      Accept
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleReject(c); }}
                      className="px-2 py-0.5 text-[10px] bg-red-600/20 text-red-300 hover:bg-red-600/30 rounded"
                      title="Reject change"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-3 border-t border-[var(--border)] flex justify-end shrink-0">
          <button onClick={() => setShowTrackedChanges(false)} className="px-3 py-1.5 text-xs text-surface-400 hover:text-surface-200 rounded transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
}
