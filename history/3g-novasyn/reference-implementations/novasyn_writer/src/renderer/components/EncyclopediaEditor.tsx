import React, { useState, useEffect } from 'react';
import { useWriterStore } from '../store/writerStore';

const CATEGORIES = ['Character', 'Location', 'Item', 'Lore', 'Other'];

const CHARACTER_SECTIONS = [
  'Physical Description',
  'Personality & Psychology',
  'Voice & Speech Patterns',
  'Character Arc',
  'Key Relationships',
  'Strengths & Weaknesses',
  'Notable Details',
];

const LOCATION_SECTIONS = [
  'Physical Description & Layout',
  'Atmosphere & Mood',
  'History & Significance',
  'Key Features',
  'Associated Characters',
  'Sensory Details',
];

export default function EncyclopediaEditor() {
  const {
    editingEncyclopediaEntry,
    encyclopediaEntries,
    setShowEncyclopediaEditor,
    createEncyclopediaEntry,
    updateEncyclopediaEntry,
    deleteEncyclopediaEntry,
  } = useWriterStore();

  const isEditing = !!editingEncyclopediaEntry;
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Character');
  const [content, setContent] = useState('');
  const [generating, setGenerating] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [extractedEntries, setExtractedEntries] = useState<{ name: string; category: string; content: string }[] | null>(null);
  const [consistencyIssues, setConsistencyIssues] = useState<{ entry: string; issue: string; suggestion: string }[] | null>(null);
  const [activeTab, setActiveTab] = useState<'edit' | 'extract' | 'consistency'>('edit');

  useEffect(() => {
    if (editingEncyclopediaEntry) {
      setName(editingEncyclopediaEntry.name);
      setCategory(editingEncyclopediaEntry.category);
      setContent(editingEncyclopediaEntry.content);
    } else {
      setName('');
      setCategory('Character');
      setContent('');
    }
  }, [editingEncyclopediaEntry]);

  const tokens = Math.ceil(content.length / 4);

  const handleSave = async () => {
    if (!name.trim()) return;

    if (isEditing && editingEncyclopediaEntry) {
      await updateEncyclopediaEntry(editingEncyclopediaEntry.id, {
        name: name.trim(),
        category,
        content,
      });
    } else {
      await createEncyclopediaEntry({
        name: name.trim(),
        category,
        content,
      });
    }

    setShowEncyclopediaEditor(false);
  };

  const handleDelete = async () => {
    if (!editingEncyclopediaEntry) return;
    if (confirm(`Delete "${editingEncyclopediaEntry.name}"?`)) {
      await deleteEncyclopediaEntry(editingEncyclopediaEntry.id);
      setShowEncyclopediaEditor(false);
    }
  };

  const handleGenerateProfile = async () => {
    if (!editingEncyclopediaEntry) return;
    setGenerating(true);
    try {
      const profile = await window.electronAPI.encyclopediaGenerateProfile(editingEncyclopediaEntry.id);
      setContent(profile);
    } catch (error) {
      // keep existing content
    } finally {
      setGenerating(false);
    }
  };

  const handleExtractEntries = async () => {
    setExtracting(true);
    setExtractedEntries(null);
    try {
      const entries = await window.electronAPI.encyclopediaExtractEntries(
        useWriterStore.getState().currentProject?.id || '',
      );
      setExtractedEntries(entries);
      setActiveTab('extract');
    } catch {
      setExtractedEntries([]);
    } finally {
      setExtracting(false);
    }
  };

  const handleCheckConsistency = async () => {
    setChecking(true);
    setConsistencyIssues(null);
    try {
      const issues = await window.electronAPI.encyclopediaCheckConsistency(
        useWriterStore.getState().currentProject?.id || '',
      );
      setConsistencyIssues(issues);
      setActiveTab('consistency');
    } catch {
      setConsistencyIssues([]);
    } finally {
      setChecking(false);
    }
  };

  const handleAddExtracted = async (entry: { name: string; category: string; content: string }) => {
    await createEncyclopediaEntry(entry);
    if (extractedEntries) {
      setExtractedEntries(extractedEntries.filter((e) => e.name !== entry.name));
    }
  };

  const insertSectionTemplate = () => {
    const sections = category === 'Character' ? CHARACTER_SECTIONS : category === 'Location' ? LOCATION_SECTIONS : null;
    if (!sections) return;
    const template = sections.map((s) => `## ${s}\n`).join('\n');
    setContent(content ? `${content}\n\n${template}` : template);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[var(--bg-panel)] rounded-lg border border-[var(--border)] w-[600px] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between shrink-0">
          <h2 className="text-sm font-semibold text-surface-200">
            {isEditing ? 'Edit Encyclopedia Entry' : 'New Encyclopedia Entry'}
          </h2>
          <button
            onClick={() => setShowEncyclopediaEditor(false)}
            className="text-surface-500 hover:text-surface-300"
          >
            x
          </button>
        </div>

        {/* Tab bar for AI features */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-[var(--border)] shrink-0">
          <button
            onClick={() => setActiveTab('edit')}
            className={`px-2.5 py-1 text-xs rounded transition-colors ${
              activeTab === 'edit' ? 'bg-primary-600/30 text-primary-300' : 'text-surface-400 hover:text-surface-200'
            }`}
          >
            {isEditing ? 'Edit' : 'Create'}
          </button>
          <button
            onClick={handleExtractEntries}
            disabled={extracting}
            className={`px-2.5 py-1 text-xs rounded transition-colors ${
              activeTab === 'extract' ? 'bg-green-600/30 text-green-300' : 'text-surface-400 hover:text-surface-200'
            } disabled:opacity-50`}
          >
            {extracting ? 'Scanning...' : 'Extract from Manuscript'}
          </button>
          <button
            onClick={handleCheckConsistency}
            disabled={checking}
            className={`px-2.5 py-1 text-xs rounded transition-colors ${
              activeTab === 'consistency' ? 'bg-orange-600/30 text-orange-300' : 'text-surface-400 hover:text-surface-200'
            } disabled:opacity-50`}
          >
            {checking ? 'Checking...' : 'Check Consistency'}
          </button>
        </div>

        {activeTab === 'edit' ? (
          <>
            {/* Form */}
            <div className="p-4 space-y-3 overflow-y-auto flex-1">
              <div>
                <label className="text-xs text-surface-500 block mb-1">Name</label>
                <input
                  autoFocus
                  className="w-full bg-[var(--bg-page)] text-surface-200 rounded px-3 py-2 text-sm border border-[var(--border)] focus:border-primary-500 focus:outline-none"
                  placeholder="e.g. Elara Nightwhisper"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs text-surface-500 block mb-1">Category</label>
                <select
                  className="w-full bg-[var(--bg-page)] text-surface-200 rounded px-3 py-2 text-sm border border-[var(--border)] focus:border-primary-500 focus:outline-none"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-surface-500">
                    Content <span className="text-surface-600">({tokens} tokens)</span>
                  </label>
                  <div className="flex gap-1">
                    {(category === 'Character' || category === 'Location') && (
                      <button
                        onClick={insertSectionTemplate}
                        className="text-[10px] px-2 py-0.5 bg-surface-700 text-surface-400 hover:text-surface-200 rounded"
                      >
                        Insert Template
                      </button>
                    )}
                    {isEditing && (
                      <button
                        onClick={handleGenerateProfile}
                        disabled={generating}
                        className="text-[10px] px-2 py-0.5 bg-primary-600/20 text-primary-400 hover:bg-primary-600/30 rounded disabled:opacity-50"
                      >
                        {generating ? 'Generating...' : 'AI Generate Profile'}
                      </button>
                    )}
                  </div>
                </div>
                <textarea
                  className="w-full bg-[var(--bg-page)] text-surface-200 rounded px-3 py-2 text-sm border border-[var(--border)] focus:border-primary-500 focus:outline-none resize-none h-52"
                  placeholder="Description, traits, backstory, notes..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[var(--border)] flex items-center gap-2 shrink-0">
              {isEditing && (
                <button
                  onClick={handleDelete}
                  className="px-3 py-1.5 text-xs text-red-400 hover:bg-red-600/10 rounded transition-colors"
                >
                  Delete
                </button>
              )}
              <div className="flex-1" />
              <button
                onClick={() => setShowEncyclopediaEditor(false)}
                className="px-3 py-1.5 text-xs text-surface-400 hover:text-surface-200 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!name.trim()}
                className="px-4 py-1.5 text-xs bg-primary-600 hover:bg-primary-500 disabled:bg-surface-700 disabled:text-surface-500 text-white rounded transition-colors"
              >
                {isEditing ? 'Save Changes' : 'Create Entry'}
              </button>
            </div>
          </>
        ) : activeTab === 'extract' ? (
          /* Extraction results */
          <div className="flex-1 overflow-y-auto p-4">
            {extractedEntries === null ? (
              <p className="text-sm text-surface-500 text-center py-8">Scanning manuscript...</p>
            ) : extractedEntries.length === 0 ? (
              <p className="text-sm text-surface-500 text-center py-8">
                No new entries found. All mentions are already tracked.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-surface-500 mb-2">
                  Found {extractedEntries.length} potential entries in manuscript:
                </p>
                {extractedEntries.map((entry, i) => (
                  <div
                    key={i}
                    className="bg-[var(--bg-page)] rounded border border-[var(--border)] p-3 flex items-start gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm text-surface-200 font-medium">{entry.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-600/20 text-accent-400">
                          {entry.category}
                        </span>
                      </div>
                      <p className="text-xs text-surface-400">{entry.content}</p>
                    </div>
                    <button
                      onClick={() => handleAddExtracted(entry)}
                      className="px-3 py-1 text-[10px] bg-green-600/20 text-green-400 hover:bg-green-600/30 rounded shrink-0"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Consistency check results */
          <div className="flex-1 overflow-y-auto p-4">
            {consistencyIssues === null ? (
              <p className="text-sm text-surface-500 text-center py-8">Checking consistency...</p>
            ) : consistencyIssues.length === 0 ? (
              <p className="text-sm text-green-400 text-center py-8">
                No inconsistencies found. Encyclopedia matches manuscript.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-surface-500 mb-2">
                  Found {consistencyIssues.length} potential inconsistencies:
                </p>
                {consistencyIssues.map((issue, i) => (
                  <div
                    key={i}
                    className="bg-[var(--bg-page)] rounded border border-orange-500/20 p-3"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-orange-300">{issue.entry}</span>
                    </div>
                    <p className="text-xs text-surface-300 mb-1">{issue.issue}</p>
                    <p className="text-[10px] text-surface-500">Suggestion: {issue.suggestion}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
