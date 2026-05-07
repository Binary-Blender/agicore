import React, { useState } from 'react';
import { useForgeStore } from '../store/forgeStore';
import type { CreateDecisionInput } from '../../shared/types';

const SOURCE_ROLES = ['architect', 'builder', 'reviewer', 'manual'] as const;

const ROLE_COLORS: Record<string, string> = {
  architect: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  builder: 'text-green-400 bg-green-500/10 border-green-500/20',
  reviewer: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  manual: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
};

export function DecisionLog() {
  const { currentProjectId, decisions, addDecision, removeDecision } = useForgeStore();

  const [showForm, setShowForm] = useState(false);
  const [summary, setSummary] = useState('');
  const [reasoning, setReasoning] = useState('');
  const [sourceRole, setSourceRole] = useState<string>('manual');
  const [tagsInput, setTagsInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  function resetForm() {
    setSummary('');
    setReasoning('');
    setSourceRole('manual');
    setTagsInput('');
    setShowForm(false);
  }

  async function handleSave() {
    if (!summary.trim() || !currentProjectId) return;
    setIsSaving(true);

    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const input: CreateDecisionInput = {
        projectId: currentProjectId,
        summary: summary.trim(),
        reasoning: reasoning.trim() || undefined,
        sourceRole,
        tags: tags.length > 0 ? tags : undefined,
      };

      const decision = await window.electronAPI.createDecision(input);
      addDecision(decision);
      resetForm();
    } catch (err) {
      console.error('Failed to create decision:', err);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await window.electronAPI.deleteDecision(id);
    removeDecision(id);
    setConfirmDelete(null);
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header + Log Decision button */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Decision Log
          </h2>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg transition"
            >
              + Log Decision
            </button>
          )}
        </div>

        {/* Inline form */}
        {showForm && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-5">
            <div className="space-y-3">
              {/* Summary */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Summary <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="What was decided?"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Reasoning */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Reasoning</label>
                <textarea
                  value={reasoning}
                  onChange={(e) => setReasoning(e.target.value)}
                  placeholder="Why was this decided? (optional)"
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              {/* Source role */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Source Role</label>
                <select
                  value={sourceRole}
                  onChange={(e) => setSourceRole(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  {SOURCE_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Tags</label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="Comma-separated tags (e.g. architecture, database)"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleSave}
                  disabled={!summary.trim() || isSaving}
                  className="text-xs bg-amber-600 hover:bg-amber-700 disabled:bg-amber-600/50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition"
                >
                  {isSaving ? 'Saving...' : 'Save Decision'}
                </button>
                <button
                  onClick={resetForm}
                  className="text-xs text-gray-400 hover:text-white px-3 py-2 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Decision list */}
        {decisions.length === 0 && !showForm ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-500">
            <p className="text-sm">No decisions logged yet</p>
            <p className="text-xs mt-1 text-gray-600">
              Record architectural decisions to keep a project history
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {decisions.map((dec) => (
              <div
                key={dec.id}
                className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                          ROLE_COLORS[dec.sourceRole] || ROLE_COLORS.manual
                        }`}
                      >
                        {dec.sourceRole}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {new Date(dec.createdAt).toLocaleDateString()}{' '}
                        {new Date(dec.createdAt).toLocaleTimeString()}
                      </span>
                    </div>

                    <p className="text-sm text-white font-medium">{dec.summary}</p>

                    {dec.reasoning && (
                      <p className="text-xs text-gray-400 mt-1.5">{dec.reasoning}</p>
                    )}

                    {dec.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {dec.tags.map((tag, i) => (
                          <span
                            key={i}
                            className="text-[10px] text-gray-400 bg-slate-700 rounded px-1.5 py-0.5"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Delete */}
                  <div className="flex-shrink-0">
                    {confirmDelete === dec.id ? (
                      <div className="flex items-center gap-1 text-xs">
                        <button
                          onClick={() => handleDelete(dec.id)}
                          className="text-red-400 hover:text-red-300 transition"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="text-gray-400 hover:text-white transition"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(dec.id)}
                        className="text-gray-600 hover:text-red-400 text-xs transition opacity-0 group-hover:opacity-100"
                        title="Delete"
                      >
                        &#215;
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
