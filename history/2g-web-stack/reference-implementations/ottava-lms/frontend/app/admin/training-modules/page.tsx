'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { trainingModulesAPI, videoAPI, quizAPI } from '@/lib/api';
import { normalizeOverlayPayload, OverlayPayload } from '@/lib/overlay';
import { v4 as uuidv4 } from 'uuid';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ModuleSong {
  id: string;
  song_url: string;
  song_style?: string | null;
  song_duration_seconds?: number | null;
  created_at?: string | null;
}

interface TrainingModule {
  id: string;
  title: string;
  description?: string;
  category?: string;
  difficulty_level?: string;
  estimated_duration_minutes?: number;
  policy_document_url?: string | null;
  policy_document_filename?: string | null;
  policy_summary_text?: string | null;
  emphasis_prompt?: string | null;
  ai_song_lyrics?: string | null;
  ai_song_url?: string | null;
  ai_song_duration_seconds?: number | null;
  ai_song_style?: string | null;
  ai_song_generated_at?: string | null;
  ai_overlay_texts?: OverlayPayload | string | null;
  ai_songs?: ModuleSong[] | null;
  videos: any[];
}

interface GenreVideo {
  genre: string;
  youtube_url: string;
  title: string;
  id?: string; // Optional video ID for updates
}

interface Question {
  id: string;
  question: string;
  type: 'multiple_choice' | 'true_false' | 'fill_in_the_blank';
  options?: string[];
  correct_answer: string | string[];
  points: number;
  hint?: string;
}

const formatSongDuration = (seconds?: number | null) => {
  if (!seconds || seconds <= 0) return null;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins && secs) return `${mins}m ${secs}s`;
  if (mins) return `${mins}m`;
  return `${secs}s`;
};

