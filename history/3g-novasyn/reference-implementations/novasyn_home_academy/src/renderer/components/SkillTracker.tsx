import React, { useState } from 'react';
import { useAcademyStore } from '../store/academyStore';
import type { Skill } from '../../shared/types';

const PROFICIENCY_LABELS = ['', 'Intro', 'Developing', 'Proficient', 'Advanced', 'Mastered'];
const PROFICIENCY_COLORS = ['', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981'];

export default function SkillTracker() {
  const {
    currentStudent,
    subjects,
    skills,
    createSkill,
    updateSkill,
    deleteSkill,
  } = useAcademyStore();

  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [newSkillName, setNewSkillName] = useState('');
  const [addingToSubject, setAddingToSubject] = useState<string | null>(null);

  if (!currentStudent) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[var(--text-muted)]">Select a student first.</p>
      </div>
    );
  }

  const skillsBySubject = subjects.map(s => ({
    subject: s,
    skills: skills.filter(sk => sk.subjectId === s.id),
  }));

  const handleAddSkill = async (subjectId: string) => {
    if (!newSkillName.trim() || !currentStudent) return;
    await createSkill({
      studentId: currentStudent.id,
      subjectId,
      name: newSkillName.trim(),
    });
    setNewSkillName('');
    setAddingToSubject(null);
  };

  const handleProficiencyChange = async (skill: Skill, newLevel: number) => {
    await updateSkill(skill.id, { proficiency: newLevel });
  };

  const handleDelete = async (skill: Skill) => {
    if (confirm(`Delete skill "${skill.name}"?`)) {
      await deleteSkill(skill.id);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold text-[var(--text-heading)]">Skill Tracker</h1>
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          {PROFICIENCY_LABELS.slice(1).map((label, i) => (
            <span key={label} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PROFICIENCY_COLORS[i + 1] }} />
              {label}
            </span>
          ))}
        </div>
      </div>

      {subjects.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">🎯</div>
          <p className="text-[var(--text-muted)]">Add subjects first to start tracking skills.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {skillsBySubject.map(({ subject, skills: subjectSkills }) => {
            const isExpanded = expandedSubject === subject.id || expandedSubject === null;
            const avgProficiency = subjectSkills.length > 0
              ? subjectSkills.reduce((s, sk) => s + sk.proficiency, 0) / subjectSkills.length
              : 0;

            return (
              <div key={subject.id} className="bg-[var(--bg-panel)] rounded-lg border border-[var(--border)]">
                {/* Subject Header */}
                <button
                  onClick={() => setExpandedSubject(expandedSubject === subject.id ? null : subject.id)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-[var(--bg-input)] transition-colors rounded-t-lg"
                >
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: subject.color }} />
                  <span className="text-sm font-semibold text-[var(--text-heading)] flex-1 text-left">
                    {subject.name}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {subjectSkills.length} skill{subjectSkills.length !== 1 ? 's' : ''}
                    {avgProficiency > 0 && ` · avg ${avgProficiency.toFixed(1)}`}
                  </span>
                  <span className="text-[var(--text-muted)] text-xs">{isExpanded ? '▼' : '▶'}</span>
                </button>

                {/* Skills List */}
                {isExpanded && (
                  <div className="border-t border-[var(--border)] p-4 space-y-3">
                    {subjectSkills.length === 0 ? (
                      <p className="text-xs text-[var(--text-muted)] text-center py-2">
                        No skills yet. Complete lessons and assessments to build skills, or add them manually.
                      </p>
                    ) : (
                      subjectSkills.map(skill => (
                        <div key={skill.id} className="flex items-center gap-3">
                          <span className="text-sm text-[var(--text-primary)] w-40 truncate" title={skill.name}>
                            {skill.name}
                          </span>

                          {/* Proficiency Bar */}
                          <div className="flex gap-1 flex-1">
                            {[1, 2, 3, 4, 5].map(level => (
                              <button
                                key={level}
                                onClick={() => handleProficiencyChange(skill, level)}
                                className="h-6 flex-1 rounded transition-all"
                                style={{
                                  backgroundColor: level <= skill.proficiency ? PROFICIENCY_COLORS[level] : 'var(--border)',
                                  opacity: level <= skill.proficiency ? 1 : 0.3,
                                }}
                                title={`${PROFICIENCY_LABELS[level]} (${level}/5)`}
                              />
                            ))}
                          </div>

                          <span className="text-xs text-[var(--text-muted)] w-20 text-right">
                            {PROFICIENCY_LABELS[skill.proficiency]}
                          </span>
                          <span className="text-xs text-[var(--text-muted)] w-16 text-right">
                            {skill.timesPracticed}x
                          </span>

                          <button
                            onClick={() => handleDelete(skill)}
                            className="text-[var(--text-muted)] hover:text-red-400 text-xs"
                            title="Delete skill"
                          >
                            ✕
                          </button>
                        </div>
                      ))
                    )}

                    {/* Add Skill */}
                    {addingToSubject === subject.id ? (
                      <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)]">
                        <input
                          type="text"
                          value={newSkillName}
                          onChange={e => setNewSkillName(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleAddSkill(subject.id)}
                          placeholder="Skill name..."
                          className="flex-1 px-3 py-1.5 bg-[var(--bg-input)] border border-[var(--border)] rounded text-sm text-[var(--text-primary)] placeholder:text-[var(--text-placeholder)] focus:outline-none focus:ring-1 focus:ring-primary-500"
                          autoFocus
                        />
                        <button
                          onClick={() => handleAddSkill(subject.id)}
                          className="px-3 py-1.5 bg-primary-600 text-white text-xs rounded hover:bg-primary-700"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => { setAddingToSubject(null); setNewSkillName(''); }}
                          className="px-3 py-1.5 text-[var(--text-muted)] text-xs hover:text-[var(--text-primary)]"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAddingToSubject(subject.id)}
                        className="text-xs text-primary-400 hover:text-primary-300 pt-1"
                      >
                        + Add Skill
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
