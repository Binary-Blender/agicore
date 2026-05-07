import React, { useState } from 'react';
import { useAcademyStore } from '../store/academyStore';

export default function LessonPlanner() {
  const {
    currentStudent,
    currentSchoolYear,
    subjects,
    models,
    apiKeys,
    settings,
    aiLoading,
    generateLessons,
    selectedDate,
    setSelectedDate,
  } = useAcademyStore();

  const [scope, setScope] = useState<'day' | 'week'>('day');
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<Set<string>>(new Set());
  const [selectedModel, setSelectedModel] = useState('');
  const [generatedCount, setGeneratedCount] = useState<number | null>(null);
  const [error, setError] = useState('');

  if (!currentStudent || !currentSchoolYear) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[var(--text-muted)]">Select a student with a school year to plan lessons.</p>
      </div>
    );
  }

  if (subjects.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">📚</div>
          <p className="text-[var(--text-muted)] mb-2">No subjects configured yet.</p>
          <button
            onClick={() => useAcademyStore.getState().setCurrentView('subjects')}
            className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700"
          >
            Add Subjects
          </button>
        </div>
      </div>
    );
  }

  const availableModels = models.filter(m => apiKeys[m.provider]);
  const modelId = selectedModel || settings.defaultModel;

  const toggleSubject = (id: string) => {
    const next = new Set(selectedSubjectIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedSubjectIds(next);
  };

  const handleGenerate = async () => {
    setError('');
    setGeneratedCount(null);

    try {
      const lessons = await generateLessons({
        studentId: currentStudent.id,
        date: selectedDate,
        scope,
        subjectIds: selectedSubjectIds.size > 0 ? Array.from(selectedSubjectIds) : undefined,
        model: modelId,
      });
      setGeneratedCount(lessons.length);
    } catch (err: any) {
      setError(err.message || 'Failed to generate lessons');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h1 className="text-lg font-bold text-[var(--text-heading)] mb-1">
        Lesson Planner
      </h1>
      <p className="text-sm text-[var(--text-muted)] mb-6">
        {currentStudent.avatarEmoji} {currentStudent.name} &middot; {currentStudent.gradeLevel || 'Grade not set'} &middot; {currentStudent.teachingPhilosophy}
      </p>

      <div className="max-w-xl space-y-5">
        {/* Date */}
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1">
            {scope === 'day' ? 'Date' : 'Week Starting'}
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-48 px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        {/* Scope Toggle */}
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1">Scope</label>
          <div className="flex gap-2">
            <button
              onClick={() => setScope('day')}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                scope === 'day'
                  ? 'bg-primary-600 text-white'
                  : 'bg-[var(--bg-panel)] text-[var(--text-muted)] border border-[var(--border)] hover:bg-[var(--border)]'
              }`}
            >
              Plan a Day
            </button>
            <button
              onClick={() => setScope('week')}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                scope === 'week'
                  ? 'bg-primary-600 text-white'
                  : 'bg-[var(--bg-panel)] text-[var(--text-muted)] border border-[var(--border)] hover:bg-[var(--border)]'
              }`}
            >
              Plan a Week
            </button>
          </div>
        </div>

        {/* Subject Selection */}
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1">
            Subjects (leave unchecked for all)
          </label>
          <div className="flex flex-wrap gap-2">
            {subjects.map((subject) => (
              <button
                key={subject.id}
                onClick={() => toggleSubject(subject.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  selectedSubjectIds.has(subject.id)
                    ? 'bg-primary-500/20 ring-1 ring-primary-500 text-[var(--text-primary)]'
                    : selectedSubjectIds.size === 0
                      ? 'bg-[var(--bg-panel)] text-[var(--text-primary)] border border-[var(--border)]'
                      : 'bg-[var(--bg-panel)] text-[var(--text-muted)] border border-[var(--border)]'
                }`}
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: subject.color }} />
                {subject.name}
              </button>
            ))}
          </div>
        </div>

        {/* Model Selection */}
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1">AI Model</label>
          <select
            value={modelId}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {availableModels.map((model) => (
              <option key={model.id} value={model.id}>{model.name} ({model.provider})</option>
            ))}
          </select>
          {availableModels.length === 0 && (
            <p className="text-xs text-red-400 mt-1">No API keys configured. Add keys in Settings.</p>
          )}
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={aiLoading || availableModels.length === 0}
          className="w-full py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm font-medium"
        >
          {aiLoading ? (
            <>
              <span className="animate-spin">⏳</span>
              Generating...
            </>
          ) : (
            <>
              <span>✨</span>
              Generate {scope === 'week' ? 'Weekly' : "Today's"} Lessons
            </>
          )}
        </button>

        {/* Results */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
            {error}
          </div>
        )}

        {generatedCount !== null && (
          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-sm text-green-400">
            Successfully generated {generatedCount} lesson{generatedCount !== 1 ? 's' : ''}!
            View them in the{' '}
            <button
              onClick={() => useAcademyStore.getState().setCurrentView('schedule')}
              className="underline hover:no-underline"
            >
              Daily Schedule
            </button>
            .
          </div>
        )}
      </div>
    </div>
  );
}
