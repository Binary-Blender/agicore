import React, { useState, useRef, useEffect } from 'react';
import { useAcademyStore } from '../store/academyStore';

export default function DailySchedule() {
  const {
    currentStudent,
    subjects,
    lessons,
    selectedDate,
    setSelectedDate,
    updateLesson,
    completeLesson,
    setCurrentView,
  } = useAcademyStore();

  const [completingId, setCompletingId] = useState<string | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [completionMinutes, setCompletionMinutes] = useState('');
  const [timers, setTimers] = useState<Record<string, number>>({});
  const timerIntervals = useRef<Record<string, NodeJS.Timeout>>({});

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      Object.values(timerIntervals.current).forEach(clearInterval);
    };
  }, []);

  if (!currentStudent) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[var(--text-muted)]">Select a student first.</p>
      </div>
    );
  }

  const todayLessons = lessons
    .filter(l => l.scheduledDate === selectedDate)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const changeDate = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  const startLesson = async (lessonId: string) => {
    await updateLesson(lessonId, { status: 'in_progress' });
    // Start timer
    setTimers(prev => ({ ...prev, [lessonId]: 0 }));
    timerIntervals.current[lessonId] = setInterval(() => {
      setTimers(prev => ({ ...prev, [lessonId]: (prev[lessonId] || 0) + 1 }));
    }, 1000);
  };

  const openComplete = (lessonId: string, estimatedMinutes: number) => {
    const timerMinutes = timers[lessonId] ? Math.ceil(timers[lessonId] / 60) : estimatedMinutes;
    setCompletingId(lessonId);
    setCompletionMinutes(timerMinutes.toString());
    setCompletionNotes('');
    // Stop timer
    if (timerIntervals.current[lessonId]) {
      clearInterval(timerIntervals.current[lessonId]);
      delete timerIntervals.current[lessonId];
    }
  };

  const handleComplete = async () => {
    if (!completingId) return;
    await completeLesson(completingId, completionNotes, parseInt(completionMinutes) || undefined);
    setCompletingId(null);
    setTimers(prev => { const next = { ...prev }; delete next[completingId]; return next; });
  };

  const skipLesson = async (lessonId: string) => {
    await updateLesson(lessonId, { status: 'skipped' });
    if (timerIntervals.current[lessonId]) {
      clearInterval(timerIntervals.current[lessonId]);
      delete timerIntervals.current[lessonId];
    }
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const totalMinutes = todayLessons.reduce((sum, l) => sum + (l.actualMinutes || l.estimatedMinutes), 0);
  const completedCount = todayLessons.filter(l => l.status === 'completed').length;
  const completedSubjects = new Set(todayLessons.filter(l => l.status === 'completed').map(l => l.subjectId));

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Date Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => changeDate(-1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--border)] text-[var(--text-muted)]">
          ◀
        </button>
        <h1 className="text-lg font-bold text-[var(--text-heading)]">
          {formatDate(selectedDate)}
        </h1>
        <button onClick={() => changeDate(1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--border)] text-[var(--text-muted)]">
          ▶
        </button>
        <button
          onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
          className="text-xs text-primary-400 hover:text-primary-300"
        >
          Today
        </button>
      </div>

      {/* Lessons */}
      {todayLessons.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-[var(--text-muted)] mb-3">No lessons planned for this day.</p>
          <button
            onClick={() => setCurrentView('planner')}
            className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700"
          >
            Plan This Day
          </button>
        </div>
      ) : (
        <div className="space-y-3 mb-6">
          {todayLessons.map((lesson) => {
            const subject = subjects.find(s => s.id === lesson.subjectId);
            const isCompleting = completingId === lesson.id;
            const timerValue = timers[lesson.id];

            return (
              <div
                key={lesson.id}
                className={`bg-[var(--bg-panel)] rounded-lg border border-[var(--border)] p-4 ${
                  lesson.status === 'completed' ? 'opacity-70' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Subject badge */}
                  <div
                    className="px-2 py-0.5 rounded text-xs text-white font-medium mt-0.5"
                    style={{ backgroundColor: subject?.color || '#4c6ef5' }}
                  >
                    {subject?.name || 'Unknown'}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-[var(--text-heading)]">{lesson.title}</h3>
                      {lesson.aiGenerated && (
                        <span className="text-xs text-primary-400" title="AI Generated">✨</span>
                      )}
                    </div>
                    {lesson.description && (
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">{lesson.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {timerValue !== undefined && lesson.status === 'in_progress' && (
                      <span className="text-sm font-mono text-yellow-400">{formatTimer(timerValue)}</span>
                    )}
                    <span className="text-xs text-[var(--text-muted)]">{lesson.estimatedMinutes}m</span>

                    {lesson.status === 'planned' && (
                      <button
                        onClick={() => startLesson(lesson.id)}
                        className="px-3 py-1 bg-primary-600 text-white text-xs rounded hover:bg-primary-700 transition-colors"
                      >
                        Start
                      </button>
                    )}
                    {lesson.status === 'in_progress' && (
                      <button
                        onClick={() => openComplete(lesson.id, lesson.estimatedMinutes)}
                        className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                      >
                        Complete
                      </button>
                    )}
                    {(lesson.status === 'planned' || lesson.status === 'in_progress') && (
                      <button
                        onClick={() => skipLesson(lesson.id)}
                        className="px-3 py-1 text-xs text-[var(--text-muted)] hover:text-red-400 transition-colors"
                      >
                        Skip
                      </button>
                    )}
                    {lesson.status === 'completed' && (
                      <span className="text-green-400 text-sm font-medium">Completed</span>
                    )}
                    {lesson.status === 'skipped' && (
                      <span className="text-red-400/60 text-sm">Skipped</span>
                    )}
                  </div>
                </div>

                {/* Completion form */}
                {isCompleting && (
                  <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-2">
                    <div className="flex items-center gap-3">
                      <label className="text-xs text-[var(--text-muted)]">Minutes:</label>
                      <input
                        type="number"
                        value={completionMinutes}
                        onChange={(e) => setCompletionMinutes(e.target.value)}
                        className="w-20 px-2 py-1 bg-[var(--bg-input)] border border-[var(--border)] rounded text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-primary-500"
                        min="1"
                      />
                    </div>
                    <textarea
                      value={completionNotes}
                      onChange={(e) => setCompletionNotes(e.target.value)}
                      placeholder="Completion notes (optional)..."
                      rows={2}
                      className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleComplete}
                        className="px-3 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                      >
                        Save & Complete
                      </button>
                      <button
                        onClick={() => setCompletingId(null)}
                        className="px-3 py-1.5 text-xs text-[var(--text-muted)]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Show completion notes for completed lessons */}
                {lesson.status === 'completed' && lesson.completionNotes && (
                  <div className="mt-2 text-xs text-[var(--text-muted)] italic">
                    Note: {lesson.completionNotes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Day Summary */}
      {todayLessons.length > 0 && (
        <div className="bg-[var(--bg-panel)] rounded-lg border border-[var(--border)] p-4 flex items-center gap-6">
          <div>
            <span className="text-xs text-[var(--text-muted)]">Lessons</span>
            <div className="text-sm font-medium text-[var(--text-heading)]">{completedCount}/{todayLessons.length}</div>
          </div>
          <div>
            <span className="text-xs text-[var(--text-muted)]">Total Minutes</span>
            <div className="text-sm font-medium text-[var(--text-heading)]">{totalMinutes}m</div>
          </div>
          <div>
            <span className="text-xs text-[var(--text-muted)]">Subjects</span>
            <div className="text-sm font-medium text-[var(--text-heading)]">{completedSubjects.size} covered</div>
          </div>
        </div>
      )}
    </div>
  );
}
