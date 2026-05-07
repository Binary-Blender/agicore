import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useWriterStore } from '../store/writerStore';
import type { WritingSprint } from '../../shared/types';

const PRESET_DURATIONS = [
  { label: '5 min', seconds: 300 },
  { label: '10 min', seconds: 600 },
  { label: '15 min', seconds: 900 },
  { label: '25 min', seconds: 1500 },
  { label: '30 min', seconds: 1800 },
];

export default function WritingSprintPanel() {
  const { currentProject, setShowWritingSprint, chapters } = useWriterStore();
  const [sprints, setSprints] = useState<WritingSprint[]>([]);
  const [activeSprint, setActiveSprint] = useState<WritingSprint | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [startWordCount, setStartWordCount] = useState(0);
  const [duration, setDuration] = useState(1500);
  const [targetWords, setTargetWords] = useState(500);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadSprints = useCallback(async () => {
    if (!currentProject) return;
    const result = await window.electronAPI.getSprints(currentProject.id);
    setSprints(result);
  }, [currentProject]);

  useEffect(() => { loadSprints(); }, [loadSprints]);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const getCurrentWords = () => chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0);

  const handleStart = async () => {
    if (!currentProject) return;
    const sprint = await window.electronAPI.startSprint(currentProject.id, duration, targetWords);
    setActiveSprint(sprint);
    setStartWordCount(getCurrentWords());
    setTimeLeft(duration);

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Time's up
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          handleEnd(sprint.id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleEnd = async (sprintId?: string) => {
    const id = sprintId || activeSprint?.id;
    if (!id) return;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    const wordsWritten = Math.max(0, getCurrentWords() - startWordCount);
    await window.electronAPI.endSprint(id, wordsWritten);
    setActiveSprint(null);
    setTimeLeft(0);
    loadSprints();
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const currentWordsWritten = activeSprint ? Math.max(0, getCurrentWords() - startWordCount) : 0;
  const progressPct = activeSprint ? Math.min(100, Math.round((currentWordsWritten / targetWords) * 100)) : 0;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#16213e] rounded-lg border border-[var(--border)] w-[500px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between shrink-0">
          <h2 className="text-sm font-semibold text-surface-200">Writing Sprint</h2>
          <button onClick={() => setShowWritingSprint(false)} className="text-surface-500 hover:text-surface-300">x</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Active sprint */}
          {activeSprint ? (
            <div className="text-center space-y-4">
              <div className="text-6xl font-mono text-primary-300">{formatTime(timeLeft)}</div>
              <div className="text-sm text-surface-400">
                {currentWordsWritten} / {targetWords} words
              </div>
              <div className="w-full h-3 bg-[var(--bg-page)] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${progressPct >= 100 ? 'bg-green-500' : 'bg-primary-500'}`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              {progressPct >= 100 && (
                <div className="text-green-400 text-sm font-semibold">Goal reached!</div>
              )}
              <button
                onClick={() => handleEnd()}
                className="px-4 py-2 text-xs bg-red-600/20 text-red-300 hover:bg-red-600/30 rounded transition-colors"
              >
                End Sprint
              </button>
            </div>
          ) : (
            <>
              {/* Setup */}
              <div>
                <label className="text-xs text-surface-500 block mb-1.5">Duration</label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_DURATIONS.map(p => (
                    <button
                      key={p.seconds}
                      onClick={() => setDuration(p.seconds)}
                      className={`px-3 py-1 text-xs rounded transition-colors ${
                        duration === p.seconds ? 'bg-primary-600/30 text-primary-300 ring-1 ring-primary-500' : 'text-surface-400 hover:text-surface-200 bg-white/5'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-surface-500 block mb-1">Word Goal</label>
                <input
                  type="number"
                  min={50}
                  max={10000}
                  step={50}
                  value={targetWords}
                  onChange={e => setTargetWords(Number(e.target.value))}
                  className="w-full bg-[var(--bg-page)] text-surface-200 rounded px-2 py-1 text-xs border border-[var(--border)] focus:border-primary-500 focus:outline-none"
                />
              </div>

              <button
                onClick={handleStart}
                className="w-full px-4 py-2 text-sm bg-primary-600 text-white hover:bg-primary-500 rounded transition-colors"
              >
                Start Sprint ({formatTime(duration)}, {targetWords} words)
              </button>
            </>
          )}

          {/* Sprint history */}
          {sprints.length > 0 && !activeSprint && (
            <div>
              <h3 className="text-xs text-surface-500 font-semibold mb-2">Recent Sprints</h3>
              <div className="space-y-1">
                {sprints.slice(0, 10).map(s => {
                  const hitGoal = s.wordsWritten >= s.targetWords;
                  return (
                    <div key={s.id} className="flex items-center justify-between px-2 py-1.5 bg-[#1a1a2e]/60 rounded text-xs">
                      <span className="text-surface-400">
                        {new Date(s.startedAt).toLocaleDateString()} — {formatTime(s.durationSeconds)}
                      </span>
                      <span className={hitGoal ? 'text-green-400' : 'text-surface-500'}>
                        {s.wordsWritten}/{s.targetWords}w {hitGoal ? '✓' : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-[var(--border)] flex justify-end shrink-0">
          <button onClick={() => setShowWritingSprint(false)} className="px-3 py-1.5 text-xs text-surface-400 hover:text-surface-200 rounded transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
}
