import React, { useState, useEffect } from 'react';
import { useCouncilStore } from '../store/councilStore';

const CATEGORIES = [
  { value: 'domain', label: 'Domain', color: 'bg-blue-600/30 text-blue-300' },
  { value: 'technical', label: 'Technical', color: 'bg-green-600/30 text-green-300' },
  { value: 'business', label: 'Business', color: 'bg-yellow-600/30 text-yellow-300' },
  { value: 'persona_specific', label: 'Persona-Specific', color: 'bg-purple-600/30 text-purple-300' },
  { value: 'meta', label: 'Meta', color: 'bg-cyan-600/30 text-cyan-300' },
];

const LOADING_RULES = [
  { value: 'always', label: 'Always', desc: 'Always included in context' },
  { value: 'available', label: 'Available', desc: 'Included when tags match conversation topic' },
  { value: 'manual', label: 'Manual', desc: 'Only included when explicitly selected' },
];

export default function SkillDocEditor() {
  const {
    editingSkillDoc,
    currentPersona,
    setShowSkillDocEditor,
    createSkillDoc,
    updateSkillDoc,
  } = useCouncilStore();

  const isEditing = !!editingSkillDoc;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('domain');
  const [loadingRule, setLoadingRule] = useState('available');
  const [relevanceTags, setRelevanceTags] = useState('');
  const [isGlobal, setIsGlobal] = useState(false);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (editingSkillDoc) {
      setTitle(editingSkillDoc.title);
      setContent(editingSkillDoc.content);
      setCategory(editingSkillDoc.category);
      setLoadingRule(editingSkillDoc.loadingRule);
      setRelevanceTags(editingSkillDoc.relevanceTags.join(', '));
      setIsGlobal(!editingSkillDoc.personaId);
    }
  }, [editingSkillDoc]);

  const tokenCount = Math.ceil(content.length / 4);

  const handleSave = () => {
    if (!title.trim()) return;

    const tags = relevanceTags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const personaId = isGlobal ? null : (currentPersona?.id || null);

    if (isEditing) {
      updateSkillDoc(editingSkillDoc!.id, {
        title: title.trim(),
        content,
        category: category as any,
        loadingRule: loadingRule as any,
        relevanceTags: tags,
        personaId,
      });
    } else {
      createSkillDoc({
        title: title.trim(),
        content,
        category,
        loadingRule,
        relevanceTags: tags,
        personaId,
      });
    }
  };

  const handleClose = () => {
    setShowSkillDocEditor(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
      <div className="w-[640px] max-h-[85vh] flex flex-col bg-[#16213e] rounded-xl border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <h2 className="text-base font-semibold text-surface-200">
            {isEditing ? 'Edit Skill Doc' : 'New Skill Doc'}
          </h2>
          <button
            onClick={handleClose}
            className="text-surface-400 hover:text-surface-200 text-lg"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs text-surface-400 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., API Design Principles"
              className="w-full px-3 py-2 text-sm bg-[var(--bg-input)] border border-white/10 rounded-lg text-surface-200 placeholder:text-surface-600 focus:outline-none focus:border-primary-500/50"
            />
          </div>

          {/* Category + Loading Rule row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-surface-400 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[var(--bg-input)] border border-white/10 rounded-lg text-surface-200 focus:outline-none focus:border-primary-500/50"
              >
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-surface-400 mb-1">Loading Rule</label>
              <select
                value={loadingRule}
                onChange={(e) => setLoadingRule(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[var(--bg-input)] border border-white/10 rounded-lg text-surface-200 focus:outline-none focus:border-primary-500/50"
              >
                {LOADING_RULES.map(r => (
                  <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Content */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-surface-400">Content</label>
              <span className="text-xs text-surface-500">~{tokenCount.toLocaleString()} tokens</span>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter skill doc content..."
              rows={12}
              className="w-full px-3 py-2 text-sm bg-[var(--bg-input)] border border-white/10 rounded-lg text-surface-200 placeholder:text-surface-600 focus:outline-none focus:border-primary-500/50 resize-none font-mono"
            />
          </div>

          {/* Relevance Tags */}
          <div>
            <label className="block text-xs text-surface-400 mb-1">Relevance Tags (comma-separated)</label>
            <input
              type="text"
              value={relevanceTags}
              onChange={(e) => setRelevanceTags(e.target.value)}
              placeholder="e.g., architecture, api, design"
              className="w-full px-3 py-2 text-sm bg-[var(--bg-input)] border border-white/10 rounded-lg text-surface-200 placeholder:text-surface-600 focus:outline-none focus:border-primary-500/50"
            />
          </div>

          {/* Global toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsGlobal(!isGlobal)}
              className={`w-10 h-5 rounded-full transition-colors relative ${isGlobal ? 'bg-primary-500' : 'bg-surface-600'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${isGlobal ? 'left-5' : 'left-0.5'}`} />
            </button>
            <div>
              <span className="text-sm text-surface-300">Global Document</span>
              <p className="text-xs text-surface-500">Available to all personas, not just {currentPersona?.name || 'this persona'}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-white/5">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-xs text-surface-400 hover:text-surface-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className="px-4 py-2 text-xs bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isEditing ? 'Save Changes' : 'Create Skill Doc'}
          </button>
        </div>
      </div>
    </div>
  );
}
