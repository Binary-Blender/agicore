import React, { useState } from 'react';
import { useCouncilStore } from '../store/councilStore';
import type { Relationship, RelationshipType, CreateRelationshipInput } from '../../shared/types';

const RELATIONSHIP_TYPES: { value: RelationshipType; label: string; color: string }[] = [
  { value: 'ally', label: 'Ally', color: 'bg-green-600/30 text-green-300' },
  { value: 'collaborator', label: 'Collaborator', color: 'bg-blue-600/30 text-blue-300' },
  { value: 'mentor', label: 'Mentor', color: 'bg-purple-600/30 text-purple-300' },
  { value: 'mentee', label: 'Mentee', color: 'bg-indigo-600/30 text-indigo-300' },
  { value: 'challenger', label: 'Challenger', color: 'bg-orange-600/30 text-orange-300' },
  { value: 'rival', label: 'Rival', color: 'bg-red-600/30 text-red-300' },
  { value: 'neutral', label: 'Neutral', color: 'bg-gray-600/30 text-gray-300' },
];

function getTypeConfig(type: string) {
  return RELATIONSHIP_TYPES.find(t => t.value === type) || RELATIONSHIP_TYPES[6];
}

export default function RelationshipPanel() {
  const {
    currentPersona, personas, relationships,
    suggestedRelationships, suggestingRelationships,
    currentMeeting,
    createRelationship, updateRelationship, deleteRelationship,
    suggestRelationshipsFromMeeting, acceptSuggestedRelationship, dismissSuggestedRelationship,
    setShowRelationshipPanel,
  } = useCouncilStore();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    relatedPersonaId: string;
    relationshipType: RelationshipType;
    description: string;
    dynamic: string;
    strength: number;
  }>({
    relatedPersonaId: '',
    relationshipType: 'collaborator',
    description: '',
    dynamic: '',
    strength: 0.5,
  });

  if (!currentPersona) return null;

  // Other personas that could be related
  const otherPersonas = personas.filter(p => p.id !== currentPersona.id);

  // Get persona name by id
  const getPersonaName = (id: string) => {
    if (id === currentPersona.id) return currentPersona.name;
    return personas.find(p => p.id === id)?.name || 'Unknown';
  };

  const getPersonaEmoji = (id: string) => {
    if (id === currentPersona.id) return currentPersona.avatarEmoji;
    return personas.find(p => p.id === id)?.avatarEmoji || '👤';
  };

  // For each relationship, figure out "the other persona" relative to currentPersona
  const getOtherPersonaId = (rel: Relationship) => {
    return rel.personaId === currentPersona.id ? rel.relatedPersonaId : rel.personaId;
  };

  const handleSave = async () => {
    if (!formData.relatedPersonaId || !formData.description.trim()) return;

    if (editingId) {
      await updateRelationship(editingId, {
        relationshipType: formData.relationshipType,
        description: formData.description,
        dynamic: formData.dynamic || null,
        strength: formData.strength,
      });
      setEditingId(null);
    } else {
      await createRelationship({
        personaId: currentPersona.id,
        relatedPersonaId: formData.relatedPersonaId,
        relationshipType: formData.relationshipType,
        description: formData.description,
        dynamic: formData.dynamic || undefined,
        strength: formData.strength,
      });
    }

    setShowAddForm(false);
    setFormData({ relatedPersonaId: '', relationshipType: 'collaborator', description: '', dynamic: '', strength: 0.5 });
  };

  const startEdit = (rel: Relationship) => {
    setEditingId(rel.id);
    setFormData({
      relatedPersonaId: getOtherPersonaId(rel),
      relationshipType: rel.relationshipType,
      description: rel.description,
      dynamic: rel.dynamic || '',
      strength: rel.strength,
    });
    setShowAddForm(true);
  };

  const cancelForm = () => {
    setShowAddForm(false);
    setEditingId(null);
    setFormData({ relatedPersonaId: '', relationshipType: 'collaborator', description: '', dynamic: '', strength: 0.5 });
  };

  // Personas already in a relationship with current persona
  const relatedIds = new Set(relationships.map(r => getOtherPersonaId(r)));
  const availablePersonas = editingId
    ? otherPersonas
    : otherPersonas.filter(p => !relatedIds.has(p.id));

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setShowRelationshipPanel(false)}>
      <div className="w-[600px] max-h-[80vh] flex flex-col bg-[#16213e] rounded-lg border border-white/10 shadow-xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div>
            <h2 className="text-lg font-semibold text-surface-200">Relationships</h2>
            <p className="text-xs text-surface-500 mt-0.5">
              {currentPersona.avatarEmoji} {currentPersona.name}'s relationships with other personas
            </p>
          </div>
          <button onClick={() => setShowRelationshipPanel(false)} className="text-surface-500 hover:text-surface-300 text-xl leading-none">&times;</button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5">
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              disabled={availablePersonas.length === 0}
              className="px-3 py-1.5 text-xs bg-primary-600 hover:bg-primary-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded"
            >
              + Add Relationship
            </button>
          )}
          {currentMeeting && (
            <button
              onClick={suggestRelationshipsFromMeeting}
              disabled={suggestingRelationships}
              className="px-3 py-1.5 text-xs bg-cyan-600/30 hover:bg-cyan-600/50 disabled:opacity-40 text-cyan-300 rounded"
            >
              {suggestingRelationships ? 'Analyzing...' : 'Suggest from Meeting'}
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Add/Edit Form */}
          {showAddForm && (
            <div className="bg-[#1a1a2e]/80 border border-primary-500/30 rounded p-3 space-y-3">
              <h3 className="text-sm font-medium text-surface-300">
                {editingId ? 'Edit Relationship' : 'New Relationship'}
              </h3>

              {/* Persona selector */}
              {!editingId && (
                <div>
                  <label className="text-xs text-surface-500 block mb-1">With Persona</label>
                  <select
                    value={formData.relatedPersonaId}
                    onChange={e => setFormData(prev => ({ ...prev, relatedPersonaId: e.target.value }))}
                    className="w-full bg-[var(--bg-input)] border border-white/10 rounded px-2 py-1.5 text-sm text-surface-200"
                  >
                    <option value="">Select a persona...</option>
                    {availablePersonas.map(p => (
                      <option key={p.id} value={p.id}>{p.avatarEmoji} {p.name} — {p.role}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Type selector */}
              <div>
                <label className="text-xs text-surface-500 block mb-1">Relationship Type</label>
                <div className="flex flex-wrap gap-1.5">
                  {RELATIONSHIP_TYPES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => setFormData(prev => ({ ...prev, relationshipType: t.value }))}
                      className={`px-2 py-1 text-xs rounded ${formData.relationshipType === t.value ? t.color + ' ring-1 ring-white/30' : 'bg-white/5 text-surface-400 hover:bg-white/10'}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs text-surface-500 block mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="e.g., Alex respects Morgan's technical depth but pushes back on aggressive timelines"
                  rows={2}
                  className="w-full bg-[var(--bg-input)] border border-white/10 rounded px-2 py-1.5 text-sm text-surface-200 placeholder:text-surface-600 resize-none"
                />
              </div>

              {/* Dynamic */}
              <div>
                <label className="text-xs text-surface-500 block mb-1">Dynamic (optional)</label>
                <input
                  type="text"
                  value={formData.dynamic}
                  onChange={e => setFormData(prev => ({ ...prev, dynamic: e.target.value }))}
                  placeholder="e.g., constructive tension, mutual respect"
                  className="w-full bg-[var(--bg-input)] border border-white/10 rounded px-2 py-1.5 text-sm text-surface-200 placeholder:text-surface-600"
                />
              </div>

              {/* Strength */}
              <div>
                <label className="text-xs text-surface-500 block mb-1">
                  Strength: {(formData.strength * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={formData.strength}
                  onChange={e => setFormData(prev => ({ ...prev, strength: parseFloat(e.target.value) }))}
                  className="w-full accent-primary-500"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-2 justify-end">
                <button onClick={cancelForm} className="px-3 py-1.5 text-xs text-surface-400 hover:text-surface-200">
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!editingId && !formData.relatedPersonaId || !formData.description.trim()}
                  className="px-3 py-1.5 text-xs bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white rounded"
                >
                  {editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          )}

          {/* AI Suggestions */}
          {suggestedRelationships.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-cyan-400 uppercase tracking-wider">AI Suggestions</h3>
              {suggestedRelationships.map((suggestion, i) => {
                const typeConf = getTypeConfig(suggestion.relationshipType);
                return (
                  <div key={i} className="bg-[#1a1a2e]/80 border border-cyan-500/20 rounded p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span>{getPersonaEmoji(suggestion.personaId)}</span>
                          <span className="text-surface-400 text-xs">&#x2194;</span>
                          <span>{getPersonaEmoji(suggestion.relatedPersonaId)}</span>
                          <span className={`px-1.5 py-0.5 text-[10px] rounded ${typeConf.color}`}>{typeConf.label}</span>
                        </div>
                        <p className="text-sm text-surface-300">{suggestion.description}</p>
                        {suggestion.dynamic && (
                          <p className="text-xs text-surface-500 mt-1">Dynamic: {suggestion.dynamic}</p>
                        )}
                        <p className="text-xs text-cyan-400/60 mt-1 italic">{suggestion.reason}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => acceptSuggestedRelationship(suggestion)}
                          className="px-2 py-1 text-xs bg-green-600/30 hover:bg-green-600/50 text-green-300 rounded"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => dismissSuggestedRelationship(i)}
                          className="px-2 py-1 text-xs text-surface-500 hover:text-surface-300"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Existing Relationships */}
          {relationships.length > 0 ? (
            <div className="space-y-2">
              {suggestedRelationships.length > 0 && (
                <h3 className="text-xs font-medium text-surface-500 uppercase tracking-wider">Current Relationships</h3>
              )}
              {relationships.map(rel => {
                const otherId = getOtherPersonaId(rel);
                const otherName = getPersonaName(otherId);
                const otherEmoji = getPersonaEmoji(otherId);
                const otherRole = personas.find(p => p.id === otherId)?.role || '';
                const typeConf = getTypeConfig(rel.relationshipType);

                return (
                  <div key={rel.id} className="bg-white/[0.02] border border-white/5 rounded p-3 group">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{otherEmoji}</span>
                          <span className="text-sm font-medium text-surface-200">{otherName}</span>
                          <span className="text-xs text-surface-500">{otherRole}</span>
                          <span className={`px-1.5 py-0.5 text-[10px] rounded ${typeConf.color}`}>{typeConf.label}</span>
                        </div>
                        <p className="text-sm text-surface-400">{rel.description}</p>
                        {rel.dynamic && (
                          <p className="text-xs text-surface-500 mt-1">Dynamic: {rel.dynamic}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] text-surface-600">Strength</span>
                          <div className="w-20 h-1 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-primary-500 rounded-full" style={{ width: `${rel.strength * 100}%` }} />
                          </div>
                          <span className="text-[10px] text-surface-500">{(rel.strength * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={() => startEdit(rel)}
                          className="px-2 py-1 text-xs text-surface-400 hover:text-surface-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteRelationship(rel.id)}
                          className="px-2 py-1 text-xs text-red-400 hover:text-red-300"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            !showAddForm && suggestedRelationships.length === 0 && (
              <div className="text-center py-8">
                <p className="text-surface-500 text-sm">No relationships defined yet.</p>
                <p className="text-surface-600 text-xs mt-1">
                  Add relationships to shape how {currentPersona.name} interacts with other personas in meetings.
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