const buildSongUrl = (path?: string | null) => {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path}`;
};

export default function AdminTrainingModulesPage() {
  const router = useRouter();
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingModule, setEditingModule] = useState<string | null>(null);
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [selectedModuleTitle, setSelectedModuleTitle] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    difficulty_level: 'Beginner',
    estimated_duration_minutes: 30,
    policy_document_url: ''
  });

  const [genreVideos, setGenreVideos] = useState<GenreVideo[]>([
    { genre: 'rock', youtube_url: '', title: '' },
  ]);

  const [quizForm, setQuizForm] = useState({
    training_module_id: '',
    passing_score: 80,
    questions: [] as Question[],
  });

  const [newQuestion, setNewQuestion] = useState<Question>({
    id: '',
    question: '',
    type: 'multiple_choice',
    options: ['', '', '', ''],
    correct_answer: '',
    points: 10,
    hint: '',
  });

  const [policyFile, setPolicyFile] = useState<File | null>(null);
  const policyInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingPolicy, setUploadingPolicy] = useState(false);
  const [policyUploadError, setPolicyUploadError] = useState('');
  const [clearingPolicyId, setClearingPolicyId] = useState<string | null>(null);
  const [policyDownloadModuleId, setPolicyDownloadModuleId] = useState<string | null>(null);

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      const response = await trainingModulesAPI.getAll();
      setModules(response.training_modules || []);
    } catch (error) {
      console.error('Failed to fetch modules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddGenreVideo = () => {
    setGenreVideos([...genreVideos, { genre: 'rock', youtube_url: '', title: '' }]);
  };

  const handleRemoveGenreVideo = (index: number) => {
    setGenreVideos(genreVideos.filter((_, i) => i !== index));
  };

  const handleGenreVideoChange = (index: number, field: string, value: string) => {
    const updated = [...genreVideos];
    updated[index] = { ...updated[index], [field]: value };
    setGenreVideos(updated);
  };

  const openQuizBuilder = async (trainingModuleId: string, moduleTitle: string) => {
    setSelectedModuleTitle(moduleTitle);
    try {
      const existingQuiz = await quizAPI.getByTrainingModuleId(trainingModuleId);
      if (existingQuiz?.quiz) {
        setEditingQuizId(existingQuiz.quiz.id);
        setQuizForm({
          training_module_id: trainingModuleId,
          passing_score: existingQuiz.quiz.passing_score,
          questions: existingQuiz.quiz.questions,
        });
      } else {
        setEditingQuizId(null);
        setQuizForm({
          training_module_id: trainingModuleId,
          passing_score: 80,
          questions: [],
        });
      }
    } catch (error) {
      setEditingQuizId(null);
      setQuizForm({
        training_module_id: trainingModuleId,
        passing_score: 80,
        questions: [],
      });
    }

    setNewQuestion({
      id: '',
      question: '',
      type: 'multiple_choice',
      options: ['', '', '', ''],
      correct_answer: '',
      points: 10,
      hint: '',
    });

    setShowQuizForm(true);
  };

  const addQuestion = () => {
    if (!newQuestion.question.trim()) {
      alert('Please enter a question');
      return;
    }

    const questionToAdd: Question = {
      ...newQuestion,
      id: uuidv4(),
    };

    if (questionToAdd.type === 'multiple_choice') {
      const validOptions = (questionToAdd.options || []).filter((option) => option.trim());
      if (validOptions.length < 2) {
        alert('Multiple choice questions need at least 2 options');
        return;
      }
      if (!questionToAdd.correct_answer) {
        alert('Please select the correct answer');
        return;
      }
    }

    setQuizForm((prev) => ({
      ...prev,
      questions: [...prev.questions, questionToAdd],
    }));

    setNewQuestion({
      id: '',
      question: '',
      type: 'multiple_choice',
      options: ['', '', '', ''],
      correct_answer: '',
      points: 10,
      hint: '',
    });
  };

  const removeQuestion = (questionId: string) => {
    setQuizForm((prev) => ({
      ...prev,
      questions: prev.questions.filter((question) => question.id !== questionId),
    }));
  };

  const handleQuizSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!quizForm.training_module_id) {
      alert('Select a training module first');
      return;
    }

    if (quizForm.questions.length === 0) {
      alert('Please add at least one question');
      return;
    }

    try {
      if (editingQuizId) {
        await quizAPI.update(editingQuizId, {
          passing_score: quizForm.passing_score,
          questions: quizForm.questions,
        });
        alert('Quiz updated successfully!');
      } else {
        await quizAPI.create(quizForm);
        alert('Quiz created successfully!');
      }

      setShowQuizForm(false);
      setEditingQuizId(null);
    } catch (error) {
      console.error(`Failed to ${editingQuizId ? 'update' : 'create'} quiz:`, error);
      alert(`Failed to ${editingQuizId ? 'update' : 'create'} quiz. Please try again.`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      let targetModuleId = editingModule || '';

      if (editingModule) {
        // Update existing module
        const response = await trainingModulesAPI.update(editingModule, formData);
        targetModuleId = response.training_module.id;

        // Update videos - check if video has ID (existing) or needs to be created (new)
        for (const gv of genreVideos) {
          if (gv.youtube_url && gv.youtube_url.trim()) {
            if (gv.id) {
              // Update existing video
              await videoAPI.update(gv.id, {
                title: gv.title || `${formData.title} (${gv.genre})`,
                s3_url: gv.youtube_url,
              });
            } else {
              // Create new video
              await videoAPI.create({
                title: gv.title || `${formData.title} (${gv.genre})`,
                genre: gv.genre,
                s3_url: gv.youtube_url,
                training_module_id: editingModule,
                duration_seconds: 0,
              });
            }
          }
        }

        alert('Training module updated successfully!');
      } else {
        // Create new training module
        const moduleResponse = await trainingModulesAPI.create(formData);
        const moduleId = moduleResponse.training_module.id;
        targetModuleId = moduleId;

        // Create videos for each genre
        for (const gv of genreVideos) {
          if (gv.youtube_url && gv.youtube_url.trim()) {
            await videoAPI.create({
              title: gv.title || `${formData.title} (${gv.genre})`,
              genre: gv.genre,
              s3_url: gv.youtube_url,
              training_module_id: moduleId,
              duration_seconds: 0, // Will be updated when video is processed
            });
          }
        }
        alert('Training module created successfully!');
      }

      if (policyFile && targetModuleId) {
        setUploadingPolicy(true);
        setPolicyUploadError('');
        try {
          await trainingModulesAPI.uploadPolicy(targetModuleId, policyFile);
          alert('Policy document uploaded successfully!');
        } catch (error: any) {
          console.error('Failed to upload policy document:', error);
          setPolicyUploadError(error.response?.data?.error || error.message || 'Failed to upload policy document');
        } finally {
          setUploadingPolicy(false);
          setPolicyFile(null);
          if (policyInputRef.current) {
            policyInputRef.current.value = '';
          }
        }
      }

      // Reset form + refresh list
      setFormData({
        title: '',
        description: '',
        category: '',
        difficulty_level: 'Beginner',
        estimated_duration_minutes: 30,
        policy_document_url: ''
      });
      setGenreVideos([{ genre: 'rock', youtube_url: '', title: '' }]);
      setPolicyUploadError('');
      setShowCreateForm(false);
      setEditingModule(null);
      await fetchModules();
    } catch (error: any) {
      console.error('Failed to save training module:', error);
      console.error('Error details:', error.response?.data);
      alert(`Failed to save training module: ${error.response?.data?.error || error.message || 'Unknown error'}`);
    }
  };

  const handleEditModule = (module: TrainingModule) => {
    setFormData({
      title: module.title,
      description: module.description || '',
      category: module.category || '',
      difficulty_level: module.difficulty_level || 'Beginner',
      estimated_duration_minutes: module.estimated_duration_minutes || 30,
      policy_document_url: module.policy_document_url || '',
    });

    setPolicyFile(null);
    setPolicyUploadError('');
    if (policyInputRef.current) {
      policyInputRef.current.value = '';
    }

    // Populate genre videos from existing module videos
    if (module.videos && module.videos.length > 0) {
      const existingVideos = module.videos.map((video: any) => ({
        genre: video.genre,
        youtube_url: video.youtube_url || video.s3_url || '',
        title: video.title,
        id: video.id, // Keep track of video ID for updates
      }));
      setGenreVideos(existingVideos);
    }

    setEditingModule(module.id);
    setShowCreateForm(true);
  };

  const handleCancelEdit = () => {
    setFormData({
      title: '',
      description: '',
      category: '',
      difficulty_level: 'Beginner',
      estimated_duration_minutes: 30,
      policy_document_url: ''
    });
    setGenreVideos([{ genre: 'rock', youtube_url: '', title: '' }]);
    setPolicyFile(null);
    setPolicyUploadError('');
    if (policyInputRef.current) {
      policyInputRef.current.value = '';
    }
    setShowCreateForm(false);
    setEditingModule(null);
  };

  const handleAddVideoToModule = async (moduleId: string) => {
    const genre = prompt('Enter genre (rock, jazz, classical, pop, hip-hop, country):');
    const youtubeUrl = prompt('Enter YouTube URL:');
    const title = prompt('Enter video title:');

    if (genre && youtubeUrl && title) {
      try {
        await videoAPI.create({
          title,
          genre: genre.toLowerCase(),
          s3_url: youtubeUrl,
          training_module_id: moduleId,
          duration_seconds: 0,
        });

        alert('Video added successfully!');
        fetchModules();
      } catch (error: any) {
        console.error('Failed to add video:', error);
        console.error('Error response:', error.response?.data);
        alert(`Failed to add video: ${error.response?.data?.error || error.message || 'Unknown error'}`);
      }
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (confirm('Are you sure you want to delete this training module?')) {
      try {
        await trainingModulesAPI.delete(moduleId);
        fetchModules();
      } catch (error) {
        console.error('Failed to delete module:', error);
        alert('Failed to delete module. Please try again.');
      }
    }
  };

  const handlePolicyFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (file && file.type !== 'application/pdf') {
      alert('Only PDF files are supported.');
      event.target.value = '';
      return;
    }
    setPolicyFile(file);
    setPolicyUploadError('');
  };

  const handleDownloadPolicy = async (moduleId: string, filenameHint?: string) => {
    try {
      setPolicyDownloadModuleId(moduleId);
      const response = await trainingModulesAPI.downloadPolicy(moduleId);
      const blob = new Blob([response.data], {
        type: response.headers['content-type'] || 'application/pdf',
      });
      const fallbackName = filenameHint?.trim() || 'policy';
      const sanitizedName = fallbackName.replace(/[\\/:*?"<>|]+/g, '-').replace(/\.pdf$/i, '');
      const finalName = sanitizedName || 'policy';
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${finalName}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download policy document', error);
    } finally {
      setPolicyDownloadModuleId((current) => (current === moduleId ? null : current));
    }
  };

  const handleClearPolicyDocument = async (moduleId: string) => {
    if (!confirm('Remove the attached policy document?')) {
      return;
    }

    try {
      setClearingPolicyId(moduleId);
      await trainingModulesAPI.clearPolicy(moduleId);
      if (editingModule === moduleId) {
        setFormData((prev) => ({ ...prev, policy_document_url: '' }));
      }
      await fetchModules();
      alert('Policy document removed.');
    } catch (error: any) {
      console.error('Failed to remove policy document:', error);
      alert(error.response?.data?.error || error.message || 'Failed to remove policy document');
    } finally {
      setClearingPolicyId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🎵</div>
          <p className="text-gray-600 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">
                Manage Training Modules
              </h1>
              <p className="text-gray-600 mt-2">Create and manage training modules with multiple genre videos</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {showCreateForm ? 'Cancel' : '+ New Module'}
              </button>
            </div>
          </div>

          {/* Quiz Builder Modal */}
          {showQuizForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
              <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8 border border-gray-100">
                <div className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900">
                        {editingQuizId ? 'Edit Quiz' : 'Create Quiz'}
                      </h2>
                      <p className="text-gray-600 mt-1">Module: {selectedModuleTitle}</p>
                    </div>
                    <button
                      onClick={() => setShowQuizForm(false)}
                      className="text-gray-400 hover:text-gray-600 text-2xl"
                    >
                      ×
                    </button>
                  </div>

                  <form onSubmit={handleQuizSubmit} className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Passing Score (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={quizForm.passing_score}
                        onChange={(e) => setQuizForm({ ...quizForm, passing_score: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>

                    {quizForm.questions.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          Questions ({quizForm.questions.length})
                        </h3>
                        <div className="space-y-3">
                          {quizForm.questions.map((question, index) => (
                            <div key={question.id} className="bg-gray-50 p-4 rounded-lg flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">
                                  {index + 1}. {question.question}
                                </p>
                                <p className="text-sm text-gray-600 mt-1">
                                  Type: {question.type.replace(/_/g, ' ')} • Points: {question.points}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeQuestion(question.id)}
                                className="ml-4 text-red-600 hover:text-red-800 font-semibold"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="border-t pt-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Question</h3>

                      <div className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Question Type</label>
                            <select
                              value={newQuestion.type}
                              onChange={(e) =>
                                setNewQuestion({
                                  ...newQuestion,
                                  type: e.target.value as Question['type'],
                                  options: e.target.value === 'multiple_choice' ? newQuestion.options : undefined,
                                  correct_answer: '',
                                })
                              }
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                            >
                              <option value="multiple_choice">Multiple Choice</option>
                              <option value="true_false">True/False</option>
                              <option value="fill_in_the_blank">Fill in the Blank</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Points</label>
                            <input
                              type="number"
                              min="1"
                              value={newQuestion.points}
                              onChange={(e) => setNewQuestion({ ...newQuestion, points: parseInt(e.target.value) || 1 })}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Question Text</label>
                          <input
                            type="text"
                            value={newQuestion.question}
                            onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                            placeholder="Enter your question"
                          />
                        </div>

                        {newQuestion.type === 'multiple_choice' && (
                          <>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">Options</label>
                              {newQuestion.options?.map((option, idx) => (
                                <input
                                  key={idx}
                                  type="text"
                                  value={option}
                                  onChange={(e) => {
                                    const updated = [...(newQuestion.options || [])];
                                    updated[idx] = e.target.value;
                                    setNewQuestion({ ...newQuestion, options: updated });
                                  }}
                                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 mb-2"
                                  placeholder={`Option ${idx + 1}`}
                                />
                              ))}
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">Correct Answer</label>
                              <select
                                value={(newQuestion.correct_answer as string) || ''}
                                onChange={(e) => setNewQuestion({ ...newQuestion, correct_answer: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                              >
                                <option value="">Select correct answer</option>
                                {newQuestion.options?.filter((opt) => opt.trim()).map((option, idx) => (
                                  <option key={idx} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </>
                        )}

                        {newQuestion.type === 'true_false' && (
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Correct Answer</label>
                            <select
                              value={(newQuestion.correct_answer as string) || ''}
                              onChange={(e) => setNewQuestion({ ...newQuestion, correct_answer: e.target.value })}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                            >
                              <option value="">Select</option>
                              <option value="true">True</option>
                              <option value="false">False</option>
                            </select>
                          </div>
                        )}

                        {newQuestion.type === 'fill_in_the_blank' && (
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Correct Answer</label>
                            <input
                              type="text"
                              value={(newQuestion.correct_answer as string) || ''}
                              onChange={(e) => setNewQuestion({ ...newQuestion, correct_answer: e.target.value })}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                              placeholder="Expected answer"
                            />
                          </div>
                        )}

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Hint (Optional)</label>
                          <input
                            type="text"
                            value={newQuestion.hint || ''}
                            onChange={(e) => setNewQuestion({ ...newQuestion, hint: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                            placeholder="Provide a helpful hint"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={addQuestion}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
                        >
                          + Add Question
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-4 pt-4 border-t">
                      <button
                        type="submit"
                        className="flex-1 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-bold py-3 rounded-xl shadow-lg"
                      >
                        {editingQuizId ? 'Update Quiz' : 'Create Quiz'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowQuizForm(false)}
                        className="px-8 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 rounded-xl"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Create/Edit Form */}
          {showCreateForm && (
            <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {editingModule ? 'Edit Training Module' : 'Create New Training Module'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Title *</label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="e.g., Basic Music Theory"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="e.g., Compliance, Technical"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    rows={3}
                    placeholder="Describe what this training module covers..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Policy PDF URL</label>
                  <input
                    type="url"
                    value={formData.policy_document_url}
                    onChange={(e) => setFormData({ ...formData, policy_document_url: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="https://example.com/policies/hipaa.pdf"
                  />
                  <p className="text-xs text-gray-500 mt-1">Optional: provide a PDF or hosted policy for “read instead” option.</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Or Upload Policy PDF</label>
                  <input
                    ref={policyInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={handlePolicyFileChange}
                    className="w-full text-sm"
                  />
                  {policyFile && (
                    <p className="text-xs text-gray-600 mt-2">
                      Selected file: <span className="font-semibold">{policyFile.name}</span>
                    </p>
                  )}
                  {policyUploadError && (
                    <p className="text-xs text-red-500 mt-1">{policyUploadError}</p>
                  )}
                  {editingModule && formData.policy_document_url && (
                    <div className="mt-2 flex items-center gap-3 text-sm">
                      {/^https?:\/\//i.test(formData.policy_document_url) ? (
                        <a
                          href={formData.policy_document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:text-primary-700 underline"
                        >
                          View current policy
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDownloadPolicy(editingModule, formData.title || 'policy')}
                          className="text-primary-600 hover:text-primary-700 underline disabled:opacity-60"
                          disabled={policyDownloadModuleId === editingModule}
                        >
                          {policyDownloadModuleId === editingModule ? 'Preparing download…' : 'Download current policy'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleClearPolicyDocument(editingModule)}
                        className="text-red-500 hover:text-red-600 text-xs font-semibold"
                        disabled={clearingPolicyId === editingModule}
                      >
                        {clearingPolicyId === editingModule ? 'Removing...' : 'Remove policy'}
                      </button>
                    </div>
                  )}
                  {uploadingPolicy && (
                    <p className="text-xs text-primary-600 mt-1">Uploading policy document...</p>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Difficulty Level</label>
                    <select
                      value={formData.difficulty_level}
                      onChange={(e) => setFormData({ ...formData, difficulty_level: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Estimated Duration (minutes)</label>
                    <input
                      type="number"
                      value={formData.estimated_duration_minutes}
                      onChange={(e) => setFormData({ ...formData, estimated_duration_minutes: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      min="1"
                    />
                  </div>
                </div>

                {/* Genre Videos */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-sm font-semibold text-gray-700">Genre Videos *</label>
                    <button
                      type="button"
                      onClick={handleAddGenreVideo}
                      className="text-primary-600 hover:text-primary-700 font-semibold text-sm"
                    >
                      + Add Another Genre
                    </button>
                  </div>

                  <div className="space-y-4">
                    {genreVideos.map((gv, index) => (
                      <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="flex items-start gap-4">
                          <div className="flex-1 grid md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">Genre</label>
                              <select
                                value={gv.genre}
                                onChange={(e) => handleGenreVideoChange(index, 'genre', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              >
                                <option value="rock">Rock 🎸</option>
                                <option value="jazz">Jazz 🎷</option>
                                <option value="classical">Classical 🎻</option>
                                <option value="pop">Pop 🎤</option>
                                <option value="hip-hop">Hip-Hop 🎧</option>
                                <option value="country">Country 🤠</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">Video Title</label>
                              <input
                                type="text"
                                value={gv.title}
                                onChange={(e) => handleGenreVideoChange(index, 'title', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                placeholder="Video title"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">YouTube URL</label>
                              <input
                                type="url"
                                value={gv.youtube_url}
                                onChange={(e) => handleGenreVideoChange(index, 'youtube_url', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                placeholder="https://youtube.com/watch?v=..."
                                required
                              />
                            </div>
                          </div>

                          {genreVideos.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveGenreVideo(index)}
                              className="mt-6 text-red-500 hover:text-red-700 font-semibold"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Submit */}
                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    {editingModule ? 'Update Training Module' : 'Create Training Module'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 px-8 rounded-xl transition-all duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Modules List */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Existing Training Modules</h2>

            {modules.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📚</div>
                <p className="text-gray-600">No training modules yet. Create your first one above!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {modules.map((module) => {
                  const policyUrl = module.policy_document_url?.trim() || '';
                  const hasPolicy = Boolean(policyUrl);
                  const isExternalPolicy = hasPolicy && /^https?:\/\//i.test(policyUrl);
                  const overlayPayload = normalizeOverlayPayload(module.ai_overlay_texts);
                  const reinforcementCount =
                    overlayPayload.reinforcement?.filter((item) => item?.trim()).length || 0;
                  const highlightCount =
                    overlayPayload.policy_highlights?.filter((item) => item?.trim()).length || 0;
                  const songUrl = buildSongUrl(module.ai_song_url);
                  const songDurationLabel = formatSongDuration(module.ai_song_duration_seconds);
                  const songGeneratedLabel = module.ai_song_generated_at
                    ? new Date(module.ai_song_generated_at).toLocaleString()
                    : null;
                  return (
                    <div key={module.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{module.title}</h3>
                        {module.description && (
                          <p className="text-gray-600 text-sm mb-3">{module.description}</p>
                        )}

                        <div className="flex flex-wrap gap-2 mb-4">
                          {module.category && (
                            <span className="inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">
                              {module.category}
                            </span>
                          )}
                          {module.difficulty_level && (
                            <span className="inline-block bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-semibold">
                              {module.difficulty_level}
                            </span>
                          )}
                          {module.estimated_duration_minutes && (
                            <span className="inline-block bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">
                              ~{module.estimated_duration_minutes} min
                            </span>
                          )}
                        </div>

                        <div className="mb-4">
                          {hasPolicy ? (
                            isExternalPolicy ? (
                              <a
                                href={policyUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm text-primary-600 font-semibold hover:text-primary-700"
                              >
                                📄 View Policy PDF
                              </a>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  handleDownloadPolicy(
                                    module.id,
                                    module.policy_document_filename || module.title || 'policy'
                                  )
                                }
                                className="inline-flex items-center gap-2 text-sm text-primary-600 font-semibold hover:text-primary-700 disabled:opacity-60"
                                disabled={policyDownloadModuleId === module.id}
                              >
                                {policyDownloadModuleId === module.id ? 'Preparing PDF…' : '📄 View Policy PDF'}
                              </button>
                            )
                          ) : (
                            <span className="text-sm text-amber-600 font-semibold">No policy PDF attached</span>
                          )}
                        </div>

                        <div className="mb-4 border border-dashed border-gray-200 rounded-xl p-4 bg-gray-50">
                          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
                            AI Studio Assets
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {[
                              {
                                label: 'Policy Summary',
                                value: module.policy_summary_text ? 'Saved' : 'Missing',
                                highlight: Boolean(module.policy_summary_text),
                              },
                              {
                                label: 'Emphasis Prompt',
                                value: module.emphasis_prompt ? 'Saved' : 'Missing',
                                highlight: Boolean(module.emphasis_prompt),
                              },
                              {
                                label: 'Lyrics',
                                value: module.ai_song_lyrics ? 'Saved' : 'Missing',
                                highlight: Boolean(module.ai_song_lyrics),
                              },
                              {
                                label: 'Reminder Phrases',
                                value:
                                  reinforcementCount + highlightCount > 0
                                    ? `${reinforcementCount + highlightCount} saved`
                                    : 'Missing',
                                highlight: reinforcementCount + highlightCount > 0,
                              },
                              {
                                label: 'Song',
                                value: module.ai_song_url ? 'Generated' : 'Not yet',
                                highlight: Boolean(module.ai_song_url),
                              },
                            ].map((chip) => (
                              <div
                                key={chip.label}
                                className={`rounded-xl px-3 py-2 text-sm font-semibold border ${
                                  chip.highlight
                                    ? 'border-green-200 bg-white text-green-700'
                                    : 'border-gray-200 bg-white text-gray-500'
                                }`}
                              >
                                <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">
                                  {chip.label}
                                </p>
                                <p className="text-base font-bold">{chip.value}</p>
                              </div>
                            ))}
                          </div>
                          {songUrl ? (
                            <div className="mt-4 flex flex-col gap-2 text-sm text-gray-600">
                              <span>
                                {module.ai_song_style || 'Custom style'} • {songDurationLabel || 'Duration pending'}
                              </span>
                              <div className="flex flex-wrap items-center gap-3">
                                {songGeneratedLabel && (
                                  <span className="text-xs text-gray-500">
                                    Generated {songGeneratedLabel}
                                  </span>
                                )}
                                <a
                                  href={songUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-2 text-primary-600 font-semibold hover:text-primary-700"
                                >
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M3 14a2 2 0 012-2h6a2 2 0 012 2v3H5a2 2 0 01-2-2v-1z" />
                                    <path d="M9 3h2v9H9V3z" />
                                    <path d="M7 3h2v5H7V3z" />
                                  </svg>
                                  Listen / Download
                                </a>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-500 mt-3">
                              No AI-generated song yet. Use the AI Studio Song tab to create one.
                            </p>
                          )}
                        </div>

                        {/* Genre Videos */}
                        <div className="mb-4">
                          <p className="text-sm font-semibold text-gray-700 mb-2">Available Genres:</p>
                          <div className="flex flex-wrap gap-2">
                            {module.videos && module.videos.length > 0 ? (
                              module.videos.map((video: any) => (
                                <span key={video.id} className="inline-block bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-semibold">
                                  {video.genre} {video.genre === 'rock' && '🎸'}
                                  {video.genre === 'jazz' && '🎷'}
                                  {video.genre === 'classical' && '🎻'}
                                  {video.genre === 'pop' && '🎤'}
                                  {video.genre === 'hip-hop' && '🎧'}
                                  {video.genre === 'country' && '🤠'}
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-500 text-sm italic">No videos yet</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleEditModule(module)}
                          className="bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleAddVideoToModule(module.id)}
                          className="bg-primary-100 hover:bg-primary-200 text-primary-700 font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
                        >
                          + Add Genre
                        </button>
                        <button
                          onClick={() => openQuizBuilder(module.id, module.title)}
                          className="bg-accent-100 hover:bg-accent-200 text-accent-700 font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
                        >
                          Manage Quiz
                        </button>
                        <button
                          onClick={() => router.push(`/training/${module.id}`)}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDeleteModule(module.id)}
                          className="bg-red-100 hover:bg-red-200 text-red-700 font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
