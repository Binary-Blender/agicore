import React, { useEffect, useState } from 'react';
import { useAcademyStore } from '../store/academyStore';
import type { Lesson } from '../../shared/types';

export default function WeeklyView() {
  const {
    currentStudent,
    subjects,
    selectedDate,
    setSelectedDate,
    setCurrentView,
  } = useAcademyStore();

  const [weekLessons, setWeekLessons] = useState<Lesson[]>([]);

  // Calculate week start (Monday)
  const getMonday = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d;
  };

  const monday = getMonday(selectedDate);
  const weekDays: string[] = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    weekDays.push(d.toISOString().split('T')[0]);
  }

  const weekStart = weekDays[0];
  const weekEnd = weekDays[4];

  // Load all lessons for the week
  useEffect(() => {
    if (!currentStudent) return;
    const load = async () => {
      const allLessons = await window.electronAPI.getLessons({ studentId: currentStudent.id });
      const filtered = allLessons.filter(
        l => l.scheduledDate && l.scheduledDate >= weekStart && l.scheduledDate <= weekEnd
      );
      setWeekLessons(filtered);
    };
    load();
  }, [currentStudent?.id, weekStart, weekEnd]);

  if (!currentStudent) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[var(--text-muted)]">Select a student first.</p>
      </div>
    );
  }

  const changeWeek = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta * 7);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const formatDayHeader = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    return {
      day: d.toLocaleDateString('en-US', { weekday: 'short' }),
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };
  };

  const getLessonsForDay = (dateStr: string) =>
    weekLessons.filter(l => l.scheduledDate === dateStr).sort((a, b) => a.sortOrder - b.sortOrder);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <span className="text-green-400">✓</span>;
      case 'in_progress': return <span className="text-yellow-400">●</span>;
      case 'skipped': return <span className="text-red-400/60">✕</span>;
      default: return <span className="text-[var(--text-muted)]">○</span>;
    }
  };

  // Calculate weekly totals per subject
  const subjectTotals = subjects.map(s => {
    const subjectLessons = weekLessons.filter(l => l.subjectId === s.id && l.status === 'completed');
    const totalMinutes = subjectLessons.reduce((sum, l) => sum + (l.actualMinutes || l.estimatedMinutes), 0);
    return { subject: s, hours: totalMinutes / 60 };
  });

  const isToday = (dateStr: string) => dateStr === new Date().toISOString().split('T')[0];

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => changeWeek(-1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--border)] text-[var(--text-muted)]">
          ◀
        </button>
        <h1 className="text-lg font-bold text-[var(--text-heading)]">
          {formatDayHeader(weekDays[0]).date} — {formatDayHeader(weekDays[4]).date}
        </h1>
        <button onClick={() => changeWeek(1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--border)] text-[var(--text-muted)]">
          ▶
        </button>
        <button
          onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
          className="text-xs text-primary-400 hover:text-primary-300"
        >
          This Week
        </button>
      </div>

      {/* Week Grid */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {weekDays.map((dateStr) => {
          const { day, date } = formatDayHeader(dateStr);
          const dayLessons = getLessonsForDay(dateStr);

          return (
            <div
              key={dateStr}
              className={`bg-[var(--bg-panel)] rounded-lg border ${
                isToday(dateStr) ? 'border-primary-500' : 'border-[var(--border)]'
              } p-3 min-h-[200px] cursor-pointer hover:border-primary-500/50 transition-colors`}
              onClick={() => {
                setSelectedDate(dateStr);
                setCurrentView('schedule');
              }}
            >
              <div className={`text-center mb-2 pb-2 border-b border-[var(--border)]`}>
                <div className={`text-xs font-medium ${isToday(dateStr) ? 'text-primary-400' : 'text-[var(--text-muted)]'}`}>
                  {day}
                </div>
                <div className={`text-sm font-semibold ${isToday(dateStr) ? 'text-primary-300' : 'text-[var(--text-heading)]'}`}>
                  {date}
                </div>
              </div>

              {dayLessons.length === 0 ? (
                <div className="text-xs text-[var(--text-placeholder)] text-center py-4">
                  No lessons
                </div>
              ) : (
                <div className="space-y-1.5">
                  {dayLessons.map((lesson) => {
                    const subject = subjects.find(s => s.id === lesson.subjectId);
                    return (
                      <div key={lesson.id} className="flex items-center gap-1.5">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: subject?.color || '#4c6ef5' }}
                        />
                        <span className="text-xs text-[var(--text-primary)] truncate flex-1">
                          {lesson.title}
                        </span>
                        {getStatusIcon(lesson.status)}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Weekly Totals */}
      {subjectTotals.some(st => st.hours > 0) && (
        <div className="bg-[var(--bg-panel)] rounded-lg border border-[var(--border)] p-4">
          <h3 className="text-sm font-semibold text-[var(--text-heading)] mb-3">Weekly Hours</h3>
          <div className="space-y-2">
            {subjectTotals.map(({ subject, hours }) => (
              <div key={subject.id} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: subject.color }} />
                <span className="text-sm text-[var(--text-primary)] w-28">{subject.name}</span>
                <div className="flex-1 h-2 bg-[var(--border)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (hours / subject.targetHoursPerWeek) * 100)}%`,
                      backgroundColor: subject.color,
                    }}
                  />
                </div>
                <span className="text-xs text-[var(--text-muted)] w-16 text-right">
                  {hours.toFixed(1)} / {subject.targetHoursPerWeek}h
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
