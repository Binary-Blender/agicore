import React, { useState, useMemo } from 'react';
import { useWriterStore } from '../store/writerStore';
import type { KnowledgeBaseEntry } from '../../shared/types';

const KB_CATEGORIES = ['Ideas', 'Stories', 'Frameworks', 'Voice Profile', 'Research'] as const;

const CATEGORY_COLORS: Record<string, string> = {
  Ideas: 'bg-blue-600/30 text-blue-300',
  Stories: 'bg-purple-600/30 text-purple-300',
  Frameworks: 'bg-green-600/30 text-green-300',
  'Voice Profile': 'bg-orange-600/30 text-orange-300',
  Research: 'bg-cyan-600/30 text-cyan-300',
};

export default function KnowledgeBasePanel() {
  const {
    kbEntries,
    kbScanning,
    kbScanResults,
    currentProject,
    setShowKnowledgeBase,
    createKbEntry,
    updateKbEntry,
    deleteKbEntry,
    kbAnalyzeVoice,
    kbFindConnections,
    kbSuggestGaps,
    clearKbScanResults,
  } = useWriterStore();

  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [scopeFilter, setScopeFilter] = useState<string>('All');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingEntry, setAddingEntry] = useState(false);
  const [form, setForm] = useState({ title: '', category: 'Ideas', content: '', isGlobal: false });

  const filteredEntries = useMemo(() => {
    return kbEntries.filter((e) => {
      if (categoryFilter !== 'All' && e.category !== categoryFilter) return false;
      if (scopeFilter === 'Project' && e.isGlobal) return false;
      if (scopeFilter === 'Global' && !e.isGlobal) return false;
      return true;
    });
  }, [kbEntries, categoryFilter, scopeFilter]);

  const handleSave = async () => {
    if (!form.title.trim()) return;
    if (editingId) {
      await updateKbEntry(editingId, {
        title: form.title,
        category: form.category,
        content: form.content,
        isGlobal: form.isGlobal,
      });
      setEditingId(null);
    } else {
      await createKbEntry({
        projectId: currentProject?.id || null,
        title: form.title,
        category: form.category,
        content: form.content,
        isGlobal: form.isGlobal,
      });
      setAddingEntry(false);
    }
    setForm({ title: '', category: 'Ideas', content: '', isGlobal: false });
  };

  const startEdit = (entry: KnowledgeBaseEntry) => {
    setEditingId(entry.id);
    setAddingEntry(false);
    setForm({
      title: entry.title,
      category: entry.category,
      content: entry.content,
      isGlobal: entry.isGlobal,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setAddingEntry(false);
    setForm({ title: '', category: 'Ideas', content: '', isGlobal: false });
  };

  const handleSaveVoiceAnalysis = async (text: string) => {
    await createKbEntry({
      projectId: currentProject?.id || null,
      title: 'Voice Analysis',
      category: 'Voice Profile',
      content: text,
      isGlobal: false,
    });
    clearKbScanResults();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
      <div className="w-[680px] max-h-[80vh] flex flex-col bg-[var(--bg-panel)] rounded-lg border border-[var(--border)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] shrink-0">
          <h2 className="text-base font-semibold text-surface-200">Knowledge Base</h2>
          <button
            onClick={() => setShowKnowledgeBase(false)}
            className="text-surface-500 hover:text-surface-300 text-sm"
          >
            Close
          </button>
        </div>

        {/* Filter row */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--border)] shrink-0">
          <select
            className="bg-[var(--bg-page)] text-surface-200 rounded px-2 py-1 text-xs border border-[var(--border)] focus:border-primary-500 focus:outline-none"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="All">All Categories</option>
            {KB_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            className="bg-[var(--bg-page)] text-surface-200 rounded px-2 py-1 text-xs border border-[var(--border)] focus:border-primary-500 focus:outline-none"
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value)}
          >
            <option value="All">All Scopes</option>
            <option value="Project">Project Only</option>
            <option value="Global">Global Only</option>
          </select>
          <span className="text-xs text-surface-500 ml-auto">{filteredEntries.length} entries</span>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--border)] shrink-0">
          <button
            onClick={() => {
              cancelEdit();
              setAddingEntry(true);
              setForm({ title: '', category: 'Ideas', content: '', isGlobal: false });
            }}
            className="px-3 py-1 text-xs bg-primary-600 hover:bg-primary-500 text-white rounded transition-colors"
          >
            + Add Entry
          </button>
          <button
            onClick={kbFindConnections}
            disabled={kbScanning || kbEntries.length < 2}
            className="px-3 py-1 text-xs bg-[var(--bg-page)] hover:bg-white/10 text-surface-300 rounded border border-[var(--border)] transition-colors disabled:opacity-40"
          >
            {kbScanning ? 'Scanning...' : 'Find Connections'}
          </button>
          <button
            onClick={kbSuggestGaps}
            disabled={kbScanning}
            className="px-3 py-1 text-xs bg-[var(--bg-page)] hover:bg-white/10 text-surface-300 rounded border border-[var(--border)] transition-colors disabled:opacity-40"
          >
            {kbScanning ? 'Scanning...' : 'Suggest Gaps'}
          </button>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* AI scan results */}
          {kbScanResults && kbScanResults.length > 0 && (
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-surface-400 uppercase tracking-wider">AI Results</span>
                <button
                  onClick={clearKbScanResults}
                  className="text-xs text-surface-500 hover:text-surface-300"
                >
                  Clear
                </button>
              </div>
              {kbScanResults.map((result, i) => (
                <div
                  key={i}
                  className="bg-[var(--bg-page)] border border-primary-500/30 rounded p-3"
                >
                  {result.type === 'voice' ? (
                    <div>
                      <div className="text-xs font-semibold text-orange-300 mb-1">Voice Analysis</div>
                      <div className="text-xs text-surface-300 whitespace-pre-wrap">{result.text}</div>
                      <button
                        onClick={() => handleSaveVoiceAnalysis(result.text)}
                        className="mt-2 px-2 py-1 text-xs bg-green-600/20 text-green-400 hover:bg-green-600/30 rounded transition-colors"
                      >
                        Save as KB Entry
                      </button>
                    </div>
                  ) : result.type === 'connection' ? (
                    <div>
                      <div className="text-xs font-semibold text-primary-300 mb-1">{result.title}</div>
                      {result.entries && (
                        <div className="text-xs text-surface-500 mb-1">
                          Connects: {result.entries.join(', ')}
                        </div>
                      )}
                      <div className="text-xs text-surface-300">{result.description}</div>
                    </div>
                  ) : result.type === 'gap' ? (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-cyan-300">{result.title}</span>
                        {result.category && (
                          <span className={`px-1.5 py-0.5 text-[10px] rounded ${CATEGORY_COLORS[result.category] || 'bg-surface-600/30 text-surface-400'}`}>
                            {result.category}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-surface-300">{result.description}</div>
                    </div>
                  ) : result.error ? (
                    <div className="text-xs text-red-400">{result.error}</div>
                  ) : null}
                </div>
              ))}
            </div>
          )}

          {/* Add form */}
          {addingEntry && (
            <div className="bg-[var(--bg-page)] rounded border border-primary-500/50 p-3 space-y-2">
              <div className="text-xs font-semibold text-primary-300 mb-1">New Entry</div>
              <input
                autoFocus
                className="w-full bg-[var(--bg-panel)] text-surface-200 rounded px-2 py-1.5 text-sm border border-[var(--border)] focus:border-primary-500 focus:outline-none"
                placeholder="Title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              <div className="flex gap-2">
                <select
                  className="bg-[var(--bg-panel)] text-surface-200 rounded px-2 py-1 text-xs border border-[var(--border)] focus:border-primary-500 focus:outline-none"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {KB_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <label className="flex items-center gap-1 text-xs text-surface-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isGlobal}
                    onChange={(e) => setForm({ ...form, isGlobal: e.target.checked })}
                    className="rounded"
                  />
                  Global
                </label>
              </div>
              <textarea
                className="w-full bg-[var(--bg-panel)] text-surface-200 rounded px-2 py-1.5 text-xs border border-[var(--border)] focus:border-primary-500 focus:outline-none resize-none h-28"
                placeholder="Content..."
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={!form.title.trim()}
                  className="px-3 py-1 text-xs bg-primary-600 hover:bg-primary-500 disabled:bg-surface-700 disabled:text-surface-500 text-white rounded transition-colors"
                >
                  Create
                </button>
                <button
                  onClick={cancelEdit}
                  className="px-3 py-1 text-xs text-surface-400 hover:text-surface-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Entry list */}
          {filteredEntries.map((entry) => (
            <div key={entry.id}>
              {editingId === entry.id ? (
                <div className="bg-[var(--bg-page)] rounded border border-primary-500/50 p-3 space-y-2">
                  <input
                    autoFocus
                    className="w-full bg-[var(--bg-panel)] text-surface-200 rounded px-2 py-1.5 text-sm border border-[var(--border)] focus:border-primary-500 focus:outline-none"
                    placeholder="Title"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <select
                      className="bg-[var(--bg-panel)] text-surface-200 rounded px-2 py-1 text-xs border border-[var(--border)] focus:border-primary-500 focus:outline-none"
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                    >
                      {KB_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <label className="flex items-center gap-1 text-xs text-surface-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.isGlobal}
                        onChange={(e) => setForm({ ...form, isGlobal: e.target.checked })}
                        className="rounded"
                      />
                      Global
                    </label>
                  </div>
                  <textarea
                    className="w-full bg-[var(--bg-panel)] text-surface-200 rounded px-2 py-1.5 text-xs border border-[var(--border)] focus:border-primary-500 focus:outline-none resize-none h-28"
                    placeholder="Content..."
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      disabled={!form.title.trim()}
                      className="px-3 py-1 text-xs bg-primary-600 hover:bg-primary-500 disabled:bg-surface-700 disabled:text-surface-500 text-white rounded transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-3 py-1 text-xs text-surface-400 hover:text-surface-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="bg-[var(--bg-page)] rounded border border-[var(--border)] p-3 cursor-pointer hover:border-primary-500/30 transition-colors group"
                  onClick={() => startEdit(entry)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-surface-200 flex-1 truncate">{entry.title}</span>
                    <span className={`px-1.5 py-0.5 text-[10px] rounded shrink-0 ${CATEGORY_COLORS[entry.category] || 'bg-surface-600/30 text-surface-400'}`}>
                      {entry.category}
                    </span>
                    {entry.isGlobal && (
                      <span className="text-[10px] text-surface-500 shrink-0" title="Global entry">
                        G
                      </span>
                    )}
                    <span className="text-[10px] text-surface-600 shrink-0">{entry.tokens}t</span>
                    {(entry.category === 'Voice Profile' || entry.category === 'Stories') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          kbAnalyzeVoice(entry.id);
                        }}
                        disabled={kbScanning}
                        className="text-[10px] text-orange-400 hover:text-orange-300 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Analyze Voice"
                      >
                        Analyze
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete "${entry.title}"?`)) deleteKbEntry(entry.id);
                      }}
                      className="text-red-400 hover:text-red-300 text-xs shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete"
                    >
                      x
                    </button>
                  </div>
                  {entry.content && (
                    <p className="text-xs text-surface-400 line-clamp-2">{entry.content}</p>
                  )}
                </div>
              )}
            </div>
          ))}

          {filteredEntries.length === 0 && !addingEntry && (
            <div className="text-center py-8 text-surface-500 text-sm">
              No knowledge base entries yet. Click "Add Entry" to create one.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
