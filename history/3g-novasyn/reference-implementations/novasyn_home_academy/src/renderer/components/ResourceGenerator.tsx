import React, { useState } from 'react';
import { useAcademyStore } from '../store/academyStore';
import type { Resource } from '../../shared/types';

export default function ResourceGenerator() {
  const {
    currentStudent,
    currentSchoolYear,
    subjects,
    models,
    settings,
    resources,
    aiLoading,
    generateResource,
    deleteResource,
    exportPdf,
    printResource,
  } = useAcademyStore();

  const [topic, setTopic] = useState('');
  const [resourceType, setResourceType] = useState<'worksheet' | 'flashcards' | 'quiz' | 'coloring' | 'puzzle'>('worksheet');
  const [subjectId, setSubjectId] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [showAnswerKey, setShowAnswerKey] = useState(false);

  if (!currentStudent) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--text-muted)]">
        Select a student to generate resources
      </div>
    );
  }

  if (!currentSchoolYear) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--text-muted)]">
        Create a school year first to generate resources
      </div>
    );
  }

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    const resource = await generateResource({
      studentId: currentStudent.id,
      schoolYearId: currentSchoolYear.id,
      resourceType,
      topic: topic.trim(),
      subjectId: subjectId || undefined,
      difficulty,
      model: selectedModel || undefined,
    });
    setSelectedResource(resource);
    setTopic('');
  };

  const handleExportPdf = async (resource: Resource) => {
    const html = `<h1>${resource.title}</h1><pre>${resource.content}</pre>`;
    await exportPdf(html, resource.title);
  };

  const handlePrint = async (resource: Resource) => {
    const html = `<h1>${resource.title}</h1><pre>${resource.content}</pre>`;
    await printResource(html);
  };

  const handlePrintWithAnswers = async (resource: Resource) => {
    const html = `<h1>${resource.title}</h1><pre>${resource.content}</pre>
      <div class="answer-key"><h2>Answer Key</h2><pre>${resource.answerKey}</pre></div>`;
    await printResource(html);
  };

  const typeIcons: Record<string, string> = {
    worksheet: '📝',
    flashcards: '🃏',
    quiz: '❓',
    coloring: '🎨',
    puzzle: '🧩',
  };

  return (
    <div className="h-full flex overflow-hidden">
      {/* Resource list sidebar */}
      <div className="w-56 flex flex-col bg-[var(--bg-panel)] border-r border-[var(--border)]">
        <div className="p-3 border-b border-[var(--border)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Resources</h3>
          <div className="text-xs text-[var(--text-muted)]">{resources.length} saved</div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {resources.map((r) => (
            <div
              key={r.id}
              className={`p-2 rounded-lg cursor-pointer text-xs transition-colors group relative ${
                selectedResource?.id === r.id
                  ? 'bg-primary-500/20 ring-1 ring-primary-500'
                  : 'hover:bg-[var(--border)]'
              }`}
              onClick={() => { setSelectedResource(r); setShowAnswerKey(false); }}
            >
              <div className="flex items-center gap-1.5">
                <span>{typeIcons[r.resourceType] || '📄'}</span>
                <span className="font-medium text-[var(--text-primary)] truncate">{r.title}</span>
              </div>
              <div className="text-[var(--text-muted)] mt-0.5">
                {r.difficulty} &middot; {r.resourceType}
                {r.generationCost > 0 && ` &middot; $${r.generationCost.toFixed(4)}`}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (selectedResource?.id === r.id) setSelectedResource(null);
                  deleteResource(r.id);
                }}
                className="hidden group-hover:block absolute right-2 top-2 text-[var(--text-muted)] hover:text-red-400"
                title="Delete"
              >
                &times;
              </button>
            </div>
          ))}
          {resources.length === 0 && (
            <div className="text-xs text-[var(--text-muted)] text-center py-4">No resources yet</div>
          )}
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Generation form */}
        <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-panel)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Generate Resource</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-3">
              <label className="block text-xs text-[var(--text-muted)] mb-1">Topic *</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Multiplication tables, Solar system planets..."
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-primary-500"
                onKeyDown={(e) => { if (e.key === 'Enter') handleGenerate(); }}
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Type</label>
              <select
                value={resourceType}
                onChange={(e) => setResourceType(e.target.value as typeof resourceType)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="worksheet">Worksheet</option>
                <option value="flashcards">Flashcards</option>
                <option value="quiz">Quiz</option>
                <option value="coloring">Coloring Page</option>
                <option value="puzzle">Puzzle</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Subject</label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">General</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Model</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">Default ({settings.defaultModel})</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleGenerate}
                disabled={!topic.trim() || aiLoading}
                className="px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {aiLoading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Resource preview */}
        <div className="flex-1 overflow-y-auto p-4">
          {selectedResource ? (
            <div>
              {/* Resource header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                    <span>{typeIcons[selectedResource.resourceType] || '📄'}</span>
                    {selectedResource.title}
                  </h2>
                  <div className="text-xs text-[var(--text-muted)] mt-0.5">
                    {selectedResource.difficulty} &middot; {selectedResource.resourceType}
                    {selectedResource.modelUsed && ` &middot; ${selectedResource.modelUsed}`}
                    {selectedResource.generationCost > 0 && ` &middot; $${selectedResource.generationCost.toFixed(4)}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePrint(selectedResource)}
                    className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs text-[var(--text-muted)] hover:bg-[var(--border)] transition-colors"
                    title="Print resource (without answers)"
                  >
                    Print
                  </button>
                  {selectedResource.answerKey && (
                    <button
                      onClick={() => handlePrintWithAnswers(selectedResource)}
                      className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs text-[var(--text-muted)] hover:bg-[var(--border)] transition-colors"
                      title="Print with answer key"
                    >
                      Print + Answers
                    </button>
                  )}
                  <button
                    onClick={() => handleExportPdf(selectedResource)}
                    className="px-3 py-1.5 rounded-lg bg-primary-500/20 text-primary-400 text-xs hover:bg-primary-500/30 transition-colors"
                    title="Export as PDF"
                  >
                    Export PDF
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="bg-[var(--bg-panel)] border border-[var(--border)] rounded-xl p-6">
                <pre className="text-sm text-[var(--text-primary)] whitespace-pre-wrap font-sans leading-relaxed">
                  {selectedResource.content}
                </pre>
              </div>

              {/* Answer key toggle */}
              {selectedResource.answerKey && (
                <div className="mt-4">
                  <button
                    onClick={() => setShowAnswerKey(!showAnswerKey)}
                    className="text-xs text-primary-400 hover:text-primary-300 transition-colors flex items-center gap-1"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" className={`transition-transform ${showAnswerKey ? 'rotate-90' : ''}`}>
                      <path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="2" />
                    </svg>
                    {showAnswerKey ? 'Hide' : 'Show'} Answer Key
                  </button>
                  {showAnswerKey && (
                    <div className="mt-2 bg-[var(--bg-panel)] border border-[var(--border)] rounded-xl p-6">
                      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Answer Key</h3>
                      <pre className="text-sm text-[var(--text-primary)] whitespace-pre-wrap font-sans leading-relaxed">
                        {selectedResource.answerKey}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)]">
              <div className="text-4xl mb-3">📄</div>
              <div className="text-sm">Generate a resource or select one from the list</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
