'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { aiAPI, quizAPI } from '@/lib/api';

type QuestionType = 'multiple_choice' | 'true_false' | 'fill_in_the_blank';

interface Question {
  id: string;
  question: string;
  type: QuestionType;
  options?: string[];
  correct_answer: string | string[];
  points: number;
  hint?: string;
  difficulty?: string;
  source?: string;
  reference_phrase?: string | null;
  explanation?: string | null;
}

interface QuizBuilderTabProps {
  modules: { id: string; title: string }[];
  activeModuleId?: string;
  policyFile: File | null;
  policyText: string;
  lyrics: string;
  reinforcementPhrases: string[];
  policyHighlights: string[];
  onShowToast?: (type: 'success' | 'error' | 'warning', message: string) => void;
  onQuestionStatusChange?: (moduleId: string, hasQuestions: boolean) => void;
}

type ToastType = 'success' | 'error' | 'warning';

type AiCounts = {
  easy?: number;
  medium?: number;
  hard?: number;
  expert?: number;
};

const buildBlankQuestion = (): Question => ({
  id: '',
  question: '',
  type: 'multiple_choice',
  options: ['', '', '', ''],
  correct_answer: '',
  points: 10,
  hint: '',
});

const normalizeList = (items: string[]) =>
  (items || []).map((item) => item.trim()).filter(Boolean);

const mergeQuestions = (generated: Question[], existing: Question[]) => {
  const normalized = new Set(
    generated
      .map((question) => question.question?.trim().toLowerCase())
      .filter(Boolean)
  );

  const merged = [...generated];
  existing.forEach((question) => {
    const key = question.question?.trim().toLowerCase();
    if (!key || !normalized.has(key)) {
      merged.push(question);
    }
  });

  return merged;
};

