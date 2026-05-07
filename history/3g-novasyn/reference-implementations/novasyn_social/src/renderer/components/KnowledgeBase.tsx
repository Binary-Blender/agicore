import React, { useState, useEffect } from 'react';
import { useSocialStore } from '../store/socialStore';
import type { KBEntryType, CreateKBEntryInput } from '../../shared/types';

// ─── Constants ───────────────────────────────────────────────────────────────

const ENTRY_TYPES: { value: KBEntryType; label: string; color: string }[] = [
  { value: 'style_example', label: 'Style Example', color: 'bg-indigo-600' },
  { value: 'opinion', label: 'Opinion', color: 'bg-amber-600' },
  { value: 'gold_reply', label: 'Gold Reply', color: 'bg-green-600' },
  { value: 'persona_note', label: 'Persona Note', color: 'bg-purple-600' },
  { value: 'topic_brief', label: 'Topic Brief', color: 'bg-blue-600' },
];

const CHANNEL_OPTIONS = [
  { value: '', label: 'Any Channel' },
  { value: 'email', label: 'Email' },
  { value: 'linkedin_dm', label: 'LinkedIn DM' },
  { value: 'linkedin_comment', label: 'LinkedIn Comment' },
  { value: 'youtube_comment', label: 'YouTube Comment' },
  { value: 'twitter_dm', label: 'Twitter DM' },
];

const MODE_OPTIONS = [
  { value: '', label: 'Any Mode' },
  { value: 'standard', label: 'Standard' },
  { value: 'agree_amplify', label: 'Agree & Amplify' },
  { value: 'educate', label: 'Educate' },
  { value: 'battle', label: 'High Stakes' },
];

const TYPE_COLORS: Record<string, string> = {
  style_example: 'bg-indigo-600/20 text-indigo-400 border-indigo-600/30',
  opinion: 'bg-amber-600/20 text-amber-400 border-amber-600/30',
  gold_reply: 'bg-green-600/20 text-green-400 border-green-600/30',
  persona_note: 'bg-purple-600/20 text-purple-400 border-purple-600/30',
  topic_brief: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
};

const SOURCE_LABELS: Record<string, string> = {
  manual: 'Manual',
  accepted_draft: 'Auto-ingested',
  imported: 'Imported',
};

// ─── Component ───────────────────────────────────────────────────────────────

