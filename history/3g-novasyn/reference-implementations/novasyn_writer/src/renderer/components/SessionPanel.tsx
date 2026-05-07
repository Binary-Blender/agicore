import React, { useState, useEffect, useRef } from 'react';
import { useWriterStore } from '../store/writerStore';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return `${mins}m ${secs}s`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hours}h ${remainMins}m`;
}

function formatHour(hour: number | null): string {
  if (hour === null) return '--';
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 || 12;
  return `${h} ${suffix}`;
}

export default function SessionPanel() {
  const {
    currentSession,
    sessionActive,
    sessions,
    sessionStats,
    goals,
    sessionAiWordsAccepted,
    sessionAiOpsCount,
    chapters,
    setShowSessionPanel,
    setGoal,
    deleteGoal,
    loadSessions,
    loadSessionStats,
    loadGoals,
  } = useWriterStore();

  const [goalInput, setGoalInput] = useState('');
  const [editingGoal, setEditingGoal] = useState(false);
  const [liveSeconds, setLiveSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load data on mount
  useEffect(() => {
    loadSessions();
    loadSessionStats();
    loadGoals();
  }, []);

  // Live timer for current session
  useEffect(() => {
    if (sessionActive && currentSession) {
      const update = () => {
        const start = new Date(currentSession.startedAt).getTime();
        setLiveSeconds(Math.floor((Date.now() - start) / 1000));
      };
      update();
      intervalRef.current = setInterval(update, 1000);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    } else {
      setLiveSeconds(0);
    }
  }, [sessionActive, currentSession?.id]);

  const currentWordCount = chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0);
  const liveWordsAdded = currentSession
    ? Math.max(0, currentWordCount - currentSession.startWordCount)
    : 0;

  const dailyGoal = goals.find((g) => g.goalType === 'daily');
  const todayWords = (sessionStats?.todayWords || 0) + (sessionActive ? liveWordsAdded : 0);
  const goalProgress = dailyGoal ? Math.min(100, Math.round((todayWords / dailyGoal.targetWords) * 100)) : 0;

  const handleSetGoal = async () => {
    const val = parseInt(goalInput);
    if (val > 0) {
      await setGoal(val);
      setEditingGoal(false);
      setGoalInput('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[var(--bg-panel)] rounded-lg border border-[var(--border)] w-[540px] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border)] shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-surface-100 font-semibold text-base">Session Tracking</h2>
              <p className="text-surface-500 text-xs mt-0.5">Track your writing productivity and goals</p>
            </div>
            <button
              onClick={() => setShowSessionPanel(false)}
              className="text-surface-500 hover:text-surface-200 text-lg leading-none px-1"
            >
              x
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Current Session Card */}
          <div className="bg-[var(--bg-page)] rounded-lg p-4 border border-[var(--border)]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-surface-200 text-sm font-medium">Current Session</h3>
              {sessionActive ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">Active</span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full bg-surface-600/20 text-surface-500">Inactive</span>
              )}
            </div>
            {sessionActive && currentSession ? (
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-lg font-mono text-primary-400">{formatDuration(liveSeconds)}</div>
                  <div className="text-xs text-surface-500">Duration</div>
                </div>
                <div>
                  <div className="text-lg font-mono text-accent-400">+{liveWordsAdded}</div>
                  <div className="text-xs text-surface-500">Words Added</div>
                </div>
                <div>
                  <div className="text-lg font-mono text-purple-400">{sessionAiWordsAccepted}</div>
                  <div className="text-xs text-surface-500">AI Words ({sessionAiOpsCount} ops)</div>
                </div>
              </div>
            ) : (
              <p className="text-surface-500 text-sm">No active session. Start typing to begin.</p>
            )}
          </div>

          {/* Daily Goal Card */}
          <div className="bg-[var(--bg-page)] rounded-lg p-4 border border-[var(--border)]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-surface-200 text-sm font-medium">Daily Goal</h3>
              {dailyGoal && dailyGoal.currentStreak > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400">
                  {dailyGoal.currentStreak} day streak
                </span>
              )}
            </div>
            {dailyGoal && !editingGoal ? (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-surface-400">{todayWords} / {dailyGoal.targetWords} words</span>
                  <span className="text-xs text-surface-500">{goalProgress}%</span>
                </div>
                <div className="w-full h-2 bg-[var(--bg-panel)] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${goalProgress >= 100 ? 'bg-green-500' : 'bg-primary-500'}`}
                    style={{ width: `${goalProgress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-surface-600">
                    Longest streak: {dailyGoal.longestStreak} days
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setGoalInput(String(dailyGoal.targetWords));
                        setEditingGoal(true);
                      }}
                      className="text-xs text-primary-400 hover:text-primary-300"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteGoal(dailyGoal.id)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Daily word goal..."
                  className="flex-1 bg-[var(--bg-panel)] text-surface-200 rounded px-3 py-1.5 text-sm border border-[var(--border)] focus:border-primary-500 focus:outline-none"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSetGoal()}
                  autoFocus
                />
                <button
                  onClick={handleSetGoal}
                  className="px-3 py-1.5 text-sm bg-primary-600 hover:bg-primary-500 text-white rounded"
                >
                  Set
                </button>
                {editingGoal && (
                  <button
                    onClick={() => setEditingGoal(false)}
                    className="px-2 py-1.5 text-sm text-surface-400 hover:text-surface-200"
                  >
                    Cancel
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Stats Card */}
          {sessionStats && (
            <div className="bg-[var(--bg-page)] rounded-lg p-4 border border-[var(--border)]">
              <h3 className="text-surface-200 text-sm font-medium mb-3">Stats</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex justify-between">
                  <span className="text-xs text-surface-500">This week</span>
                  <span className="text-xs text-surface-200 font-medium">{sessionStats.weekWords} words</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-surface-500">Avg session</span>
                  <span className="text-xs text-surface-200 font-medium">{sessionStats.avgSessionMinutes} min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-surface-500">Total sessions</span>
                  <span className="text-xs text-surface-200 font-medium">{sessionStats.totalSessions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-surface-500">Most productive</span>
                  <span className="text-xs text-surface-200 font-medium">{formatHour(sessionStats.mostProductiveHour)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Recent Sessions List */}
          <div>
            <h3 className="text-surface-200 text-sm font-medium mb-2">Recent Sessions</h3>
            {sessions.length === 0 ? (
              <p className="text-surface-500 text-xs">No sessions recorded yet.</p>
            ) : (
              <div className="space-y-1">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center gap-3 px-3 py-2 bg-[var(--bg-page)] rounded border border-[var(--border)] text-xs"
                  >
                    <span className="text-surface-500 w-16 shrink-0">{timeAgo(session.startedAt)}</span>
                    <span className="text-surface-300 w-14 shrink-0">{formatDuration(session.durationSeconds)}</span>
                    <span className="text-accent-400 w-16 shrink-0">+{session.wordsAdded}w</span>
                    {session.aiWordsAccepted > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 shrink-0">
                        AI: {session.aiWordsAccepted}w
                      </span>
                    )}
                    {!session.endedAt && (
                      <span className="px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 shrink-0">Live</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
