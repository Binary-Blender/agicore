import React, { useState } from 'react';
import { useAcademyStore } from '../store/academyStore';
import type { Assessment, AssessmentAnswer, AssessmentQuestion } from '../../shared/types';

type ViewMode = 'list' | 'take' | 'review' | 'generate';

export default function AssessmentManager() {
  const {
    currentStudent,
    currentSchoolYear,
    subjects,
    assessments,
    models,
    apiKeys,
    settings,
    aiLoading,
    generateAssessment,
    gradeAssessment,
    deleteAssessment,
    setCurrentView,
  } = useAcademyStore();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [filterSubject, setFilterSubject] = useState<string>('');
  const [answers, setAnswers] = useState<Record<number, string>>({});

  // Generate form state
  const [genSubjectId, setGenSubjectId] = useState('');
  const [genQuestionCount, setGenQuestionCount] = useState(10);
  const [genType, setGenType] = useState('quiz');
  const [genModel, setGenModel] = useState(settings.defaultModel);

  if (!currentStudent) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[var(--text-muted)]">Select a student first.</p>
      </div>
    );
  }

  const availableModels = models.filter(m => apiKeys[m.provider]);
  const filteredAssessments = filterSubject
    ? assessments.filter(a => a.subjectId === filterSubject)
    : assessments;

  const getSubjectName = (subjectId: string) =>
    subjects.find(s => s.id === subjectId)?.name || 'Unknown';
  const getSubjectColor = (subjectId: string) =>
    subjects.find(s => s.id === subjectId)?.color || '#4c6ef5';

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-gray-500/20 text-gray-400',
      in_progress: 'bg-yellow-500/20 text-yellow-400',
      completed: 'bg-blue-500/20 text-blue-400',
      graded: 'bg-green-500/20 text-green-400',
    };
    return styles[status] || styles.pending;
  };

  const getLetterGrade = (percent: number) => {
    if (percent >= 93) return 'A';
    if (percent >= 90) return 'A-';
    if (percent >= 87) return 'B+';
    if (percent >= 83) return 'B';
    if (percent >= 80) return 'B-';
    if (percent >= 77) return 'C+';
    if (percent >= 73) return 'C';
    if (percent >= 70) return 'C-';
    if (percent >= 67) return 'D+';
    if (percent >= 60) return 'D';
    return 'F';
  };

  const handleGenerate = async () => {
    if (!genSubjectId || !currentStudent) return;
    await generateAssessment({
      studentId: currentStudent.id,
      subjectId: genSubjectId,
      questionCount: genQuestionCount,
      assessmentType: genType,
      model: genModel,
    });
    setViewMode('list');
  };

  const handleStartAssessment = (assessment: Assessment) => {
    setSelectedAssessment(assessment);
    setAnswers({});
    setViewMode('take');
  };

  const handleSubmitAnswers = async () => {
    if (!selectedAssessment) return;
    const answerList: AssessmentAnswer[] = selectedAssessment.questions.map((_, i) => ({
      questionIndex: i,
      answer: answers[i] || '',
    }));
    const graded = await gradeAssessment(selectedAssessment.id, answerList);
    setSelectedAssessment(graded);
    setViewMode('review');
  };

  const handleViewGraded = (assessment: Assessment) => {
    setSelectedAssessment(assessment);
    setViewMode('review');
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this assessment?')) {
      await deleteAssessment(id);
      if (selectedAssessment?.id === id) {
        setSelectedAssessment(null);
        setViewMode('list');
      }
    }
  };

  // ─── Generate View ─────────────────────────────────────────────────────────

  if (viewMode === 'generate') {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <button onClick={() => setViewMode('list')} className="text-xs text-primary-400 hover:text-primary-300 mb-4">
          &larr; Back to Assessments
        </button>
        <h1 className="text-lg font-bold text-[var(--text-heading)] mb-6">Generate Assessment</h1>

        <div className="max-w-md space-y-4">
          <div>
            <label className="text-sm text-[var(--text-muted)] block mb-1">Subject</label>
            <select
              value={genSubjectId}
              onChange={e => setGenSubjectId(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">Select subject...</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-sm text-[var(--text-muted)] block mb-1">Type</label>
            <select
              value={genType}
              onChange={e => setGenType(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="quiz">Quiz</option>
              <option value="test">Test</option>
              <option value="worksheet">Worksheet</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-[var(--text-muted)] block mb-1">Questions: {genQuestionCount}</label>
            <input
              type="range"
              min={5}
              max={20}
              value={genQuestionCount}
              onChange={e => setGenQuestionCount(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="text-sm text-[var(--text-muted)] block mb-1">AI Model</label>
            <select
              value={genModel}
              onChange={e => setGenModel(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              {availableModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          <button
            onClick={handleGenerate}
            disabled={!genSubjectId || aiLoading}
            className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {aiLoading ? 'Generating...' : 'Generate Assessment'}
          </button>
        </div>
      </div>
    );
  }

  // ─── Take Assessment View ──────────────────────────────────────────────────

  if (viewMode === 'take' && selectedAssessment) {
    const answeredCount = Object.keys(answers).filter(k => answers[Number(k)]?.trim()).length;
    const totalQ = selectedAssessment.questions.length;

    return (
      <div className="flex-1 overflow-y-auto p-6">
        <button onClick={() => setViewMode('list')} className="text-xs text-primary-400 hover:text-primary-300 mb-4">
          &larr; Back to Assessments
        </button>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-lg font-bold text-[var(--text-heading)]">{selectedAssessment.title}</h1>
          <span className="text-sm text-[var(--text-muted)]">{answeredCount} / {totalQ} answered</span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-[var(--border)] rounded-full mb-6 overflow-hidden">
          <div
            className="h-full bg-primary-500 rounded-full transition-all"
            style={{ width: `${(answeredCount / totalQ) * 100}%` }}
          />
        </div>

        <div className="space-y-6 max-w-2xl">
          {selectedAssessment.questions.map((q, i) => (
            <QuestionCard
              key={i}
              index={i}
              question={q}
              answer={answers[i] || ''}
              onAnswer={(val) => setAnswers({ ...answers, [i]: val })}
            />
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSubmitAnswers}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Submit for Grading
          </button>
        </div>
      </div>
    );
  }

  // ─── Review View ───────────────────────────────────────────────────────────

  if (viewMode === 'review' && selectedAssessment) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <button onClick={() => { setViewMode('list'); setSelectedAssessment(null); }} className="text-xs text-primary-400 hover:text-primary-300 mb-4">
          &larr; Back to Assessments
        </button>
        <h1 className="text-lg font-bold text-[var(--text-heading)] mb-2">{selectedAssessment.title}</h1>

        {selectedAssessment.scorePercent !== null && (
          <div className="flex items-center gap-4 mb-6">
            <div className="text-4xl font-bold text-[var(--text-heading)]">
              {getLetterGrade(selectedAssessment.scorePercent)}
            </div>
            <div>
              <div className="text-lg text-[var(--text-primary)]">
                {selectedAssessment.earnedPoints} / {selectedAssessment.totalPoints} points
              </div>
              <div className="text-sm text-[var(--text-muted)]">
                {selectedAssessment.scorePercent.toFixed(1)}%
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4 max-w-2xl">
          {selectedAssessment.questions.map((q, i) => {
            const studentAnswer = selectedAssessment.answers[i];
            const isCorrect = studentAnswer?.correct;

            return (
              <div key={i} className={`bg-[var(--bg-panel)] rounded-lg border p-4 ${isCorrect ? 'border-green-500/40' : 'border-red-500/40'}`}>
                <div className="flex items-start gap-2 mb-2">
                  <span className={`text-sm font-bold ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                    {isCorrect ? '✓' : '✕'}
                  </span>
                  <span className="text-sm text-[var(--text-primary)] font-medium">{i + 1}. {q.question}</span>
                </div>

                {studentAnswer && (
                  <div className="ml-6 space-y-1">
                    <p className={`text-xs ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                      Your answer: {studentAnswer.answer}
                    </p>
                    {!isCorrect && (
                      <p className="text-xs text-green-400">
                        Correct answer: {q.correctAnswer}
                      </p>
                    )}
                    <p className="text-xs text-[var(--text-muted)]">
                      {studentAnswer.points || 0} / {q.points} points
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── List View ─────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold text-[var(--text-heading)]">Assessments</h1>
        <div className="flex items-center gap-3">
          <select
            value={filterSubject}
            onChange={e => setFilterSubject(e.target.value)}
            className="px-3 py-1.5 bg-[var(--bg-input)] border border-[var(--border)] rounded text-sm text-[var(--text-primary)] focus:outline-none"
          >
            <option value="">All Subjects</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button
            onClick={() => { setGenSubjectId(subjects[0]?.id || ''); setViewMode('generate'); }}
            className="px-4 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors"
          >
            Generate Assessment
          </button>
        </div>
      </div>

      {filteredAssessments.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">📝</div>
          <p className="text-[var(--text-muted)] mb-3">No assessments yet.</p>
          <button
            onClick={() => { setGenSubjectId(subjects[0]?.id || ''); setViewMode('generate'); }}
            className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors"
          >
            Generate Your First Assessment
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredAssessments.map(assessment => (
            <div key={assessment.id} className="bg-[var(--bg-panel)] rounded-lg border border-[var(--border)] p-4 flex items-center gap-4">
              <div
                className="w-2 h-full min-h-[40px] rounded-full"
                style={{ backgroundColor: getSubjectColor(assessment.subjectId) }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                  {assessment.title}
                </div>
                <div className="text-xs text-[var(--text-muted)] flex items-center gap-2 mt-0.5">
                  <span>{getSubjectName(assessment.subjectId)}</span>
                  <span>&middot;</span>
                  <span>{assessment.questions.length} questions</span>
                  <span>&middot;</span>
                  <span>{assessment.assessmentType}</span>
                </div>
              </div>

              <span className={`px-2 py-0.5 rounded text-xs ${getStatusBadge(assessment.status)}`}>
                {assessment.status.replace('_', ' ')}
              </span>

              {assessment.scorePercent !== null && (
                <span className="text-sm font-bold text-[var(--text-heading)] w-12 text-right">
                  {assessment.scorePercent.toFixed(0)}%
                </span>
              )}

              <div className="flex items-center gap-1">
                {(assessment.status === 'pending' || assessment.status === 'in_progress') && (
                  <button
                    onClick={() => handleStartAssessment(assessment)}
                    className="px-3 py-1 bg-primary-600 text-white text-xs rounded hover:bg-primary-700"
                  >
                    Take
                  </button>
                )}
                {assessment.status === 'graded' && (
                  <button
                    onClick={() => handleViewGraded(assessment)}
                    className="px-3 py-1 bg-[var(--bg-input)] text-[var(--text-primary)] text-xs rounded border border-[var(--border)] hover:bg-[var(--border)]"
                  >
                    Review
                  </button>
                )}
                <button
                  onClick={() => handleDelete(assessment.id)}
                  className="px-2 py-1 text-[var(--text-muted)] hover:text-red-400 text-xs"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Question Card Component ────────────────────────────────────────────────

function QuestionCard({
  index,
  question,
  answer,
  onAnswer,
}: {
  index: number;
  question: AssessmentQuestion;
  answer: string;
  onAnswer: (val: string) => void;
}) {
  return (
    <div className="bg-[var(--bg-panel)] rounded-lg border border-[var(--border)] p-4">
      <div className="flex items-start gap-2 mb-3">
        <span className="text-xs text-[var(--text-muted)] bg-[var(--border)] px-1.5 py-0.5 rounded">
          {index + 1}
        </span>
        <span className="text-sm text-[var(--text-primary)] font-medium">{question.question}</span>
        <span className="text-xs text-[var(--text-muted)] ml-auto whitespace-nowrap">{question.points} pt{question.points !== 1 ? 's' : ''}</span>
      </div>

      {question.type === 'multiple_choice' && question.options && (
        <div className="space-y-2 ml-6">
          {question.options.map((opt, oi) => (
            <label key={oi} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`q-${index}`}
                checked={answer === opt}
                onChange={() => onAnswer(opt)}
                className="accent-primary-500"
              />
              <span className="text-sm text-[var(--text-primary)]">{opt}</span>
            </label>
          ))}
        </div>
      )}

      {question.type === 'true_false' && (
        <div className="flex gap-4 ml-6">
          {['True', 'False'].map(opt => (
            <label key={opt} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`q-${index}`}
                checked={answer === opt}
                onChange={() => onAnswer(opt)}
                className="accent-primary-500"
              />
              <span className="text-sm text-[var(--text-primary)]">{opt}</span>
            </label>
          ))}
        </div>
      )}

      {(question.type === 'short_answer' || question.type === 'fill_blank') && (
        <div className="ml-6">
          <input
            type="text"
            value={answer}
            onChange={e => onAnswer(e.target.value)}
            placeholder={question.type === 'fill_blank' ? 'Fill in the blank...' : 'Your answer...'}
            className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded text-sm text-[var(--text-primary)] placeholder:text-[var(--text-placeholder)] focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
      )}
    </div>
  );
}
