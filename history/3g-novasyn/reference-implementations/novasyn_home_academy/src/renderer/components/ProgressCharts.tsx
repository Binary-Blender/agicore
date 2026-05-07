import React, { useEffect } from 'react';
import { useAcademyStore } from '../store/academyStore';

const PROFICIENCY_LABELS = ['', 'Intro', 'Developing', 'Proficient', 'Advanced', 'Mastered'];
const PROFICIENCY_COLORS = ['', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981'];

export default function ProgressCharts() {
  const {
    currentStudent,
    progressData,
    loadProgressData,
  } = useAcademyStore();

  useEffect(() => {
    if (currentStudent) {
      loadProgressData(currentStudent.id);
    }
  }, [currentStudent?.id]);

  if (!currentStudent) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[var(--text-muted)]">Select a student first.</p>
      </div>
    );
  }

  if (!progressData) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[var(--text-muted)]">Loading progress data...</p>
      </div>
    );
  }

  const { skillsBySubject, assessmentScores, readingStats, weeklyHours } = progressData;

  // Calculate max hours for the weekly chart scale
  const maxWeeklyHours = Math.max(...weeklyHours.map(w => w.hours), 1);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h1 className="text-lg font-bold text-[var(--text-heading)] mb-6">Progress Overview</h1>

      <div className="grid grid-cols-2 gap-6">
        {/* Skills Overview */}
        <div className="bg-[var(--bg-panel)] rounded-lg border border-[var(--border)] p-4">
          <h2 className="text-sm font-semibold text-[var(--text-heading)] mb-4">Skills by Subject</h2>
          {skillsBySubject.filter(s => s.skills.length > 0).length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] text-center py-4">No skills tracked yet</p>
          ) : (
            <div className="space-y-3">
              {skillsBySubject.filter(s => s.skills.length > 0).map(({ subjectId, subjectName, subjectColor, skills }) => {
                const avgProf = skills.reduce((s, sk) => s + sk.proficiency, 0) / skills.length;
                return (
                  <div key={subjectId}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: subjectColor }} />
                        <span className="text-xs text-[var(--text-primary)]">{subjectName}</span>
                      </div>
                      <span className="text-xs text-[var(--text-muted)]">
                        {avgProf.toFixed(1)} avg · {skills.length} skills
                      </span>
                    </div>
                    {/* Horizontal bar */}
                    <div className="h-4 bg-[var(--border)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(avgProf / 5) * 100}%`,
                          backgroundColor: subjectColor,
                        }}
                      />
                    </div>
                    {/* Individual skills */}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {skills.map(sk => (
                        <span
                          key={sk.id}
                          className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: `${PROFICIENCY_COLORS[sk.proficiency]}20`,
                            color: PROFICIENCY_COLORS[sk.proficiency],
                          }}
                        >
                          {sk.name} ({PROFICIENCY_LABELS[sk.proficiency]})
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Assessment Scores */}
        <div className="bg-[var(--bg-panel)] rounded-lg border border-[var(--border)] p-4">
          <h2 className="text-sm font-semibold text-[var(--text-heading)] mb-4">Assessment Scores</h2>
          {assessmentScores.filter(s => s.scores.length > 0).length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] text-center py-4">No graded assessments yet</p>
          ) : (
            <div className="space-y-4">
              {assessmentScores.filter(s => s.scores.length > 0).map(({ subjectName, subjectColor, scores }) => {
                const latest = scores[scores.length - 1];
                const avg = scores.reduce((s, sc) => s + sc.percent, 0) / scores.length;

                return (
                  <div key={subjectName}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: subjectColor }} />
                        <span className="text-xs text-[var(--text-primary)]">{subjectName}</span>
                      </div>
                      <span className="text-xs text-[var(--text-muted)]">
                        avg {avg.toFixed(0)}% · {scores.length} assessment{scores.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {/* Score dots */}
                    <svg viewBox={`0 0 ${Math.max(scores.length * 40, 200)} 60`} className="w-full h-12">
                      {/* Grid lines */}
                      {[25, 50, 75, 100].map(pct => (
                        <line
                          key={pct}
                          x1="0"
                          y1={60 - (pct / 100) * 56}
                          x2={Math.max(scores.length * 40, 200)}
                          y2={60 - (pct / 100) * 56}
                          stroke="var(--border)"
                          strokeWidth="0.5"
                        />
                      ))}
                      {/* Line connecting scores */}
                      {scores.length > 1 && (
                        <polyline
                          points={scores.map((sc, i) => `${i * 40 + 20},${60 - (sc.percent / 100) * 56}`).join(' ')}
                          fill="none"
                          stroke={subjectColor}
                          strokeWidth="1.5"
                          opacity="0.6"
                        />
                      )}
                      {/* Score dots */}
                      {scores.map((sc, i) => (
                        <g key={i}>
                          <circle
                            cx={i * 40 + 20}
                            cy={60 - (sc.percent / 100) * 56}
                            r="4"
                            fill={subjectColor}
                          />
                          <title>{sc.percent.toFixed(0)}% — {sc.date?.split('T')[0] || ''}</title>
                        </g>
                      ))}
                    </svg>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Weekly Hours Trend */}
        <div className="bg-[var(--bg-panel)] rounded-lg border border-[var(--border)] p-4">
          <h2 className="text-sm font-semibold text-[var(--text-heading)] mb-4">Weekly Hours (Last 8 Weeks)</h2>
          <div className="flex items-end gap-2 h-32">
            {weeklyHours.map((w, i) => {
              const heightPct = maxWeeklyHours > 0 ? (w.hours / maxWeeklyHours) * 100 : 0;
              const weekLabel = new Date(w.week + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-[var(--text-muted)]">
                    {w.hours > 0 ? w.hours.toFixed(1) : ''}
                  </span>
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className="w-full rounded-t bg-primary-500 transition-all min-h-[2px]"
                      style={{ height: `${Math.max(heightPct, 2)}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-[var(--text-muted)]">{weekLabel}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reading Progress */}
        <div className="bg-[var(--bg-panel)] rounded-lg border border-[var(--border)] p-4">
          <h2 className="text-sm font-semibold text-[var(--text-heading)] mb-4">Reading Progress</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-[var(--text-heading)]">{readingStats.totalBooks}</div>
              <div className="text-xs text-[var(--text-muted)]">Total Books</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[var(--text-heading)]">{readingStats.completed}</div>
              <div className="text-xs text-[var(--text-muted)]">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[var(--text-heading)]">{readingStats.totalPages.toLocaleString()}</div>
              <div className="text-xs text-[var(--text-muted)]">Pages Read</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[var(--text-heading)]">{(readingStats.totalMinutes / 60).toFixed(1)}h</div>
              <div className="text-xs text-[var(--text-muted)]">Reading Time</div>
            </div>
          </div>

          {readingStats.totalBooks > 0 && readingStats.completed > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1">
                <span>Completion Rate</span>
                <span>{Math.round((readingStats.completed / readingStats.totalBooks) * 100)}%</span>
              </div>
              <div className="h-3 bg-[var(--border)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 rounded-full"
                  style={{ width: `${(readingStats.completed / readingStats.totalBooks) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
