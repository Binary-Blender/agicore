import React from 'react';
import { useAcademyStore } from '../store/academyStore';

export default function Sidebar() {
  const {
    students,
    currentStudent,
    currentView,
    selectStudent,
    setCurrentView,
    setShowStudentProfile,
    setEditingStudent,
    setShowSettings,
  } = useAcademyStore();

  const navItems: { view: typeof currentView; icon: string; label: string }[] = [
    { view: 'dashboard', icon: '🏠', label: 'Dashboard' },
    { view: 'schedule', icon: '📅', label: 'Schedule' },
    { view: 'weekly', icon: '📊', label: 'Weekly' },
    { view: 'subjects', icon: '📚', label: 'Subjects' },
    { view: 'skills', icon: '🎯', label: 'Skills' },
    { view: 'planner', icon: '✨', label: 'Planner' },
    { view: 'assessments', icon: '📝', label: 'Assessments' },
    { view: 'reading', icon: '📖', label: 'Reading' },
    { view: 'progress', icon: '📈', label: 'Progress' },
    { view: 'tutor', icon: '🤖', label: 'AI Tutor' },
    { view: 'resources', icon: '📄', label: 'Resources' },
    { view: 'quest', icon: '🎮', label: 'Quest' },
    { view: 'compliance', icon: '📋', label: 'Records' },
  ];

  return (
    <div className="w-14 flex flex-col items-center py-2 gap-1 bg-[var(--bg-panel)] border-r border-[var(--border)]">
      {/* Student avatars */}
      <div className="flex flex-col items-center gap-1 mb-2 pb-2 border-b border-[var(--border)]">
        {students.map((student) => (
          <button
            key={student.id}
            onClick={() => selectStudent(student)}
            onDoubleClick={() => {
              setEditingStudent(student);
              setShowStudentProfile(true);
            }}
            className={`w-9 h-9 flex items-center justify-center rounded-lg text-lg transition-all ${
              currentStudent?.id === student.id
                ? 'ring-2 ring-primary-500 bg-primary-500/20'
                : 'hover:bg-[var(--border)]'
            }`}
            title={student.name}
          >
            {student.avatarEmoji}
          </button>
        ))}

        <button
          onClick={() => {
            setEditingStudent(null);
            setShowStudentProfile(true);
          }}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--border)] hover:text-[var(--text-primary)] transition-colors"
          title="Add Student"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="8" y1="3" x2="8" y2="13" />
            <line x1="3" y1="8" x2="13" y2="8" />
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <div className="flex flex-col items-center gap-1 flex-1">
        {navItems.map((item) => (
          <button
            key={item.view}
            onClick={() => setCurrentView(item.view)}
            className={`w-9 h-9 flex items-center justify-center rounded-lg text-base transition-all ${
              currentView === item.view
                ? 'ring-2 ring-primary-500 bg-primary-500/20'
                : 'hover:bg-[var(--border)]'
            }`}
            title={item.label}
          >
            {item.icon}
          </button>
        ))}
      </div>

      {/* Bottom: Settings */}
      <button
        onClick={() => setShowSettings(true)}
        className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--border)] transition-colors"
        title="Settings"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 10a2 2 0 100-4 2 2 0 000 4zm6.32-1.906l-1.12-.65a5.07 5.07 0 000-2.888l1.12-.65a.5.5 0 00.183-.683l-1-1.732a.5.5 0 00-.683-.183l-1.12.65a5.07 5.07 0 00-2.5-1.444V.5a.5.5 0 00-.5-.5h-2a.5.5 0 00-.5.5v1.214a5.07 5.07 0 00-2.5 1.444l-1.12-.65a.5.5 0 00-.683.183l-1 1.732a.5.5 0 00.183.683l1.12.65a5.07 5.07 0 000 2.888l-1.12.65a.5.5 0 00-.183.683l1 1.732a.5.5 0 00.683.183l1.12-.65a5.07 5.07 0 002.5 1.444V15.5a.5.5 0 00.5.5h2a.5.5 0 00.5-.5v-1.214a5.07 5.07 0 002.5-1.444l1.12.65a.5.5 0 00.683-.183l1-1.732a.5.5 0 00-.183-.683z" />
        </svg>
      </button>
    </div>
  );
}
