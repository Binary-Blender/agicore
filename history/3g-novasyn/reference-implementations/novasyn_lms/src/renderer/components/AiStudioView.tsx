import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import type { TrainingModule, AiAsset, Video } from '../../shared/types';

type StudioTab = 'policy' | 'audio' | 'images' | 'slideshow';

const GENRE_OPTIONS = [
  'Pop', 'Rock', 'Hip Hop', 'Country', 'R&B', 'Jazz', 'Electronic', 'Classical', 'Reggae', 'Other',
];

export default function AiStudioView() {
  const { modules, aiAssets, setAiAssets, addAiAsset } = useAppStore();
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<StudioTab>('policy');
  const [moduleVideos, setModuleVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);

  const selectedModule = modules.find((m) => m.id === selectedModuleId) ?? null;

  useEffect(() => {
    if (!selectedModuleId) return;
    (async () => {
      setLoading(true);
      try {
        const [assets, videos] = await Promise.all([
          window.electronAPI.getAiAssets(selectedModuleId),
          window.electronAPI.getVideos(selectedModuleId),
        ]);
        setAiAssets(assets);
        setModuleVideos(videos);
      } catch (err) {
        console.error('Failed to load module assets:', err);
      }
      setLoading(false);
    })();
  }, [selectedModuleId]);

  const tabs: { key: StudioTab; label: string }[] = [
    { key: 'policy', label: 'Policy & Lyrics' },
    { key: 'audio', label: 'Songs' },
    { key: 'images', label: 'Slide Images' },
    { key: 'slideshow', label: 'Slideshow & Video' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">AI Studio</h1>
      <p className="text-gray-400 text-sm mb-5">
        Build training content for each module — lyrics, songs, slide images, and slideshows.
      </p>

      {/* Module selector */}
      <div className="mb-5">
        <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1">Training Module</label>
        <select
          value={selectedModuleId ?? ''}
          onChange={(e) => { setSelectedModuleId(e.target.value || null); setActiveTab('policy'); }}
          className="w-full max-w-md bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">-- Select a module --</option>
          {modules.map((m) => (
            <option key={m.id} value={m.id}>{m.title}</option>
          ))}
        </select>
      </div>

      {!selectedModule && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-10 text-center">
          <p className="text-gray-500 text-sm">Select a training module above to manage its assets.</p>
        </div>
      )}

      {selectedModule && (
        <>
          {/* Tab bar */}
          <div className="flex border-b border-slate-700 mb-5">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-4 py-2 text-sm font-medium transition border-b-2 -mb-px ${
                  activeTab === t.key
                    ? 'border-indigo-400 text-indigo-300'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-gray-500 animate-pulse text-sm">Loading assets...</p>
          ) : (
            <>
              {activeTab === 'policy' && <PolicyTab module={selectedModule} />}
              {activeTab === 'audio' && <AudioTab moduleId={selectedModule.id} />}
              {activeTab === 'images' && <ImagesTab moduleId={selectedModule.id} />}
              {activeTab === 'slideshow' && <SlideshowTab moduleId={selectedModule.id} module={selectedModule} videos={moduleVideos} setVideos={setModuleVideos} />}
            </>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 1: Policy & Lyrics
// ---------------------------------------------------------------------------

function PolicyTab({ module }: { module: TrainingModule }) {
  const { updateModule: storeUpdateModule } = useAppStore();
  const [emphasis, setEmphasis] = useState(module.emphasisPrompt ?? '');
  const [lyrics, setLyrics] = useState(module.aiSongLyrics ?? '');
  const [overlays, setOverlays] = useState<string[]>(module.aiOverlayTexts ?? []);
  const [newOverlay, setNewOverlay] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEmphasis(module.emphasisPrompt ?? '');
    setLyrics(module.aiSongLyrics ?? '');
    setOverlays(module.aiOverlayTexts ?? []);
  }, [module.id]);

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await window.electronAPI.updateModule(module.id, {
        emphasisPrompt: emphasis,
        aiSongLyrics: lyrics,
        aiOverlayTexts: overlays,
      });
      storeUpdateModule(module.id, updated);
    } catch (err) {
      console.error('Failed to save policy fields:', err);
    }
    setSaving(false);
  }

  function addOverlay() {
    const text = newOverlay.trim();
    if (!text) return;
    setOverlays((prev) => [...prev, text]);
    setNewOverlay('');
  }

  function removeOverlay(idx: number) {
    setOverlays((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1">Policy Summary</label>
        <textarea
          readOnly
          value={module.policySummaryText ?? '(No policy summary available — upload a policy document in the Training Modules view)'}
          rows={4}
          className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-gray-300 resize-none cursor-default focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1">Emphasis Prompt</label>
        <textarea
          value={emphasis}
          onChange={(e) => setEmphasis(e.target.value)}
          rows={3}
          placeholder="Key topics or phrases to emphasize in the training song..."
          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-gray-200 resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1">Song Lyrics</label>
        <p className="text-xs text-gray-500 mb-1">Write lyrics or paste AI-generated lyrics from Suno, ChatGPT, etc.</p>
        <textarea
          value={lyrics}
          onChange={(e) => setLyrics(e.target.value)}
          rows={8}
          placeholder="Training song lyrics..."
          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-gray-200 resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1">Slide Text Overlays</label>
        <p className="text-xs text-gray-500 mb-2">Short reminder phrases displayed on slideshow images during playback.</p>
        <div className="space-y-2 mb-2">
          {overlays.map((text, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5">
              <span className="text-xs text-gray-500 w-5">{idx + 1}.</span>
              <span className="flex-1 text-sm text-gray-200">{text}</span>
              <button onClick={() => removeOverlay(idx)} className="text-red-400 hover:text-red-300 text-xs font-bold px-1">X</button>
            </div>
          ))}
          {overlays.length === 0 && (
            <p className="text-xs text-gray-500 italic">No overlay phrases added yet.</p>
          )}
        </div>
        <div className="flex gap-2">
          <input
            value={newOverlay}
            onChange={(e) => setNewOverlay(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOverlay(); } }}
            placeholder="Add a reminder phrase..."
            className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button onClick={addOverlay} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition">Add</button>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
      >
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 2: Songs (Audio Assets)
// ---------------------------------------------------------------------------

function AudioTab({ moduleId }: { moduleId: string }) {
  const { aiAssets, addAiAsset, updateAiAsset } = useAppStore();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const audioAssets = aiAssets.filter(
    (a) => a.trainingModuleId === moduleId && a.assetType === 'audio' && !a.deletedAt,
  );

  async function handleUpload() {
    const result = await window.electronAPI.pickAudioFile();
    if (!result) return;
    try {
      const asset = await window.electronAPI.createAiAsset({
        trainingModuleId: moduleId,
        assetType: 'audio',
        title: result.filename,
        description: '',
        status: 'pending',
        filePath: result.filePath,
        metadata: {},
      });
      addAiAsset(asset);
    } catch (err) {
      console.error('Failed to create audio asset:', err);
    }
  }

  async function handleDelete(id: string) {
    try {
      await window.electronAPI.deleteAiAsset(id);
      updateAiAsset(id, { deletedAt: new Date().toISOString() });
    } catch (err) {
      console.error('Failed to delete asset:', err);
    }
  }

  function togglePlay(asset: AiAsset) {
    if (playingId === asset.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.src = asset.filePath ?? '';
      audioRef.current.play();
      setPlayingId(asset.id);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-300">Training Songs ({audioAssets.length})</h2>
          <p className="text-xs text-gray-500 mt-0.5">Upload MP3 files generated with Suno, ElevenLabs, or any music tool.</p>
        </div>
        <button
          onClick={handleUpload}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition"
        >
          Upload Song
        </button>
      </div>

      <audio ref={audioRef} onEnded={() => setPlayingId(null)} className="hidden" />

      {audioAssets.length === 0 ? (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 text-center">
          <p className="text-gray-500 text-sm">No songs yet. Create a training song with Suno or another AI music tool, then upload the MP3 here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {audioAssets.map((asset) => (
            <div key={asset.id} className="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-200 truncate">{asset.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  {asset.style && <span className="text-xs text-gray-500">{asset.style}</span>}
                  {asset.durationSeconds != null && (
                    <span className="text-xs text-gray-500">{Math.floor(asset.durationSeconds / 60)}:{String(asset.durationSeconds % 60).padStart(2, '0')}</span>
                  )}
                </div>
              </div>
              <StatusBadge status={asset.status} />
              {asset.filePath && (
                <button
                  onClick={() => togglePlay(asset)}
                  className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs text-gray-300 transition"
                >
                  {playingId === asset.id ? 'Pause' : 'Play'}
                </button>
              )}
              <button
                onClick={() => handleDelete(asset.id)}
                className="px-2 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded text-xs transition"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 3: Slide Images
// ---------------------------------------------------------------------------

function ImagesTab({ moduleId }: { moduleId: string }) {
  const { aiAssets, addAiAsset, updateAiAsset } = useAppStore();

  const imageAssets = aiAssets.filter(
    (a) => a.trainingModuleId === moduleId && a.assetType === 'image' && !a.deletedAt,
  );

  async function handleUpload() {
    const result = await window.electronAPI.pickDocumentFile();
    if (!result) return;
    try {
      const asset = await window.electronAPI.createAiAsset({
        trainingModuleId: moduleId,
        assetType: 'image',
        title: result.filename,
        description: '',
        status: 'approved',
        filePath: result.filePath,
        metadata: {},
      });
      addAiAsset(asset);
    } catch (err) {
      console.error('Failed to create image asset:', err);
    }
  }

  async function handleDelete(id: string) {
    try {
      await window.electronAPI.deleteAiAsset(id);
      updateAiAsset(id, { deletedAt: new Date().toISOString() });
    } catch (err) {
      console.error('Failed to delete asset:', err);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-300">Slide Images ({imageAssets.length})</h2>
          <p className="text-xs text-gray-500 mt-0.5">Upload images to use as slideshow frames. Generate them with CGDream, DALL-E, or any image tool. Add text overlays for key compliance phrases.</p>
        </div>
        <button
          onClick={handleUpload}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition"
        >
          Upload Image
        </button>
      </div>

      {imageAssets.length === 0 ? (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 text-center">
          <p className="text-gray-500 text-sm">No slide images yet. Generate images with AI (CGDream, Midjourney, DALL-E) using your reminder phrases, then upload them here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {imageAssets.map((asset, idx) => (
            <div key={asset.id} className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden group">
              <div className="aspect-video bg-slate-900 flex items-center justify-center relative">
                {asset.filePath ? (
                  <img
                    src={`file://${asset.filePath}`}
                    alt={asset.title}
                    className="w-full h-full object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <span className="text-xs text-gray-500">No preview</span>
                )}
                <span className="absolute top-2 left-2 text-xs bg-black/60 text-white px-2 py-0.5 rounded">{idx + 1}</span>
              </div>
              <div className="px-3 py-2 flex items-center justify-between">
                <p className="text-xs text-gray-300 truncate flex-1">{asset.title}</p>
                <button
                  onClick={() => handleDelete(asset.id)}
                  className="px-2 py-0.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded text-xs transition opacity-0 group-hover:opacity-100"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 4: Slideshow & Video
// ---------------------------------------------------------------------------

function SlideshowTab({
  moduleId,
  module,
  videos,
  setVideos,
}: {
  moduleId: string;
  module: TrainingModule;
  videos: Video[];
  setVideos: React.Dispatch<React.SetStateAction<Video[]>>;
}) {
  const { aiAssets } = useAppStore();
  const [title, setTitle] = useState('');
  const [filePath, setFilePath] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [genre, setGenre] = useState(GENRE_OPTIONS[0]);
  const [saving, setSaving] = useState(false);

  const imageAssets = aiAssets.filter(
    (a) => a.trainingModuleId === moduleId && a.assetType === 'image' && !a.deletedAt,
  );
  const audioAssets = aiAssets.filter(
    (a) => a.trainingModuleId === moduleId && a.assetType === 'audio' && !a.deletedAt,
  );
  const overlays = module.aiOverlayTexts ?? [];

  async function handlePickFile() {
    const result = await window.electronAPI.pickVideoFile();
    if (result) {
      setFilePath(result.filePath);
      setFileName(result.filename);
      if (!title) setTitle(result.filename.replace(/\.[^.]+$/, ''));
    }
  }

  async function handleUploadVideo(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !filePath) return;
    setSaving(true);
    try {
      const video = await window.electronAPI.addVideo({
        trainingModuleId: moduleId,
        title: title.trim(),
        description: '',
        filePath,
        youtubeUrl: null,
        durationSeconds: 0,
        genre,
        isPrimary: videos.length === 0,
      });
      setVideos((prev) => [...prev, video]);
      setTitle('');
      setFilePath(null);
      setFileName('');
    } catch (err) {
      console.error('Failed to add video:', err);
    }
    setSaving(false);
  }

  async function handleDeleteVideo(videoId: string) {
    try {
      await window.electronAPI.deleteVideo(videoId);
      setVideos((prev) => prev.filter((v) => v.id !== videoId));
    } catch (err) {
      console.error('Failed to delete video:', err);
    }
  }

  return (
    <div className="max-w-3xl">
      {/* Slideshow assembly status */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-200 mb-3">Slideshow Assembly Checklist</h2>
        <p className="text-xs text-gray-500 mb-4">
          Create your training slideshow using AI tools, then upload the finished video here.
          The workflow: write lyrics, generate a song (Suno), create slide images (CGDream / DALL-E), add text overlays, combine into a slideshow video using any video editor or ffmpeg.
        </p>
        <div className="space-y-2">
          <ChecklistItem label="Song lyrics written" done={!!module.aiSongLyrics} detail={module.aiSongLyrics ? `${module.aiSongLyrics.split('\n').length} lines` : 'Go to Policy & Lyrics tab'} />
          <ChecklistItem label="Overlay phrases defined" done={overlays.length > 0} detail={overlays.length > 0 ? `${overlays.length} phrases` : 'Go to Policy & Lyrics tab'} />
          <ChecklistItem label="Song uploaded" done={audioAssets.length > 0} detail={audioAssets.length > 0 ? `${audioAssets.length} song(s)` : 'Go to Songs tab'} />
          <ChecklistItem label="Slide images uploaded" done={imageAssets.length > 0} detail={imageAssets.length > 0 ? `${imageAssets.length} image(s)` : 'Go to Slide Images tab'} />
          <ChecklistItem label="Training video uploaded" done={videos.length > 0} detail={videos.length > 0 ? `${videos.length} video(s)` : 'Upload below'} />
        </div>
      </div>

      {/* Upload finished slideshow video */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-200 mb-1">Upload Training Video</h2>
        <p className="text-xs text-gray-500 mb-4">
          Upload the finished slideshow video (MP4). Combine your song + images + text overlays using Kling.ai, CapCut, or any video editor.
        </p>
        <form onSubmit={handleUploadVideo} className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. HIPAA Training - Rock Version"
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePickFile}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-gray-200 text-xs rounded-lg transition"
            >
              Choose Video File
            </button>
            <span className="text-xs text-gray-400 truncate">{fileName || 'No file selected'}</span>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Genre</label>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {GENRE_OPTIONS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={saving || !title.trim() || !filePath}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
          >
            {saving ? 'Uploading...' : 'Upload Video'}
          </button>
        </form>
      </div>

      {/* Existing videos */}
      {videos.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Module Videos ({videos.length})</h3>
          <div className="space-y-2">
            {videos.map((v) => (
              <div key={v.id} className="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200 truncate">{v.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {v.genre}{v.isPrimary ? ' · Primary' : ''}
                  </p>
                </div>
                {v.isPrimary && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-medium">PRIMARY</span>
                )}
                <button
                  onClick={() => handleDeleteVideo(v.id)}
                  className="px-2 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded text-xs transition"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared components
// ---------------------------------------------------------------------------

function ChecklistItem({ label, done, detail }: { label: string; done: boolean; detail: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
        done ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-gray-500'
      }`}>
        {done ? '✓' : '○'}
      </span>
      <span className={`text-sm ${done ? 'text-gray-200' : 'text-gray-400'}`}>{label}</span>
      <span className="text-xs text-gray-500 ml-auto">{detail}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-amber-500/20 text-amber-300',
    approved: 'bg-green-500/20 text-green-300',
    rejected: 'bg-red-500/20 text-red-300',
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${colors[status] ?? 'bg-slate-600 text-gray-300'}`}>
      {status.toUpperCase()}
    </span>
  );
}
