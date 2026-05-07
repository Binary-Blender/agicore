import React, { useEffect } from 'react';
import { useAcademyStore } from '../store/academyStore';

export default function Dashboard() {
  const {
    currentStudent,
    currentSchoolYear,
    subjects,
    lessons,
    attendance,
    aiCostSummary,
    skills,
    assessments,
    readingLog,
    selectedDate,
    setCurrentView,
    loadAiCostSummary,
  } = useAcademyStore();

  useEffect(() => {
    loadAiCostSummary();
  }, []);

  if (!currentStudent) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🎓</div>
          <h2 className="text-xl font-semibold text-[var(--text-heading)] mb-2">
            Welcome to NovaSyn Academy
          </h2>
          <p className="text-[var(--text-muted)] mb-4">
            Add your first student to get started with AI-powered homeschooling.
          </p>
          <button
            onClick={() => {
              useAcademyStore.getState().setEditingStudent(null);
              useAcademyStore.getState().setShowStudentProfile(true);
            }}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Add Student
          </button>
        </div>
      </div>
    );
  }

  const todayLessons = lessons.filter(l => l.scheduledDate === selectedDate);
  const completedToday = todayLessons.filter(l => l.status === 'completed').length;
  const totalToday = todayLessons.length;

  // Weekly hours calculation
  const today = new Date(selectedDate);
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const mondayStr = monday.toISOString().split('T')[0];
  const sundayDate = new Date(monday);
  sundayDate.setDate(monday.getDate() + 6);
  const sundayStr = sundayDate.toISOString().split('T')[0];

  const weekAttendance = attendance.filter(a => a.date >= mondayStr && a.date <= sundayStr);
  const weeklyMinutes = weekAttendance.reduce((sum, a) => sum + a.totalMinutes, 0);
  const weeklyHours = (weeklyMinutes / 60).toFixed(1);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Student Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 flex items-center justify-center bg-primary-500/20 rounded-xl text-3xl">
          {currentStudent.avatarEmoji}
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--text-heading)]">
            {currentStudent.name}
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            {currentStudent.gradeLevel || 'Grade not set'} &middot; {currentStudent.teachingPhilosophy}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-[var(--text-muted)]">
            {completedToday}/{totalToday} lessons today
          </span>
          {totalToday > 0 && (
            <div className="w-24 h-2 bg-[var(--border)] rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 rounded-full transition-all"
                style={{ width: `${(completedToday / totalToday) * 100}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-[var(--bg-panel)] rounded-lg p-4 border border-[var(--border)]">
          <div className="text-2xl font-bold text-[var(--text-heading)]">
            {currentSchoolYear?.actualSchoolDays || 0}
          </div>
          <div className="text-xs text-[var(--text-muted)]">
            School Days / {currentSchoolYear?.targetSchoolDays || 180}
          </div>
        </div>
        <div className="bg-[var(--bg-panel)] rounded-lg p-4 border border-[var(--border)]">
          <div className="text-2xl font-bold text-[var(--text-heading)]">
            {weeklyHours}h
          </div>
          <div className="text-xs text-[var(--text-muted)]">Hours This Week</div>
        </div>
        <div className="bg-[var(--bg-panel)] rounded-lg p-4 border border-[var(--border)]">
          <div className="text-2xl font-bold text-[var(--text-heading)]">
            {subjects.length}
          </div>
          <div className="text-xs text-[var(--text-muted)]">Active Subjects</div>
        </div>
        <div className="bg-[var(--bg-panel)] rounded-lg p-4 border border-[var(--border)]">
          <div className="text-2xl font-bold text-[var(--text-heading)]">
            ${(aiCostSummary?.totalCost || 0).toFixed(2)}
          </div>
          <div className="text-xs text-[var(--text-muted)]">AI Cost Total</div>
        </div>
      </div>

      {/* Today's Schedule */}
      <div className="bg-[var(--bg-panel)] rounded-lg border border-[var(--border)] p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[var(--text-heading)]">Today's Schedule</h2>
          <button
            onClick={() => setCurrentView('schedule')}
            className="text-xs text-primary-400 hover:text-primary-300"
          >
            View Full Schedule
          </button>
        </div>

        {todayLessons.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-[var(--text-muted)] text-sm mb-3">No lessons planned for today.</p>
            <button
              onClick={() => setCurrentView('planner')}
              className="px-3 py-1.5 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 transition-colors"
            >
              Plan Today
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {todayLessons.map((lesson) => {
              const subject = subjects.find(s => s.id === lesson.subjectId);
              return (
                <div
                  key={lesson.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--bg-input)] transition-colors"
                >
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: subject?.color || '#4c6ef5' }}
                  />
                  <span className="text-sm flex-1 text-[var(--text-primary)]">{lesson.title}</span>
                  <span className="text-xs text-[var(--text-muted)]">{lesson.estimatedMinutes}m</span>
                  {lesson.status === 'completed' ? (
                    <span className="text-green-400 text-sm">✓</span>
                  ) : lesson.status === 'in_progress' ? (
                    <span className="text-yellow-400 text-sm">●</span>
                  ) : lesson.status === 'skipped' ? (
                    <span className="text-red-400 text-sm">✕</span>
                  ) : (
                    <span className="text-[var(--text-muted)] text-sm">○</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sprint 2: Skills & Assessments & Reading Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Skills Summary */}
        <div
          className="bg-[var(--bg-panel)] rounded-lg border border-[var(--border)] p-4 cursor-pointer hover:border-primary-500/50 transition-colors"
          onClick={() => setCurrentView('skills')}
        >
          <h3 className="text-sm font-semibold text-[var(--text-heading)] mb-2 flex items-center gap-2">
            <span>🎯</span> Skills
          </h3>
          {skills.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">No skills tracked yet</p>
          ) : (
            <div className="space-y-1">
              <div className="text-2xl font-bold text-[var(--text-heading)]">{skills.length}</div>
              <div className="text-xs text-[var(--text-muted)]">
                Avg proficiency: {(skills.reduce((s, sk) => s + sk.proficiency, 0) / skills.length).toFixed(1)} / 5
              </div>
            </div>
          )}
        </div>

        {/* Assessments Summary */}
        <div
          className="bg-[var(--bg-panel)] rounded-lg border border-[var(--border)] p-4 cursor-pointer hover:border-primary-500/50 transition-colors"
          onClick={() => setCurrentView('assessments')}
        >
          <h3 className="text-sm font-semibold text-[var(--text-heading)] mb-2 flex items-center gap-2">
            <span>📝</span> Assessments
          </h3>
          {assessments.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">No assessments yet</p>
          ) : (() => {
            const graded = assessments.filter(a => a.status === 'graded');
            const avgScore = graded.length > 0 ? graded.reduce((s, a) => s + (a.scorePercent || 0), 0) / graded.length : 0;
            return (
              <div className="space-y-1">
                <div className="text-2xl font-bold text-[var(--text-heading)]">{graded.length}<span className="text-sm font-normal text-[var(--text-muted)]"> / {assessments.length}</span></div>
                <div className="text-xs text-[var(--text-muted)]">
                  {graded.length > 0 ? `Avg score: ${avgScore.toFixed(0)}%` : 'None graded yet'}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Reading Summary */}
        <div
          className="bg-[var(--bg-panel)] rounded-lg border border-[var(--border)] p-4 cursor-pointer hover:border-primary-500/50 transition-colors"
          onClick={() => setCurrentView('reading')}
        >
          <h3 className="text-sm font-semibold text-[var(--text-heading)] mb-2 flex items-center gap-2">
            <span>📖</span> Reading
          </h3>
          {readingLog.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">No books tracked yet</p>
          ) : (() => {
            const reading = readingLog.filter(r => r.status === 'reading');
            const completed = readingLog.filter(r => r.status === 'completed');
            return (
              <div className="space-y-1">
                <div className="text-2xl font-bold text-[var(--text-heading)]">{reading.length}<span className="text-sm font-normal text-[var(--text-muted)]"> reading</span></div>
                <div className="text-xs text-[var(--text-muted)]">
                  {completed.length} completed
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={() => setCurrentView('planner')}
          className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
        >
          <span>✨</span> Plan Today
        </button>
        <button
          onClick={() => setCurrentView('weekly')}
          className="px-4 py-2 bg-[var(--bg-panel)] text-[var(--text-primary)] text-sm rounded-lg border border-[var(--border)] hover:bg-[var(--border)] transition-colors flex items-center gap-2"
        >
          <span>📊</span> Weekly View
        </button>
        <button
          onClick={() => setCurrentView('assessments')}
          className="px-4 py-2 bg-[var(--bg-panel)] text-[var(--text-primary)] text-sm rounded-lg border border-[var(--border)] hover:bg-[var(--border)] transition-colors flex items-center gap-2"
        >
          <span>📝</span> Assessments
        </button>
        <button
          onClick={() => setCurrentView('progress')}
          className="px-4 py-2 bg-[var(--bg-panel)] text-[var(--text-primary)] text-sm rounded-lg border border-[var(--border)] hover:bg-[var(--border)] transition-colors flex items-center gap-2"
        >
          <span>📈</span> Progress
        </button>
      </div>
    </div>
  );
}
