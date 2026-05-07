import React, { useState } from 'react';
import { useAcademyStore } from '../store/academyStore';
import type { CreateSchoolYearInput } from '../../shared/types';

const SUBJECT_COLORS = [
  '#4c6ef5', '#7950f2', '#be4bdb', '#e64980', '#fa5252',
  '#fd7e14', '#fab005', '#40c057', '#12b886', '#15aabf',
];

const STANDARD_SUBJECTS = [
  { name: 'Math', color: '#4c6ef5' },
  { name: 'Reading', color: '#7950f2' },
  { name: 'Writing', color: '#be4bdb' },
  { name: 'Science', color: '#40c057' },
  { name: 'Social Studies', color: '#fd7e14' },
  { name: 'Art', color: '#e64980' },
  { name: 'PE', color: '#15aabf' },
];

export default function SubjectManager() {
  const {
    currentStudent,
    currentSchoolYear,
    subjects,
    createSubject,
    updateSubject,
    deleteSubject,
    createSchoolYear,
  } = useAcademyStore();

  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(SUBJECT_COLORS[0]);
  const [newHours, setNewHours] = useState('5');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editHours, setEditHours] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // School year creation
  const [showYearForm, setShowYearForm] = useState(false);
  const [yearName, setYearName] = useState('');
  const [yearStart, setYearStart] = useState('');
  const [yearEnd, setYearEnd] = useState('');

  if (!currentStudent) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[var(--text-muted)]">Select a student first.</p>
      </div>
    );
  }

  if (!currentSchoolYear) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-3">📅</div>
          <h2 className="text-lg font-semibold text-[var(--text-heading)] mb-2">Create a School Year</h2>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            Set up an academic year for {currentStudent.name} to start adding subjects.
          </p>
          {!showYearForm ? (
            <button
              onClick={() => {
                const now = new Date();
                const startMonth = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
                setYearName(`${startMonth}-${startMonth + 1}`);
                setYearStart(`${startMonth}-08-01`);
                setYearEnd(`${startMonth + 1}-06-30`);
                setShowYearForm(true);
              }}
              className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700"
            >
              Create School Year
            </button>
          ) : (
            <div className="text-left space-y-3 bg-[var(--bg-panel)] p-4 rounded-lg border border-[var(--border)]">
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Year Name</label>
                <input
                  type="text"
                  value={yearName}
                  onChange={(e) => setYearName(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">Start</label>
                  <input type="date" value={yearStart} onChange={(e) => setYearStart(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">End</label>
                  <input type="date" value={yearEnd} onChange={(e) => setYearEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-primary-500" />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    if (yearName && yearStart && yearEnd) {
                      await createSchoolYear({
                        studentId: currentStudent.id,
                        name: yearName,
                        startDate: yearStart,
                        endDate: yearEnd,
                      });
                      setShowYearForm(false);
                    }
                  }}
                  className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700"
                >
                  Create
                </button>
                <button onClick={() => setShowYearForm(false)} className="px-4 py-2 text-sm text-[var(--text-muted)]">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const handleAddSubject = async () => {
    if (!newName.trim()) return;
    await createSubject({
      studentId: currentStudent.id,
      schoolYearId: currentSchoolYear.id,
      name: newName.trim(),
      color: newColor,
      targetHoursPerWeek: parseFloat(newHours) || 5,
    });
    setNewName('');
    setNewHours('5');
  };

  const handleAddStandardSet = async () => {
    const existingNames = new Set(subjects.map(s => s.name.toLowerCase()));
    for (const sub of STANDARD_SUBJECTS) {
      if (!existingNames.has(sub.name.toLowerCase())) {
        await createSubject({
          studentId: currentStudent.id,
          schoolYearId: currentSchoolYear.id,
          name: sub.name,
          color: sub.color,
          targetHoursPerWeek: 5,
        });
      }
    }
  };

  const startEdit = (subject: { id: string; name: string; color: string; targetHoursPerWeek: number }) => {
    setEditingId(subject.id);
    setEditName(subject.name);
    setEditColor(subject.color);
    setEditHours(subject.targetHoursPerWeek.toString());
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    await updateSubject(editingId, {
      name: editName.trim(),
      color: editColor,
      targetHoursPerWeek: parseFloat(editHours) || 5,
    });
    setEditingId(null);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-[var(--text-heading)]">
            Subjects — {currentStudent.name}
          </h1>
          <p className="text-xs text-[var(--text-muted)]">
            {currentSchoolYear.name} &middot; {subjects.length} subjects
          </p>
        </div>
        {subjects.length === 0 && (
          <button
            onClick={handleAddStandardSet}
            className="px-3 py-1.5 bg-accent-600 text-white text-sm rounded-lg hover:bg-accent-700 transition-colors"
          >
            Add Standard Set
          </button>
        )}
      </div>

      {/* Subject List */}
      <div className="space-y-2 mb-6">
        {subjects.map((subject) => (
          <div
            key={subject.id}
            className="flex items-center gap-3 px-4 py-3 bg-[var(--bg-panel)] rounded-lg border border-[var(--border)]"
          >
            {editingId === subject.id ? (
              <>
                <div className="flex gap-1">
                  {SUBJECT_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setEditColor(c)}
                      className={`w-5 h-5 rounded-full ${editColor === c ? 'ring-2 ring-white' : ''}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 px-2 py-1 bg-[var(--bg-input)] border border-[var(--border)] rounded text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-primary-500"
                  autoFocus
                />
                <input
                  type="number"
                  value={editHours}
                  onChange={(e) => setEditHours(e.target.value)}
                  className="w-16 px-2 py-1 bg-[var(--bg-input)] border border-[var(--border)] rounded text-sm text-[var(--text-primary)] focus:outline-none"
                  step="0.5"
                  min="0"
                />
                <span className="text-xs text-[var(--text-muted)]">hrs/wk</span>
                <button onClick={saveEdit} className="text-green-400 hover:text-green-300 text-sm">Save</button>
                <button onClick={() => setEditingId(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm">Cancel</button>
              </>
            ) : (
              <>
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: subject.color }} />
                <span className="flex-1 text-sm text-[var(--text-primary)]">{subject.name}</span>
                <span className="text-xs text-[var(--text-muted)]">
                  {subject.actualHours.toFixed(1)} / {subject.targetHoursPerWeek} hrs
                </span>
                <button onClick={() => startEdit(subject)} className="text-xs text-primary-400 hover:text-primary-300">
                  Edit
                </button>
                {showDeleteConfirm === subject.id ? (
                  <div className="flex items-center gap-1">
                    <button onClick={() => { deleteSubject(subject.id); setShowDeleteConfirm(null); }} className="text-xs text-red-400">
                      Confirm
                    </button>
                    <button onClick={() => setShowDeleteConfirm(null)} className="text-xs text-[var(--text-muted)]">
                      No
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setShowDeleteConfirm(subject.id)} className="text-xs text-red-400/60 hover:text-red-400">
                    Delete
                  </button>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Add Subject Form */}
      <div className="bg-[var(--bg-panel)] rounded-lg border border-[var(--border)] p-4">
        <h3 className="text-sm font-semibold text-[var(--text-heading)] mb-3">Add Subject</h3>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {SUBJECT_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className={`w-5 h-5 rounded-full transition-all ${newColor === c ? 'ring-2 ring-white' : ''}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddSubject(); }}
            placeholder="Subject name"
            className="flex-1 px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <input
            type="number"
            value={newHours}
            onChange={(e) => setNewHours(e.target.value)}
            className="w-16 px-2 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none"
            step="0.5"
            min="0"
          />
          <span className="text-xs text-[var(--text-muted)]">hrs/wk</span>
          <button
            onClick={handleAddSubject}
            disabled={!newName.trim()}
            className="px-3 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