export default function QuizBuilderTab({
  modules,
  activeModuleId,
  policyFile,
  policyText,
  lyrics,
  reinforcementPhrases,
  policyHighlights,
  onShowToast,
  onQuestionStatusChange,
}: QuizBuilderTabProps) {
  const activeModule = useMemo(
    () => modules.find((module) => module.id === activeModuleId) || null,
    [modules, activeModuleId]
  );
  const activeModuleTitle = activeModule?.title || '';

  const [quizForm, setQuizForm] = useState({
    training_module_id: '',
    passing_score: 80,
    questions: [] as Question[],
  });
  const [newQuestion, setNewQuestion] = useState<Question>(buildBlankQuestion());
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [savingQuiz, setSavingQuiz] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiUsage, setAiUsage] = useState('');
  const [aiCounts, setAiCounts] = useState<AiCounts | null>(null);
  const [loadedModuleId, setLoadedModuleId] = useState('');

  const notify = useCallback(
    (type: ToastType, message: string) => {
      if (onShowToast) {
        onShowToast(type, message);
      } else if (type === 'error') {
        alert(message);
      } else {
        console.log(message);
      }
    },
    [onShowToast]
  );

  const fetchQuiz = useCallback(
    async (moduleId: string) => {
      if (!moduleId) return;
      setLoadingQuiz(true);
      try {
        const response = await quizAPI.getByTrainingModuleId(moduleId);
        if (response?.quiz) {
          setQuizForm({
            training_module_id: moduleId,
            passing_score: response.quiz.passing_score || 80,
            questions: response.quiz.questions || [],
          });
          setEditingQuizId(response.quiz.id);
        } else {
          setQuizForm({
            training_module_id: moduleId,
            passing_score: 80,
            questions: [],
          });
          setEditingQuizId(null);
        }
      } catch (error: any) {
        if (error?.response?.status === 404) {
          setQuizForm({
            training_module_id: moduleId,
            passing_score: 80,
            questions: [],
          });
          setEditingQuizId(null);
        } else {
          console.error('Failed to load quiz', error);
          notify('error', 'Unable to load quiz for that module.');
        }
      } finally {
        setLoadingQuiz(false);
      }
    },
    [notify]
  );

  useEffect(() => {
    if (!activeModuleId) {
      setLoadedModuleId('');
      setQuizForm({
        training_module_id: '',
        passing_score: 80,
        questions: [],
      });
      setEditingQuizId(null);
      setAiCounts(null);
      setAiUsage('');
      return;
    }

    if (activeModuleId !== loadedModuleId) {
      setLoadedModuleId(activeModuleId);
      setQuizForm((prev) => ({
        ...prev,
        training_module_id: activeModuleId,
      }));
      setAiCounts(null);
      setAiUsage('');
      fetchQuiz(activeModuleId);
    }
  }, [activeModuleId, loadedModuleId, fetchQuiz]);

  useEffect(() => {
    if (!onQuestionStatusChange) return;
    if (activeModuleId) {
      onQuestionStatusChange(activeModuleId, quizForm.questions.length > 0);
    } else {
      onQuestionStatusChange('', false);
    }
  }, [activeModuleId, quizForm.questions.length, onQuestionStatusChange]);

  const persistQuiz = useCallback(
    async (
      form: typeof quizForm,
      options?: { silent?: boolean; skipReload?: boolean }
    ) => {
      if (!form.training_module_id) {
        if (!options?.silent) {
          notify('error', 'Select a training module before saving.');
        }
        return false;
      }
      if (!form.questions.length) {
        if (!options?.silent) {
          notify('error', 'Add at least one question before saving.');
        }
        return false;
      }

      setSavingQuiz(true);
      try {
        let quizId = editingQuizId;
        if (quizId) {
          await quizAPI.update(quizId, {
            passing_score: form.passing_score,
            questions: form.questions,
          });
          if (!options?.silent) {
            notify('success', 'Quiz updated successfully.');
          }
        } else {
          const response = await quizAPI.create(form);
          quizId = response?.quiz?.id || null;
          setEditingQuizId(quizId);
          if (!options?.silent) {
            notify('success', 'Quiz created successfully.');
          }
        }

        if (!options?.skipReload) {
          await fetchQuiz(form.training_module_id);
        }
        return true;
      } catch (error: any) {
        console.error('Failed to save quiz', error);
        if (!options?.silent) {
          notify('error', error?.response?.data?.error || 'Unable to save quiz.');
        }
        return false;
      } finally {
        setSavingQuiz(false);
      }
    },
    [editingQuizId, fetchQuiz, notify]
  );

  const handleGenerateQuestions = async () => {
    if (!policyText.trim()) {
      notify('error', 'Paste the policy text on the Policy Upload tab before generating questions.');
      return;
    }
    if (!activeModuleId) {
      notify('error', 'Load a training module before generating quiz questions.');
      return;
    }

    const reinforcementList = normalizeList(reinforcementPhrases);
    const highlightList = normalizeList(policyHighlights);

    const formData = new FormData();
    formData.append('policy_summary', policyText.trim());
    if (lyrics.trim()) {
      formData.append('song_lyrics', lyrics.trim());
    }
    if (policyFile) {
      formData.append('policy_document', policyFile);
    }
    if (reinforcementList.length) {
      formData.append('reinforcement_phrases', JSON.stringify(reinforcementList));
    }
    if (highlightList.length) {
      formData.append('policy_highlight_phrases', JSON.stringify(highlightList));
    }

    setAiGenerating(true);
    try {
      const response = await aiAPI.generateQuizQuestions(formData);
      const generatedQuestions: Question[] = response.questions || [];
      if (!generatedQuestions.length) {
        notify('error', 'AI did not return any questions. Try adjusting the policy text.');
        return;
      }

      const updatedForm = {
        ...quizForm,
        questions: mergeQuestions(generatedQuestions, quizForm.questions),
      };
      setQuizForm(updatedForm);
      setAiUsage(
        response.usage
          ? `Prompt ${response.usage.prompt_tokens || 0} • Completion ${
              response.usage.completion_tokens || 0
            }`
          : ''
      );
      setAiCounts(response.counts || null);
      await persistQuiz(updatedForm, { silent: true, skipReload: true });
      notify('success', `Generated ${generatedQuestions.length} questions with AI.`);
    } catch (error: any) {
      console.error('Failed to generate quiz questions', error);
      notify('error', error?.response?.data?.error || 'Unable to generate quiz questions.');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleAddQuestion = () => {
    if (!newQuestion.question.trim()) {
      notify('error', 'Enter a question before adding it.');
      return;
    }

    const questionToAdd: Question = {
      ...newQuestion,
      id: uuidv4(),
      question: newQuestion.question.trim(),
      hint: newQuestion.hint?.trim() || undefined,
    };

    if (questionToAdd.type === 'multiple_choice') {
      const validOptions = normalizeList(questionToAdd.options || []);
      if (validOptions.length < 2) {
        notify('error', 'Multiple-choice questions need at least two options.');
        return;
      }
      if (!questionToAdd.correct_answer || typeof questionToAdd.correct_answer !== 'string') {
        notify('error', 'Select the correct answer.');
        return;
      }
      if (!validOptions.includes(questionToAdd.correct_answer)) {
        notify('error', 'Correct answer must match one of the options.');
        return;
      }
      questionToAdd.options = validOptions;
      questionToAdd.correct_answer = questionToAdd.correct_answer.trim();
    } else {
      questionToAdd.correct_answer =
        typeof questionToAdd.correct_answer === 'string'
          ? questionToAdd.correct_answer.trim()
          : questionToAdd.correct_answer;
      if (!questionToAdd.correct_answer) {
        notify('error', 'Provide the correct answer.');
        return;
      }
    }

    const updatedForm = {
      ...quizForm,
      questions: [...quizForm.questions, questionToAdd],
    };
    setQuizForm(updatedForm);
    persistQuiz(updatedForm, { silent: true, skipReload: true });

    setNewQuestion(buildBlankQuestion());
  };

  const handleRemoveQuestion = (questionId: string) => {
    const updatedForm = {
      ...quizForm,
      questions: quizForm.questions.filter((question) => question.id !== questionId),
    };
    setQuizForm(updatedForm);
    persistQuiz(updatedForm, { silent: true, skipReload: true });
  };

  const handleSaveQuiz = async (event: FormEvent) => {
    event.preventDefault();
    await persistQuiz(quizForm);
  };

  const handleResetQuestions = () => {
    if (!confirm('Clear all questions for this module? This cannot be undone.')) {
      return;
    }
    setQuizForm((prev) => ({
      ...prev,
      questions: [],
    }));
    setEditingQuizId(null);
  };

  if (!modules.length) {
    return (
      <div className="px-4 py-10 max-w-4xl mx-auto">
        <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-10 text-center shadow-sm">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Quiz Builder</h2>
          <p className="text-gray-600 mb-6">
            Create a training module in the Module Manager tab to start building quizzes. Once a module exists,
            you can generate or author quiz questions here.
          </p>
          <div className="inline-flex items-center gap-2 text-primary-700 font-semibold bg-primary-50 border border-primary-200 px-4 py-2 rounded-full">
            <span>Tip:</span> Finish Tabs 1–3 so AI has policy data to build great questions.
          </div>
        </div>
      </div>
    );
  }

  if (!activeModuleId || !activeModule) {
    return (
      <div className="px-4 py-10 max-w-4xl mx-auto">
        <div className="bg-white border border-yellow-200 rounded-2xl p-10 text-center shadow-sm">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Load a Training Module</h2>
          <p className="text-gray-600 mb-4">
            Quiz Builder mirrors whichever module you have open in the AI Studio. Use the{" "}
            <span className="font-semibold text-primary-600">Load existing module</span> control near the top of the page or switch modules from the Module Manager tab, then return here to edit its quiz.
          </p>
          <p className="text-sm text-gray-500">
            Need a new module? Create one in the Module Manager tab and come back once it&apos;s loaded.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Quiz Builder</h2>
        <p className="text-gray-600">
          Generate assessment questions from your policy content or craft them manually. Save quizzes directly to a training module.
        </p>
      </div>

      <form onSubmit={handleSaveQuiz} className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <p className="text-sm font-semibold text-primary-600 uppercase tracking-widest mb-1">Step 1</p>
              <h3 className="text-2xl font-bold text-gray-900">Current training module</h3>
              <p className="text-gray-600">
                Quiz Builder follows the module you loaded in AI Studio. Switch modules from the Module Manager tab or the header control above the tabs.
              </p>
            </div>
            <div className="px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-sm font-semibold">
              {editingQuizId ? 'Editing saved quiz' : 'New quiz draft'}
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-primary-200 bg-primary-50/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary-600 mb-1">Active module</p>
            <p className="text-2xl font-bold text-gray-900">{activeModuleTitle}</p>
            <p className="text-sm text-gray-600 mt-1">
              Any changes you make here are saved back to this module&apos;s quiz.
            </p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-sm font-semibold text-primary-600 uppercase tracking-widest mb-1">Step 2</p>
              <h3 className="text-2xl font-bold text-gray-900">AI question generator</h3>
              <p className="text-gray-600">
                Uses policy text, reminder phrases, and lyrics to build a balanced question set (easy → expert).
              </p>
            </div>
            {aiUsage && (
              <span className="text-sm font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{aiUsage}</span>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-700 mb-1">Inputs ready</p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>{policyText.trim() ? '• Policy summary detected' : '• Policy summary missing'}</li>
                <li>{lyrics.trim() ? '• Lyrics ready' : '• Lyrics optional'}</li>
                <li>
                  {reinforcementPhrases.filter((item) => item.trim()).length
                    ? `• ${reinforcementPhrases.filter((item) => item.trim()).length} reinforcement phrases`
                    : '• Reinforcement phrases optional'}
                </li>
                <li>
                  {policyHighlights.filter((item) => item.trim()).length
                    ? `• ${policyHighlights.filter((item) => item.trim()).length} policy highlights`
                    : '• Policy highlights optional'}
                </li>
              </ul>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-700 mb-1">Output mix</p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Lyric reinforcement (Easy)</li>
                <li>• Policy add-ons (Medium)</li>
                <li>• Policy mastery (Hard)</li>
                <li>• Expert inference</li>
              </ul>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGenerateQuestions}
            disabled={aiGenerating}
            className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-3 font-semibold text-white shadow-lg hover:from-primary-700 hover:to-primary-800 disabled:opacity-60"
          >
            {aiGenerating ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-r-transparent" />
                Generating questions…
              </>
            ) : (
              <>⚡ Generate 11 AI questions</>
            )}
          </button>

          {aiCounts && (
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-700">
              <span className="font-semibold text-gray-900">Distribution:</span>
              <span className="rounded-full bg-primary-50 px-3 py-1 text-primary-700">
                Easy {aiCounts.easy ?? 0}
              </span>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">
                Medium {aiCounts.medium ?? 0}
              </span>
              <span className="rounded-full bg-rose-50 px-3 py-1 text-rose-700">
                Hard {aiCounts.hard ?? 0}
              </span>
              <span className="rounded-full bg-gray-900/10 px-3 py-1 text-gray-900">
                Expert {aiCounts.expert ?? 0}
              </span>
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-primary-600 uppercase tracking-widest mb-1">Step 3</p>
              <h3 className="text-2xl font-bold text-gray-900">Quiz settings</h3>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-gray-700">Passing score</label>
              <input
                type="number"
                min={0}
                max={100}
                value={quizForm.passing_score}
                onChange={(event) =>
                  setQuizForm((prev) => ({
                    ...prev,
                    passing_score: Number(event.target.value) || 0,
                  }))
                }
                className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-center text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
              />
              <span className="text-sm text-gray-500">%</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-lg font-semibold text-gray-900">
                {quizForm.questions.length} question{quizForm.questions.length === 1 ? '' : 's'}
              </h4>
              {quizForm.questions.length > 0 && (
                <button
                  type="button"
                  onClick={handleResetQuestions}
                  className="text-sm font-semibold text-red-600 hover:text-red-700"
                >
                  Clear all
                </button>
              )}
            </div>

            {loadingQuiz ? (
              <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-gray-600">
                Loading quiz…
              </div>
            ) : quizForm.questions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-gray-500">
                No questions yet. Generate with AI or add one manually below.
              </div>
            ) : (
              <div className="space-y-4">
                {quizForm.questions.map((question, index) => (
                  <div key={question.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-500">Question {index + 1}</p>
                        <p className="text-lg font-bold text-gray-900">{question.question}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Type: {question.type.replace(/_/g, ' ')} • {question.points} points{' '}
                          {question.difficulty && <>• {question.difficulty}</>}
                        </p>
                        {question.reference_phrase && (
                          <p className="text-xs text-gray-500 mt-1">
                            Reference: {question.reference_phrase}
                          </p>
                        )}
                        {question.explanation && (
                          <p className="text-xs text-gray-500 mt-1">
                            Explanation: {question.explanation}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(question.id)}
                        className="text-sm font-semibold text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>

                    {question.type === 'multiple_choice' && question.options && (
                      <ul className="mt-3 space-y-2 text-sm text-gray-700">
                        {question.options.map((option, idx) => (
                          <li
                            key={idx}
                            className={`rounded-lg border px-3 py-2 ${
                              option === question.correct_answer
                                ? 'border-green-200 bg-green-50 text-green-700'
                                : 'border-gray-200 bg-white'
                            }`}
                          >
                            {option}
                          </li>
                        ))}
                      </ul>
                    )}

                    {question.hint && (
                      <p className="mt-3 text-sm text-gray-600">
                        <span className="font-semibold">Hint:</span> {question.hint}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <p className="text-sm font-semibold text-primary-600 uppercase tracking-widest mb-1">Step 4</p>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">Add question manually</h3>
          <p className="text-gray-600 mb-6">
            Perfect for compliance details the AI might miss. Supports multiple choice, true/false, and fill-in-the-blank.
          </p>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Question type</label>
              <select
                value={newQuestion.type}
                onChange={(event) => {
                  const type = event.target.value as QuestionType;
                  setNewQuestion({
                    ...newQuestion,
                    type,
                    options: type === 'multiple_choice' ? newQuestion.options ?? ['', '', '', ''] : undefined,
                    correct_answer: '',
                  });
                }}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
              >
                <option value="multiple_choice">Multiple choice</option>
                <option value="true_false">True / False</option>
                <option value="fill_in_the_blank">Fill in the blank</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Points</label>
              <input
                type="number"
                min={1}
                value={newQuestion.points}
                onChange={(event) =>
                  setNewQuestion({
                    ...newQuestion,
                    points: Number(event.target.value) || 1,
                  })
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Question text</label>
            <input
              type="text"
              value={newQuestion.question}
              onChange={(event) => setNewQuestion({ ...newQuestion, question: event.target.value })}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
              placeholder="Enter your question prompt"
            />
          </div>

          {newQuestion.type === 'multiple_choice' && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Options</label>
                {newQuestion.options?.map((option, idx) => (
                  <input
                    key={idx}
                    type="text"
                    value={option}
                    onChange={(event) => {
                      const updated = [...(newQuestion.options || [])];
                      updated[idx] = event.target.value;
                      setNewQuestion({ ...newQuestion, options: updated });
                    }}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 mb-2"
                    placeholder={`Option ${idx + 1}`}
                  />
                ))}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Correct answer</label>
                <select
                  value={(newQuestion.correct_answer as string) || ''}
                  onChange={(event) =>
                    setNewQuestion({ ...newQuestion, correct_answer: event.target.value })
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                >
                  <option value="">Select correct answer</option>
                  {newQuestion.options?.filter((option) => option.trim()).map((option, idx) => (
                    <option key={idx} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {newQuestion.type === 'true_false' && (
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Correct answer</label>
              <select
                value={(newQuestion.correct_answer as string) || ''}
                onChange={(event) =>
                  setNewQuestion({
                    ...newQuestion,
                    correct_answer: event.target.value,
                  })
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
              >
                <option value="">Select</option>
                <option value="true">True</option>
                <option value="false">False</option>
              </select>
            </div>
          )}

          {newQuestion.type === 'fill_in_the_blank' && (
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Correct answer</label>
              <input
                type="text"
                value={(newQuestion.correct_answer as string) || ''}
                onChange={(event) =>
                  setNewQuestion({
                    ...newQuestion,
                    correct_answer: event.target.value,
                  })
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                placeholder="Expected response"
              />
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Hint (optional)</label>
            <input
              type="text"
              value={newQuestion.hint || ''}
              onChange={(event) => setNewQuestion({ ...newQuestion, hint: event.target.value })}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
              placeholder="Add a learner-friendly hint"
            />
          </div>

          <button
            type="button"
            onClick={handleAddQuestion}
            className="w-full rounded-xl bg-gray-900 px-6 py-3 text-white font-semibold shadow hover:bg-black"
          >
            + Add question
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-4">
          <button
            type="submit"
            disabled={savingQuiz}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 px-8 py-3 font-semibold text-white shadow-lg hover:from-primary-700 hover:to-primary-800 disabled:opacity-60"
          >
            {savingQuiz ? 'Saving…' : editingQuizId ? 'Update quiz' : 'Create quiz'}
          </button>
        </div>
      </form>
    </div>
  );
}
