import React, { useState, useEffect } from 'react';
import { useCouncilStore } from '../store/councilStore';

const MEMORY_TYPES = [
  { value: 'decision', label: 'Decision', color: 'bg-blue-600/30 text-blue-300' },
  { value: 'lesson', label: 'Lesson', color: 'bg-green-600/30 text-green-300' },
  { value: 'fact', label: 'Fact', color: 'bg-yellow-600/30 text-yellow-300' },
  { value: 'preference', label: 'Preference', color: 'bg-purple-600/30 text-purple-300' },
  { value: 'insight', label: 'Insight', color: 'bg-cyan-600/30 text-cyan-300' },
  { value: 'correction', label: 'Correction', color: 'bg-red-600/30 text-red-300' },
];

export default function MemoryEditor() {
  const {
    editingMemory,
    currentPersona,
    setShowMemoryEditor,
    createMemory,
    updateMemory,
  } = useCouncilStore();

  const isEditing = !!editingMemory;

  const [memoryType, setMemoryType] = useState('fact');
  const [content, setContent] = useState('');
  const [importance, setImportance] = useState(0.5);
  const [relevanceTags, setRelevanceTags] = useState('');
  const [isShared, setIsShared] = useState(false);

  useEffect(() => {
    if (editingMemory) {
      setMemoryType(editingMemory.memoryType);
      setContent(editingMemory.content);
      setImportance(editingMemory.importance);
      setRelevanceTags(editingMemory.relevanceTags.join(', '));
      setIsShared(!editingMemory.personaId);
    }
  }, [editingMemory]);

  const handleSave = () => {
    if (!content.trim()) return;

    const tags = relevanceTags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const personaId = isShared ? null : (currentPersona?.id || null);

    if (isEditing) {
      updateMemory(editingMemory!.id, {
        memoryType,
        content: content.trim(),
        importance,
        relevanceTags: tags,
        personaId,
      });
    } else {
      createMemory({
        memoryType,
        content: content.trim(),
        importance,
        relevanceTags: tags,
        personaId,
      });
    }
  };

  const handleClose = () => {
    setShowMemoryEditor(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
      <div className="w-[540px] max-h-[80vh] flex flex-col bg-[#16213e] rounded-xl border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <h2 className="text-base font-semibold text-surface-200">
            {isEditing ? 'Edit Memory' : 'New Memory'}
          </h2>
          <button onClick={handleClose} className="text-surface-400 hover:text-surface-200 text-lg">✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Memory Type */}
          <div>
            <label className="block text-xs text-surface-400 mb-1">Memory Type</label>
            <div className="flex flex-wrap gap-2">
              {MEMORY_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setMemoryType(t.value)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                    memoryType === t.value
                      ? `${t.color} border-white/20`
                      : 'bg-white/[0.02] text-surface-400 border-white/5 hover:border-white/10'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="block text-xs text-surface-400 mb-1">Memory Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="e.g., The team decided to use PostgreSQL over MongoDB for the main database..."
              rows={4}
              className="w-full px-3 py-2 text-sm bg-[var(--bg-input)] border border-white/10 rounded-lg text-surface-200 placeholder:text-surface-600 focus:outline-none focus:border-primary-500/50 resize-none"
            />
          </div>

          {/* Importance Slider */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-surface-400">Importance</label>
              <span className="text-xs text-surface-500">{importance.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={importance}
              onChange={(e) => setImportance(parseFloat(e.target.value))}
              className="w-full accent-primary-500"
            />
            <div className="flex justify-between text-[10px] text-surface-600 mt-0.5">
              <span>Low</span>
              <span>Medium</span>
              <span>Critical</span>
            </div>
          </div>

          {/* Relevance Tags */}
          <div>
            <label className="block text-xs text-surface-400 mb-1">Relevance Tags (comma-separated)</label>
            <input
              type="text"
              value={relevanceTags}
              onChange={(e) => setRelevanceTags(e.target.value)}
              placeholder="e.g., database, architecture, q2"
              className="w-full px-3 py-2 text-sm bg-[var(--bg-input)] border border-white/10 rounded-lg text-surface-200 placeholder:text-surface-600 focus:outline-none focus:border-primary-500/50"
            />
          </div>

          {/* Shared toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsShared(!isShared)}
              className={`w-10 h-5 rounded-full transition-colors relative ${isShared ? 'bg-primary-500' : 'bg-surface-600'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${isShared ? 'left-5' : 'left-0.5'}`} />
            </button>
            <div>
              <span className="text-sm text-surface-300">Shared Memory</span>
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
            disabled={!content.trim()}
            className="px-4 py-2 text-xs bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isEditing ? 'Save Changes' : 'Create Memory'}
          </button>
        </div>
      </div>
    </div>
  );
}