const KnowledgeBase: React.FC = () => {
  const kbEntries = useSocialStore((s) => s.kbEntries);
  const loadKBEntries = useSocialStore((s) => s.loadKBEntries);
  const createKBEntry = useSocialStore((s) => s.createKBEntry);
  const updateKBEntry = useSocialStore((s) => s.updateKBEntry);
  const deleteKBEntry = useSocialStore((s) => s.deleteKBEntry);
  const searchKB = useSocialStore((s) => s.searchKB);
  const kbSearchResults = useSocialStore((s) => s.kbSearchResults);
  const embedKBEntries = useSocialStore((s) => s.embedKBEntries);
  const isEmbedding = useSocialStore((s) => s.isEmbedding);

  // View state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterSource, setFilterSource] = useState<string>('');
  const [embedResult, setEmbedResult] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formType, setFormType] = useState<KBEntryType>('style_example');
  const [formChannel, setFormChannel] = useState('');
  const [formMode, setFormMode] = useState('');
  const [formTags, setFormTags] = useState('');

  useEffect(() => {
    loadKBEntries();
  }, []);

  const resetForm = () => {
    setFormTitle('');
    setFormContent('');
    setFormType('style_example');
    setFormChannel('');
    setFormMode('');
    setFormTags('');
    setEditingId(null);
    setShowForm(false);
  };

  const handleCreate = async () => {
    if (!formTitle.trim() || !formContent.trim()) return;

    const input: CreateKBEntryInput = {
      entryType: formType,
      title: formTitle.trim(),
      content: formContent.trim(),
      channelType: formChannel || undefined,
      responseMode: formMode || undefined,
      tags: formTags ? formTags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
    };

    if (editingId) {
      await updateKBEntry(editingId, input);
    } else {
      await createKBEntry(input);
    }

    resetForm();
  };

  const handleEdit = (entry: typeof kbEntries[0]) => {
    setFormTitle(entry.title);
    setFormContent(entry.content);
    setFormType(entry.entryType as KBEntryType);
    setFormChannel(entry.channelType || '');
    setFormMode(entry.responseMode || '');
    setFormTags(entry.tags.join(', '));
    setEditingId(entry.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirmDelete === id) {
      await deleteKBEntry(id);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(id);
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    await updateKBEntry(id, { isActive: !currentActive });
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      await loadKBEntries();
      return;
    }
    await searchKB(searchQuery.trim());
  };

  const handleEmbed = async () => {
    const result = await embedKBEntries();
    if (result) {
      setEmbedResult(`Embedded ${result.embedded} entries`);
      setTimeout(() => setEmbedResult(null), 3000);
    }
  };

  // Filter entries
  const displayEntries = searchQuery.trim() ? kbSearchResults : kbEntries;
  const filteredEntries = displayEntries.filter((entry) => {
    if (filterType && entry.entryType !== filterType) return false;
    if (filterSource && entry.source !== filterSource) return false;
    return true;
  });

  const entriesWithEmbeddings = kbEntries.filter((e) => e.embedding !== null).length;
  const entriesWithoutEmbeddings = kbEntries.filter((e) => e.embedding === null && e.isActive).length;

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-heading)]">Knowledge Base</h1>
          <p className="text-sm text-[var(--text-muted)]">
            {kbEntries.length} entries ({entriesWithEmbeddings} embedded)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {entriesWithoutEmbeddings > 0 && (
            <button
              onClick={handleEmbed}
              disabled={isEmbedding}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2"
            >
              {isEmbedding && (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {isEmbedding ? 'Embedding...' : `Embed ${entriesWithoutEmbeddings} entries`}
            </button>
          )}
          {embedResult && (
            <span className="text-sm text-green-400 animate-pulse">{embedResult}</span>
          )}
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            + New Entry
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-[var(--bg-panel)] border border-[var(--border)] rounded-lg p-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search knowledge base..."
              className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Types</option>
            {ENTRY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Sources</option>
            <option value="manual">Manual</option>
            <option value="accepted_draft">Auto-ingested</option>
            <option value="imported">Imported</option>
          </select>
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-[var(--bg-input)] border border-[var(--border)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] rounded-lg text-sm transition-colors"
          >
            Search
          </button>
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); loadKBEntries(); }}
              className="px-3 py-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="bg-[var(--bg-panel)] border border-[var(--border)] rounded-lg p-5 mb-4">
          <h2 className="text-sm font-semibold text-[var(--text-heading)] mb-4">
            {editingId ? 'Edit Entry' : 'New Knowledge Base Entry'}
          </h2>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Type</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as KBEntryType)}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {ENTRY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Channel (optional)</label>
                <select
                  value={formChannel}
                  onChange={(e) => setFormChannel(e.target.value)}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {CHANNEL_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Response Mode (optional)</label>
                <select
                  value={formMode}
                  onChange={(e) => setFormMode(e.target.value)}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {MODE_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Title</label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g., My LinkedIn comment style"
                className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Content</label>
              <textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                rows={6}
                placeholder="Paste a style example, write your opinion on a topic, or describe your persona..."
                className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y font-mono"
              />
            </div>

            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Tags (comma-separated)</label>
              <input
                type="text"
                value={formTags}
                onChange={(e) => setFormTags(e.target.value)}
                placeholder="e.g., ai, technology, professional"
                className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleCreate}
                disabled={!formTitle.trim() || !formContent.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
              >
                {editingId ? 'Save Changes' : 'Create Entry'}
              </button>
              <button
                onClick={resetForm}
                className="px-4 py-2 bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Entries List */}
      <div className="space-y-3">
        {filteredEntries.length === 0 ? (
          <div className="bg-[var(--bg-panel)] border border-[var(--border)] rounded-lg p-8 text-center">
            <p className="text-sm text-[var(--text-muted)]">
              {searchQuery ? 'No matching entries found.' : 'No knowledge base entries yet. Add style examples, opinions, and persona notes to improve AI draft quality.'}
            </p>
          </div>
        ) : (
          filteredEntries.map((entry) => (
            <div
              key={entry.id}
              className={`bg-[var(--bg-panel)] border rounded-lg p-4 transition-colors ${
                entry.isActive ? 'border-[var(--border)]' : 'border-[var(--border)] opacity-50'
              }`}
            >
              {/* Entry header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${TYPE_COLORS[entry.entryType] || 'bg-gray-600/20 text-gray-400'}`}>
                    {ENTRY_TYPES.find((t) => t.value === entry.entryType)?.label || entry.entryType}
                  </span>
                  <h3 className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {entry.title}
                  </h3>
                  {!entry.isActive && (
                    <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-input)] px-1.5 py-0.5 rounded">
                      Inactive
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                  {entry.embedding ? (
                    <span className="text-[10px] text-green-400" title="Has embedding">
                      [embedded]
                    </span>
                  ) : (
                    <span className="text-[10px] text-[var(--text-muted)]" title="No embedding yet">
                      [no embed]
                    </span>
                  )}
                  <button
                    onClick={() => handleToggleActive(entry.id, entry.isActive)}
                    className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                      entry.isActive
                        ? 'text-amber-400 hover:bg-amber-600/20'
                        : 'text-green-400 hover:bg-green-600/20'
                    }`}
                  >
                    {entry.isActive ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => handleEdit(entry)}
                    className="px-2 py-0.5 text-[10px] text-[var(--text-muted)] hover:text-indigo-400 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                      confirmDelete === entry.id
                        ? 'bg-red-600 text-white'
                        : 'text-[var(--text-muted)] hover:text-red-400'
                    }`}
                  >
                    {confirmDelete === entry.id ? 'Confirm?' : 'Delete'}
                  </button>
                </div>
              </div>

              {/* Entry content preview */}
              <p className="text-xs text-[var(--text-muted)] line-clamp-3 mb-2 whitespace-pre-wrap">
                {entry.content}
              </p>

              {/* Entry metadata */}
              <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)]">
                {entry.channelType && (
                  <span className="bg-[var(--bg-input)] px-1.5 py-0.5 rounded">{entry.channelType}</span>
                )}
                {entry.responseMode && (
                  <span className="bg-[var(--bg-input)] px-1.5 py-0.5 rounded">{entry.responseMode}</span>
                )}
                <span>{SOURCE_LABELS[entry.source] || entry.source}</span>
                {entry.tags.length > 0 && (
                  <span>{entry.tags.map((t) => `#${t}`).join(' ')}</span>
                )}
                <span className="ml-auto">
                  {new Date(entry.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default KnowledgeBase;
