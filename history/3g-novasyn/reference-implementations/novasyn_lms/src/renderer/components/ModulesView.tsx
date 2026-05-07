import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import type { TrainingModule, Video, Quiz, QuizQuestion } from '../../shared/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DIFFICULTY_OPTIONS = ['beginner', 'intermediate', 'advanced'] as const;
const QUESTION_TYPES = ['multiple_choice', 'true_false', 'fill_blank'] as const;
const GENRE_OPTIONS = ['pop', 'rock', 'hip-hop', 'country', 'r&b', 'electronic', 'jazz', 'classical', 'other'] as const;

const EMPTY_QUESTION: Omit<QuizQuestion, 'id'> = {
  text: '',
  type: 'multiple_choice',
  options: ['', ''],
  correctAnswer: '',
  points: 10,
  difficulty: 'beginner',
  hint: '',
};

// ---------------------------------------------------------------------------
// Helper: difficulty badge color
// ---------------------------------------------------------------------------

function difficultyColor(level: string) {
  switch (level) {
    case 'beginner':     return 'bg-green-500/20 text-green-300';
    case 'intermediate': return 'bg-yellow-500/20 text-yellow-300';
    case 'advanced':     return 'bg-red-500/20 text-red-300';
    default:             return 'bg-slate-600/40 text-gray-400';
  }
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function ModulesView() {
  const { modules, setModules, selectedModuleId, setSelectedModuleId, addModule, updateModule: storeUpdateModule, removeModule } = useAppStore();

  const [showNewForm, setShowNewForm] = useState(false);
  const [moduleVideos, setModuleVideos] = useState<Video[]>([]);
  const [moduleQuiz, setModuleQuiz] = useState<Quiz | null>(null);
  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // --- Load modules on mount ---
  useEffect(() => {
    window.electronAPI.getModules().then(setModules).catch(console.error);
  }, [setModules]);

  // --- Load videos + quiz when selection changes ---
  useEffect(() => {
    if (!selectedModuleId) { setModuleVideos([]); setModuleQuiz(null); return; }
    window.electronAPI.getVideos(selectedModuleId).then(setModuleVideos).catch(console.error);
    window.electronAPI.getQuiz(selectedModuleId).then(setModuleQuiz).catch(console.error);
  }, [selectedModuleId]);

  const selectedModule = modules.find((m) => m.id === selectedModuleId) ?? null;

  const filteredModules = modules.filter((m) =>
    m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.category.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  function handleSelectModule(id: string) {
    setShowNewForm(false);
    setSelectedModuleId(id);
  }

  function handleNewModuleClick() {
    setSelectedModuleId(null);
    setShowNewForm(true);
  }

  return (
    <div className="flex gap-4 h-full">
      {/* ---------------------------------------------------------------- */}
      {/* Left Panel - Module List                                         */}
      {/* ---------------------------------------------------------------- */}
      <div className="w-1/3 min-w-[280px] flex flex-col bg-slate-800 rounded-lg border border-slate-700">
        <div className="p-4 border-b border-slate-700 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-200">Training Modules</h2>
            <button onClick={handleNewModuleClick} className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition">
              + New Module
            </button>
          </div>
          <input
            type="text"
            placeholder="Search modules..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-1.5 text-sm bg-slate-900 border border-slate-700 rounded-lg text-gray-300 placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredModules.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">No modules found.</p>
          ) : (
            filteredModules.map((mod) => (
              <button
                key={mod.id}
                onClick={() => handleSelectModule(mod.id)}
                className={`w-full text-left px-4 py-3 border-b border-slate-700/50 transition ${
                  selectedModuleId === mod.id
                    ? 'bg-blue-500/10 border-l-2 border-l-blue-400'
                    : 'hover:bg-slate-700/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-200 truncate pr-2">{mod.title}</span>
                  <span className={`flex-shrink-0 w-2 h-2 rounded-full ${mod.isActive ? 'bg-green-400' : 'bg-gray-600'}`} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-1.5 py-0.5 rounded bg-slate-600/50 text-gray-400">{mod.category}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${difficultyColor(mod.difficultyLevel)}`}>{mod.difficultyLevel}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Right Panel - Detail / New Form                                  */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex-1 overflow-y-auto">
        {showNewForm ? (
          <NewModuleForm
            onCreated={(mod) => { addModule(mod); setShowNewForm(false); setSelectedModuleId(mod.id); }}
            onCancel={() => setShowNewForm(false)}
          />
        ) : selectedModule ? (
          <ModuleDetail
            module={selectedModule}
            videos={moduleVideos}
            quiz={moduleQuiz}
            onUpdate={(id, updates) => storeUpdateModule(id, updates)}
            onDelete={(id) => { removeModule(id); setSelectedModuleId(null); }}
            onVideosChange={setModuleVideos}
            onQuizChange={setModuleQuiz}
            onOpenQuizBuilder={() => setQuizModalOpen(true)}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 text-sm">Select a module or create a new one.</p>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Quiz Builder Modal                                               */}
      {/* ---------------------------------------------------------------- */}
      {quizModalOpen && selectedModule && (
        <QuizBuilderModal
          moduleId={selectedModule.id}
          existingQuiz={moduleQuiz}
          onSave={(quiz) => { setModuleQuiz(quiz); setQuizModalOpen(false); }}
          onClose={() => setQuizModalOpen(false)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// New Module Form
// ---------------------------------------------------------------------------

function NewModuleForm({ onCreated, onCancel }: { onCreated: (m: TrainingModule) => void; onCancel: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState<string>('beginner');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!title.trim()) { setError('Title is required.'); return; }
    setSaving(true);
    setError(null);
    try {
      const created = await window.electronAPI.createModule({
        title: title.trim(),
        description: description.trim(),
        category: category.trim() || 'General',
        difficultyLevel: difficulty,
        estimatedDurationMinutes: 0,
        isActive: true,
        policyDocumentPath: null,
        policyDocumentFilename: null,
        policySummaryText: null,
        emphasisPrompt: null,
        aiSongLyrics: null,
        aiOverlayTexts: [],
      });
      onCreated(created);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to create module.');
    }
    setSaving(false);
  }

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 max-w-2xl">
      <h2 className="text-lg font-semibold text-gray-200 mb-4">Create New Module</h2>
      {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

      <Label text="Title" />
      <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="e.g. Workplace Safety 101" />

      <Label text="Description" />
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputCls} placeholder="Brief module description..." />

      <Label text="Category" />
      <input value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls} placeholder="e.g. Safety, HR, Compliance" />

      <Label text="Difficulty" />
      <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className={inputCls}>
        {DIFFICULTY_OPTIONS.map((d) => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
      </select>

      <div className="flex items-center gap-3 mt-6">
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-lg transition">
          {saving ? 'Creating...' : 'Create Module'}
        </button>
        <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition">Cancel</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Module Detail
// ---------------------------------------------------------------------------

interface ModuleDetailProps {
  module: TrainingModule;
  videos: Video[];
  quiz: Quiz | null;
  onUpdate: (id: string, updates: Partial<TrainingModule>) => void;
  onDelete: (id: string) => void;
  onVideosChange: (v: Video[]) => void;
  onQuizChange: (q: Quiz | null) => void;
  onOpenQuizBuilder: () => void;
}

function ModuleDetail({ module, videos, quiz, onUpdate, onDelete, onVideosChange, onQuizChange, onOpenQuizBuilder }: ModuleDetailProps) {
  const [form, setForm] = useState({ ...module });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [showAddVideo, setShowAddVideo] = useState(false);

  // Sync form when module changes
  useEffect(() => { setForm({ ...module }); setConfirmDelete(false); setStatusMsg(null); }, [module.id]);

  function patch(updates: Partial<TrainingModule>) { setForm((f) => ({ ...f, ...updates })); }

  async function handleSave() {
    setSaving(true);
    setStatusMsg(null);
    try {
      const updated = await window.electronAPI.updateModule(module.id, {
        title: form.title,
        description: form.description,
        category: form.category,
        difficultyLevel: form.difficultyLevel,
        estimatedDurationMinutes: form.estimatedDurationMinutes,
        isActive: form.isActive,
      });
      onUpdate(module.id, updated);
      setStatusMsg('Saved successfully.');
    } catch (err: any) {
      setStatusMsg(`Error: ${err?.message ?? 'Save failed.'}`);
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      await window.electronAPI.deleteModule(module.id);
      onDelete(module.id);
    } catch (err: any) {
      setStatusMsg(`Error: ${err?.message ?? 'Delete failed.'}`);
      setDeleting(false);
    }
  }

  async function handlePickDocument() {
    try {
      const result = await window.electronAPI.pickDocumentFile();
      if (!result) return;
      const updated = await window.electronAPI.updateModule(module.id, {
        policyDocumentPath: result.filePath,
        policyDocumentFilename: result.filename,
      });
      onUpdate(module.id, updated);
      patch({ policyDocumentPath: result.filePath, policyDocumentFilename: result.filename });
    } catch (err) {
      console.error('Pick document failed:', err);
    }
  }

  async function handleDeleteVideo(videoId: string) {
    try {
      await window.electronAPI.deleteVideo(videoId);
      onVideosChange(videos.filter((v) => v.id !== videoId));
    } catch (err) {
      console.error('Delete video failed:', err);
    }
  }

  return (
    <div className="space-y-6">
      {/* ---- Core Fields ---- */}
      <section className="bg-slate-800 rounded-lg border border-slate-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-200">Module Details</h2>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500">ID: {module.id.slice(0, 8)}</span>
            <span className={`px-2 py-0.5 rounded ${module.isActive ? 'bg-green-500/20 text-green-300' : 'bg-gray-600/30 text-gray-500'}`}>
              {module.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label text="Title" />
            <input value={form.title} onChange={(e) => patch({ title: e.target.value })} className={inputCls} />
          </div>
          <div className="col-span-2">
            <Label text="Description" />
            <textarea value={form.description} onChange={(e) => patch({ description: e.target.value })} rows={3} className={inputCls} />
          </div>
          <div>
            <Label text="Category" />
            <input value={form.category} onChange={(e) => patch({ category: e.target.value })} className={inputCls} />
          </div>
          <div>
            <Label text="Difficulty Level" />
            <select value={form.difficultyLevel} onChange={(e) => patch({ difficultyLevel: e.target.value })} className={inputCls}>
              {DIFFICULTY_OPTIONS.map((d) => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <Label text="Est. Duration (min)" />
            <input type="number" min={0} value={form.estimatedDurationMinutes} onChange={(e) => patch({ estimatedDurationMinutes: Number(e.target.value) })} className={inputCls} />
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
              <input type="checkbox" checked={form.isActive} onChange={(e) => patch({ isActive: e.target.checked })} className="accent-blue-500 w-4 h-4" />
              Active
            </label>
          </div>
        </div>

        {/* Save / Delete row */}
        <div className="flex items-center gap-3 mt-5">
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-lg transition">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button onClick={handleDelete} disabled={deleting} className={`px-4 py-2 text-sm font-medium rounded-lg transition ${confirmDelete ? 'bg-red-600 hover:bg-red-500 text-white' : 'text-red-400 hover:text-red-300 hover:bg-red-500/10'}`}>
            {deleting ? 'Deleting...' : confirmDelete ? 'Confirm Delete' : 'Delete Module'}
          </button>
          {confirmDelete && !deleting && (
            <button onClick={() => setConfirmDelete(false)} className="text-xs text-gray-500 hover:text-gray-300 transition">Cancel</button>
          )}
          {statusMsg && <span className={`text-xs ${statusMsg.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>{statusMsg}</span>}
        </div>
      </section>

      {/* ---- Policy Document ---- */}
      <section className="bg-slate-800 rounded-lg border border-slate-700 p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Policy Document</h3>
        <div className="flex items-center gap-3 mb-3">
          <button onClick={handlePickDocument} className="px-3 py-1.5 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-gray-300 rounded-lg transition">
            Upload Document
          </button>
          {form.policyDocumentFilename && (
            <span className="text-xs text-gray-400 truncate max-w-xs">{form.policyDocumentFilename}</span>
          )}
        </div>
        {form.policySummaryText && (
          <div>
            <Label text="Policy Summary" />
            <p className="text-sm text-gray-400 bg-slate-900 rounded-lg p-3 whitespace-pre-wrap">{form.policySummaryText}</p>
          </div>
        )}
      </section>

      {/* ---- AI Content ---- */}
      {(form.aiSongLyrics || (form.aiOverlayTexts && form.aiOverlayTexts.length > 0)) && (
        <section className="bg-slate-800 rounded-lg border border-slate-700 p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">AI-Generated Content</h3>
          {form.aiSongLyrics && (
            <div className="mb-4">
              <Label text="Song Lyrics" />
              <textarea readOnly value={form.aiSongLyrics} rows={6} className={`${inputCls} cursor-default`} />
            </div>
          )}
          {form.aiOverlayTexts && form.aiOverlayTexts.length > 0 && (
            <div>
              <Label text="Overlay Text Phrases" />
              <ul className="space-y-1">
                {form.aiOverlayTexts.map((t, i) => (
                  <li key={i} className="text-sm text-gray-400 bg-slate-900 rounded px-3 py-1.5">{t}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* ---- Videos ---- */}
      <section className="bg-slate-800 rounded-lg border border-slate-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-300">Videos ({videos.length})</h3>
          <button onClick={() => setShowAddVideo((v) => !v)} className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition">
            {showAddVideo ? 'Cancel' : '+ Add Video'}
          </button>
        </div>

        {showAddVideo && (
          <AddVideoForm
            moduleId={module.id}
            onAdded={(v) => { onVideosChange([...videos, v]); setShowAddVideo(false); }}
            onCancel={() => setShowAddVideo(false)}
          />
        )}

        {videos.length === 0 ? (
          <p className="text-xs text-gray-500">No videos attached yet.</p>
        ) : (
          <div className="space-y-2">
            {videos.map((v) => (
              <div key={v.id} className="flex items-center justify-between bg-slate-900 rounded-lg px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm text-gray-300 truncate">{v.title}</p>
                  <p className="text-xs text-gray-500">
                    {v.youtubeUrl ? 'YouTube' : 'Local file'} &middot; {v.genre} {v.durationSeconds > 0 && `\u00B7 ${Math.floor(v.durationSeconds / 60)}:${String(v.durationSeconds % 60).padStart(2, '0')}`}
                  </p>
                </div>
                <button onClick={() => handleDeleteVideo(v.id)} className="text-xs text-red-400 hover:text-red-300 ml-3 flex-shrink-0 transition">Remove</button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ---- Quiz ---- */}
      <section className="bg-slate-800 rounded-lg border border-slate-700 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-300">Quiz</h3>
          <button onClick={onOpenQuizBuilder} className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition">
            {quiz ? 'Edit Quiz' : 'Create Quiz'}
          </button>
        </div>
        {quiz ? (
          <div className="mt-3 flex items-center gap-4 text-sm">
            <span className="text-gray-400">{quiz.questions.length} question{quiz.questions.length !== 1 ? 's' : ''}</span>
            <span className="text-gray-500">&middot;</span>
            <span className="text-gray-400">Passing score: {quiz.passingScore}%</span>
          </div>
        ) : (
          <p className="mt-2 text-xs text-gray-500">No quiz configured.</p>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add Video Mini-Form
// ---------------------------------------------------------------------------

function AddVideoForm({ moduleId, onAdded, onCancel }: { moduleId: string; onAdded: (v: Video) => void; onCancel: () => void }) {
  const [title, setTitle] = useState('');
  const [source, setSource] = useState<'file' | 'youtube'>('file');
  const [filePath, setFilePath] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [genre, setGenre] = useState('pop');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePickFile() {
    try {
      const result = await window.electronAPI.pickVideoFile();
      if (result) { setFilePath(result.filePath); setFileName(result.filename); }
    } catch (err) { console.error(err); }
  }

  async function handleSave() {
    if (!title.trim()) { setError('Title is required.'); return; }
    if (source === 'file' && !filePath) { setError('Pick a video file.'); return; }
    if (source === 'youtube' && !youtubeUrl.trim()) { setError('Enter a YouTube URL.'); return; }
    setSaving(true);
    setError(null);
    try {
      const video = await window.electronAPI.addVideo({
        trainingModuleId: moduleId,
        title: title.trim(),
        description: '',
        filePath: source === 'file' ? filePath : null,
        youtubeUrl: source === 'youtube' ? youtubeUrl.trim() : null,
        durationSeconds: 0,
        genre,
        isPrimary: false,
      });
      onAdded(video);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to add video.');
      setSaving(false);
    }
  }

  return (
    <div className="bg-slate-900 rounded-lg p-4 mb-3 border border-slate-700">
      {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
      <Label text="Video Title" />
      <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="e.g. Safety Training Song" />

      <Label text="Source" />
      <div className="flex items-center gap-4 mb-3">
        <label className="flex items-center gap-1.5 text-sm text-gray-300 cursor-pointer">
          <input type="radio" name="video-source" checked={source === 'file'} onChange={() => setSource('file')} className="accent-blue-500" />
          Local File
        </label>
        <label className="flex items-center gap-1.5 text-sm text-gray-300 cursor-pointer">
          <input type="radio" name="video-source" checked={source === 'youtube'} onChange={() => setSource('youtube')} className="accent-blue-500" />
          YouTube URL
        </label>
      </div>

      {source === 'file' ? (
        <div className="flex items-center gap-2 mb-3">
          <button onClick={handlePickFile} className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-gray-300 rounded-lg transition">Pick File</button>
          {fileName && <span className="text-xs text-gray-400 truncate">{fileName}</span>}
        </div>
      ) : (
        <>
          <Label text="YouTube URL" />
          <input value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} className={inputCls} placeholder="https://youtube.com/watch?v=..." />
        </>
      )}

      <Label text="Genre" />
      <select value={genre} onChange={(e) => setGenre(e.target.value)} className={inputCls}>
        {GENRE_OPTIONS.map((g) => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
      </select>

      <div className="flex items-center gap-3 mt-3">
        <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-lg transition">
          {saving ? 'Adding...' : 'Add Video'}
        </button>
        <button onClick={onCancel} className="text-xs text-gray-500 hover:text-gray-300 transition">Cancel</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quiz Builder Modal
// ---------------------------------------------------------------------------

interface QuizBuilderProps {
  moduleId: string;
  existingQuiz: Quiz | null;
  onSave: (quiz: Quiz) => void;
  onClose: () => void;
}

function QuizBuilderModal({ moduleId, existingQuiz, onSave, onClose }: QuizBuilderProps) {
  const [passingScore, setPassingScore] = useState(existingQuiz?.passingScore ?? 80);
  const [questions, setQuestions] = useState<Omit<QuizQuestion, 'id'>[]>(
    existingQuiz ? existingQuiz.questions.map(({ id, ...rest }) => rest) : [{ ...EMPTY_QUESTION }],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateQuestion(index: number, updates: Partial<Omit<QuizQuestion, 'id'>>) {
    setQuestions((qs) => qs.map((q, i) => (i === index ? { ...q, ...updates } : q)));
  }

  function addQuestion() {
    setQuestions((qs) => [...qs, { ...EMPTY_QUESTION, options: ['', ''] }]);
  }

  function removeQuestion(index: number) {
    setQuestions((qs) => qs.filter((_, i) => i !== index));
  }

  function addOption(qIndex: number) {
    setQuestions((qs) => qs.map((q, i) => (i === qIndex ? { ...q, options: [...q.options, ''] } : q)));
  }

  function updateOption(qIndex: number, oIndex: number, value: string) {
    setQuestions((qs) =>
      qs.map((q, i) => {
        if (i !== qIndex) return q;
        const opts = [...q.options];
        opts[oIndex] = value;
        return { ...q, options: opts };
      }),
    );
  }

  function removeOption(qIndex: number, oIndex: number) {
    setQuestions((qs) =>
      qs.map((q, i) => {
        if (i !== qIndex) return q;
        return { ...q, options: q.options.filter((_, oi) => oi !== oIndex) };
      }),
    );
  }

  async function handleSave() {
    // Basic validation
    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].text.trim()) { setError(`Question ${i + 1} is missing text.`); return; }
      if (typeof questions[i].correctAnswer === 'string' && !(questions[i].correctAnswer as string).trim()) {
        setError(`Question ${i + 1} needs a correct answer.`);
        return;
      }
    }
    setSaving(true);
    setError(null);
    try {
      let quiz: Quiz;
      const payload = {
        trainingModuleId: moduleId,
        passingScore,
        questions: questions as QuizQuestion[],
      };
      if (existingQuiz) {
        quiz = await window.electronAPI.updateQuiz(existingQuiz.id, { passingScore, questions: questions as QuizQuestion[] });
      } else {
        quiz = await window.electronAPI.createQuiz(payload);
      }
      onSave(quiz);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save quiz.');
      setSaving(false);
    }
  }

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-slate-800 rounded-lg border border-slate-700 w-full max-w-3xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-gray-200">{existingQuiz ? 'Edit Quiz' : 'Create Quiz'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-lg transition">&times;</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex items-center gap-3">
            <Label text="Passing Score (%)" />
            <input type="number" min={0} max={100} value={passingScore} onChange={(e) => setPassingScore(Number(e.target.value))} className="w-24 px-3 py-1.5 text-sm bg-slate-900 border border-slate-700 rounded-lg text-gray-300 focus:outline-none focus:border-blue-500" />
          </div>

          {questions.map((q, qi) => (
            <div key={qi} className="bg-slate-900 rounded-lg border border-slate-700 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-400">Question {qi + 1}</span>
                {questions.length > 1 && (
                  <button onClick={() => removeQuestion(qi)} className="text-xs text-red-400 hover:text-red-300 transition">Remove</button>
                )}
              </div>

              <Label text="Question Text" />
              <input value={q.text} onChange={(e) => updateQuestion(qi, { text: e.target.value })} className={inputCls} placeholder="Enter question..." />

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label text="Type" />
                  <select value={q.type} onChange={(e) => updateQuestion(qi, { type: e.target.value as QuizQuestion['type'] })} className={inputCls}>
                    {QUESTION_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <Label text="Points" />
                  <input type="number" min={1} value={q.points} onChange={(e) => updateQuestion(qi, { points: Number(e.target.value) })} className={inputCls} />
                </div>
                <div>
                  <Label text="Hint (optional)" />
                  <input value={q.hint ?? ''} onChange={(e) => updateQuestion(qi, { hint: e.target.value })} className={inputCls} placeholder="Optional hint" />
                </div>
              </div>

              {/* Options for multiple choice */}
              {q.type === 'multiple_choice' && (
                <div className="mt-2">
                  <Label text="Options" />
                  <div className="space-y-1.5">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <input value={opt} onChange={(e) => updateOption(qi, oi, e.target.value)} className="flex-1 px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-gray-300 focus:outline-none focus:border-blue-500" placeholder={`Option ${oi + 1}`} />
                        {q.options.length > 2 && (
                          <button onClick={() => removeOption(qi, oi)} className="text-xs text-red-400 hover:text-red-300 transition">&times;</button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button onClick={() => addOption(qi)} className="mt-1.5 text-xs text-blue-400 hover:text-blue-300 transition">+ Add Option</button>
                </div>
              )}

              <div className="mt-2">
                <Label text="Correct Answer" />
                {q.type === 'true_false' ? (
                  <select value={typeof q.correctAnswer === 'string' ? q.correctAnswer : ''} onChange={(e) => updateQuestion(qi, { correctAnswer: e.target.value })} className={inputCls}>
                    <option value="">Select...</option>
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </select>
                ) : (
                  <input value={typeof q.correctAnswer === 'string' ? q.correctAnswer : ''} onChange={(e) => updateQuestion(qi, { correctAnswer: e.target.value })} className={inputCls} placeholder={q.type === 'multiple_choice' ? 'Must match one option exactly' : 'Expected answer'} />
                )}
              </div>
            </div>
          ))}

          <button onClick={addQuestion} className="w-full py-2 text-sm text-blue-400 hover:text-blue-300 border border-dashed border-slate-600 hover:border-blue-500/50 rounded-lg transition">
            + Add Question
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-lg transition">
            {saving ? 'Saving...' : 'Save Quiz'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared UI bits
// ---------------------------------------------------------------------------

const inputCls = 'w-full px-3 py-1.5 text-sm bg-slate-900 border border-slate-700 rounded-lg text-gray-300 placeholder-gray-500 focus:outline-none focus:border-blue-500 mb-3';

function Label({ text }: { text: string }) {
  return <label className="block text-xs font-medium text-gray-400 mb-1">{text}</label>;
}
