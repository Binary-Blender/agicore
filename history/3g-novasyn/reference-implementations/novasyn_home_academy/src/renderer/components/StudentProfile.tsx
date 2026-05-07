import React, { useState, useEffect } from 'react';
import { useAcademyStore } from '../store/academyStore';

const PHILOSOPHIES = [
  { value: 'traditional', label: 'Traditional' },
  { value: 'charlotte_mason', label: 'Charlotte Mason' },
  { value: 'classical', label: 'Classical' },
  { value: 'unit_study', label: 'Unit Study' },
  { value: 'montessori', label: 'Montessori' },
  { value: 'unschooling', label: 'Unschooling' },
  { value: 'eclectic', label: 'Eclectic' },
];

const GRADE_LEVELS = ['Pre-K', 'K', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

const AVATAR_EMOJIS = ['🎓', '👧', '👦', '🧒', '👩‍🎓', '👨‍🎓', '🦸‍♀️', '🦸‍♂️', '🧙‍♀️', '🧙‍♂️', '🦊', '🐱', '🐶', '🦄', '🐼', '🦋'];

export default function StudentProfile() {
  const { editingStudent, createStudent, updateStudent, setShowStudentProfile, setEditingStudent } = useAcademyStore();

  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [state, setState] = useState('');
  const [avatarEmoji, setAvatarEmoji] = useState('🎓');
  const [interests, setInterests] = useState<string[]>([]);
  const [interestInput, setInterestInput] = useState('');
  const [learningStyle, setLearningStyle] = useState<Record<string, number>>({
    visual: 0.5, auditory: 0.5, kinesthetic: 0.5, 'reading/writing': 0.5,
  });
  const [strengths, setStrengths] = useState<string[]>([]);
  const [strengthInput, setStrengthInput] = useState('');
  const [struggles, setStruggles] = useState<string[]>([]);
  const [struggleInput, setStruggleInput] = useState('');
  const [teachingPhilosophy, setTeachingPhilosophy] = useState('eclectic');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (editingStudent) {
      setName(editingStudent.name);
      setBirthDate(editingStudent.birthDate || '');
      setGradeLevel(editingStudent.gradeLevel || '');
      setState(editingStudent.state || '');
      setAvatarEmoji(editingStudent.avatarEmoji);
      setInterests(editingStudent.interests);
      setLearningStyle({
        visual: 0.5, auditory: 0.5, kinesthetic: 0.5, 'reading/writing': 0.5,
        ...editingStudent.learningStyle,
      });
      setStrengths(editingStudent.strengths);
      setStruggles(editingStudent.struggles);
      setTeachingPhilosophy(editingStudent.teachingPhilosophy);
      setNotes(editingStudent.notes);
    }
  }, [editingStudent]);

  const handleSave = async () => {
    if (!name.trim()) return;

    const input = {
      name: name.trim(),
      birthDate: birthDate || undefined,
      gradeLevel: gradeLevel || undefined,
      state: state || undefined,
      avatarEmoji,
      interests,
      learningStyle,
      strengths,
      struggles,
      teachingPhilosophy,
      notes,
    };

    if (editingStudent) {
      await updateStudent(editingStudent.id, input);
    } else {
      await createStudent(input);
    }
  };

  const handleClose = () => {
    setShowStudentProfile(false);
    setEditingStudent(null);
  };

  const addTag = (list: string[], setList: (v: string[]) => void, value: string, setInput: (v: string) => void) => {
    const trimmed = value.trim();
    if (trimmed && !list.includes(trimmed)) {
      setList([...list, trimmed]);
    }
    setInput('');
  };

  const removeTag = (list: string[], setList: (v: string[]) => void, index: number) => {
    setList(list.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border)] w-[600px] max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold text-[var(--text-heading)]">
            {editingStudent ? 'Edit Student' : 'Add Student'}
          </h2>
          <button onClick={handleClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Avatar */}
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Avatar</label>
            <div className="flex flex-wrap gap-1">
              {AVATAR_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setAvatarEmoji(emoji)}
                  className={`w-8 h-8 flex items-center justify-center rounded transition-all ${
                    avatarEmoji === emoji ? 'ring-2 ring-primary-500 bg-primary-500/20' : 'hover:bg-[var(--border)]'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Student name"
              className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* DOB + Grade + State */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Date of Birth</label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Grade</label>
              <select
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">Select...</option>
                {GRADE_LEVELS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">State</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="e.g. TX"
                className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Interests */}
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Interests</label>
            <div className="flex flex-wrap gap-1 mb-1">
              {interests.map((tag, i) => (
                <span key={i} className="px-2 py-0.5 bg-primary-500/20 text-primary-300 text-xs rounded-full flex items-center gap-1">
                  {tag}
                  <button onClick={() => removeTag(interests, setInterests, i)} className="hover:text-white">✕</button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={interestInput}
              onChange={(e) => setInterestInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(interests, setInterests, interestInput, setInterestInput); } }}
              placeholder="Type and press Enter"
              className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Learning Style */}
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-2">Learning Style</label>
            <div className="space-y-2">
              {Object.entries(learningStyle).map(([key, value]) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-xs text-[var(--text-muted)] w-24 capitalize">{key}</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={value}
                    onChange={(e) => setLearningStyle({ ...learningStyle, [key]: parseFloat(e.target.value) })}
                    className="flex-1 accent-primary-500"
                  />
                  <span className="text-xs text-[var(--text-muted)] w-8">{Math.round(value * 100)}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Strengths */}
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Strengths</label>
            <div className="flex flex-wrap gap-1 mb-1">
              {strengths.map((tag, i) => (
                <span key={i} className="px-2 py-0.5 bg-green-500/20 text-green-300 text-xs rounded-full flex items-center gap-1">
                  {tag}
                  <button onClick={() => removeTag(strengths, setStrengths, i)} className="hover:text-white">✕</button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={strengthInput}
              onChange={(e) => setStrengthInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(strengths, setStrengths, strengthInput, setStrengthInput); } }}
              placeholder="Type and press Enter"
              className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Struggles */}
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Areas Needing Work</label>
            <div className="flex flex-wrap gap-1 mb-1">
              {struggles.map((tag, i) => (
                <span key={i} className="px-2 py-0.5 bg-orange-500/20 text-orange-300 text-xs rounded-full flex items-center gap-1">
                  {tag}
                  <button onClick={() => removeTag(struggles, setStruggles, i)} className="hover:text-white">✕</button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={struggleInput}
              onChange={(e) => setStruggleInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(struggles, setStruggles, struggleInput, setStruggleInput); } }}
              placeholder="Type and press Enter"
              className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Teaching Philosophy */}
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Teaching Philosophy</label>
            <select
              value={teachingPhilosophy}
              onChange={(e) => setTeachingPhilosophy(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              {PHILOSOPHIES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Additional notes about this student..."
              className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-[var(--border)]">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {editingStudent ? 'Save Changes' : 'Add Student'}
          </button>
        </div>
      </div>
    </div>
  );
}
