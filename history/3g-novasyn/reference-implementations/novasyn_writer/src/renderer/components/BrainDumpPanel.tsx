import React, { useEffect, useState } from 'react';
import { useWriterStore } from '../store/writerStore';

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function BrainDumpPanel() {
  const {
    brainDumps,
    brainDumpExtracting,
    brainDumpExtraction,
    loadBrainDumps,
    createBrainDump,
    updateBrainDump,
    deleteBrainDump,
    extractBrainDump,
    clearBrainDumpExtraction,
    setShowBrainDump,
    createEncyclopediaEntry,
    saveOutline,
    outline,
  } = useWriterStore();

  const [dumpText, setDumpText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    loadBrainDumps();
  }, []);

  const handleCreate = async () => {
    if (!dumpText.trim()) return;
    await createBrainDump(dumpText.trim());
    setDumpText('');
  };

  const handleUpdate = async () => {
    if (!editingId || !editText.trim()) return;
    await updateBrainDump(editingId, editText.trim());
    setEditingId(null);
    setEditText('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this brain dump?')) return;
    await deleteBrainDump(id);
    if (editingId === id) {
      setEditingId(null);
      setEditText('');
    }
  };

  const handleExtract = async (id: string) => {
    await extractBrainDump(id);
  };

  // Apply extraction results
  const applyEncyclopediaEntry = async (entry: { name: string; category: string; content: string }) => {
    await createEncyclopediaEntry(entry);
  };

  const applyOutlineBeats = async (beats: string[]) => {
    const existingBeats = outline?.beats ? JSON.parse(outline.beats) : [];
    await saveOutline([...existingBeats, ...beats]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[var(--bg-panel)] rounded-lg border border-[var(--border)] w-[700px] max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-surface-200">Brain Dump</h2>
            <p className="text-[10px] text-surface-500 mt-0.5">
              Zero-friction capture — just write, then let AI extract structure
            </p>
          </div>
          <button
            onClick={() => setShowBrainDump(false)}
            className="text-surface-500 hover:text-surface-300 text-sm"
          >
            Close
          </button>
        </div>

        {/* New dump input */}
        <div className="px-4 py-3 border-b border-[var(--border)] shrink-0">
          <textarea
            className="w-full bg-[var(--bg-page)] text-surface-200 rounded px-3 py-2 text-sm border border-[var(--border)] focus:border-primary-500 focus:outline-none resize-none h-32 placeholder-surface-600"
            placeholder="Just start typing... ideas, fragments, dialogue snippets, plot thoughts, character notes, anything. Don't worry about formatting or structure."
            value={dumpText}
            onChange={(e) => setDumpText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleCreate();
            }}
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-surface-600">Ctrl+Enter to save</span>
            <button
              onClick={handleCreate}
              disabled={!dumpText.trim()}
              className="px-4 py-1.5 bg-primary-600 hover:bg-primary-500 disabled:bg-surface-700 disabled:text-surface-500 text-white text-xs rounded transition-colors"
            >
              Save Dump
            </button>
          </div>
        </div>

        {/* Extraction results */}
        {brainDumpExtraction && (
          <div className="px-4 py-3 border-b border-[var(--border)] shrink-0 space-y-2 max-h-[30vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-primary-400">Extraction Results</span>
              <button
                onClick={clearBrainDumpExtraction}
                className="text-[10px] text-surface-600 hover:text-surface-400"
              >
                Dismiss
              </button>
            </div>

            {/* Ideas */}
            {brainDumpExtraction.ideas.length > 0 && (
              <div>
                <label className="text-[10px] text-surface-500 uppercase tracking-wider block mb-1">Ideas</label>
                <div className="space-y-1">
                  {brainDumpExtraction.ideas.map((idea, i) => (
                    <div key={i} className="bg-blue-600/10 border border-blue-500/20 rounded px-2 py-1.5 text-xs text-blue-300">
                      {idea}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Encyclopedia entries */}
            {brainDumpExtraction.encyclopediaEntries.length > 0 && (
              <div>
                <label className="text-[10px] text-surface-500 uppercase tracking-wider block mb-1">Encyclopedia Entries</label>
                <div className="space-y-1">
                  {brainDumpExtraction.encyclopediaEntries.map((entry, i) => (
                    <div key={i} className="bg-green-600/10 border border-green-500/20 rounded px-2 py-1.5 flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="text-xs text-green-300 font-medium">{entry.name}</span>
                        <span className="text-[10px] text-surface-500 ml-2">{entry.category}</span>
                        <p className="text-[10px] text-surface-400 mt-0.5 truncate">{entry.content}</p>
                      </div>
                      <button
                        onClick={() => applyEncyclopediaEntry(entry)}
                        className="text-[10px] px-2 py-0.5 bg-green-600/20 text-green-400 hover:bg-green-600/30 rounded shrink-0"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Outline beats */}
            {brainDumpExtraction.outlineBeats.length > 0 && (
              <div>
                <label className="text-[10px] text-surface-500 uppercase tracking-wider block mb-1">Outline Beats</label>
                <div className="space-y-1">
                  {brainDumpExtraction.outlineBeats.map((beat, i) => (
                    <div key={i} className="bg-purple-600/10 border border-purple-500/20 rounded px-2 py-1.5 text-xs text-purple-300">
                      {beat}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => applyOutlineBeats(brainDumpExtraction.outlineBeats)}
                  className="mt-1 text-[10px] px-2 py-0.5 bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 rounded"
                >
                  Add All to Outline
                </button>
              </div>
            )}

            {/* Questions */}
            {brainDumpExtraction.questions.length > 0 && (
              <div>
                <label className="text-[10px] text-surface-500 uppercase tracking-wider block mb-1">Questions</label>
                <div className="space-y-1">
                  {brainDumpExtraction.questions.map((q, i) => (
                    <div key={i} className="bg-orange-600/10 border border-orange-500/20 rounded px-2 py-1.5 text-xs text-orange-300">
                      {q}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dump list */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {brainDumps.length === 0 ? (
            <p className="text-sm text-surface-500 text-center py-8">
              No brain dumps yet. Start writing above to capture your thoughts.
            </p>
          ) : (
            <div className="space-y-2">
              {brainDumps.map((dump) => (
                <div
                  key={dump.id}
                  className="bg-[var(--bg-page)] rounded border border-[var(--border)] p-3 group"
                >
                  {editingId === dump.id ? (
                    <div>
                      <textarea
                        autoFocus
                        className="w-full bg-[var(--bg-panel)] text-surface-200 rounded px-2 py-1.5 text-xs border border-primary-500 focus:outline-none resize-none h-24"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                      />
                      <div className="flex gap-2 mt-1.5">
                        <button
                          onClick={handleUpdate}
                          className="px-2 py-1 text-[10px] bg-primary-600/20 text-primary-400 hover:bg-primary-600/30 rounded"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => { setEditingId(null); setEditText(''); }}
                          className="px-2 py-1 text-[10px] text-surface-500 hover:text-surface-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="text-xs text-surface-300 whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">
                        {dump.content}
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--border)]">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-surface-600">{timeAgo(dump.createdAt)}</span>
                          {dump.extracted && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-600/20 text-green-400">Extracted</span>
                          )}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleExtract(dump.id)}
                            disabled={brainDumpExtracting}
                            className="px-2 py-1 text-[10px] bg-primary-600/20 text-primary-400 hover:bg-primary-600/30 rounded disabled:opacity-50"
                          >
                            {brainDumpExtracting ? 'Extracting...' : 'Extract'}
                          </button>
                          <button
                            onClick={() => { setEditingId(dump.id); setEditText(dump.content); }}
                            className="px-2 py-1 text-[10px] bg-surface-700 text-surface-400 hover:text-surface-200 rounded"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(dump.id)}
                            className="px-2 py-1 text-[10px] bg-red-600/10 text-red-400 hover:bg-red-600/20 rounded"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
