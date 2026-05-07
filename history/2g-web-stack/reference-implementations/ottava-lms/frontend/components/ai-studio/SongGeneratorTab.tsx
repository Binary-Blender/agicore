import { useEffect, useMemo, useState } from 'react';
import { assetsAPI } from '@/lib/api';

const DEFAULT_STYLES = [
  'Safety & Security',
  'Onboarding',
  'Compliance',
  'Sales',
  'Customer Service',
  'Technical',
  'Leadership',
  'Diversity & Inclusion',
  'Remote Work',
  'Data Security',
];
const HISTORY_KEY = 'song-style-history';

interface ModuleSong {
  id: string;
  song_url: string;
  song_style?: string | null;
  song_duration_seconds?: number | null;
  created_at?: string | null;
  status?: string | null;
  asset_id?: string | null;
}

interface SongGeneratorTabProps {
  moduleId: string;
  lyrics: string;
  emphasisPrompt: string;
  reinforcement: string[];
  policyHighlights: string[];
  generating: boolean;
  songs: ModuleSong[];
  onDeleteSong: (songId: string) => void;
  deletingSongId?: string | null;
  onGenerate: (options: {
    preset: string;
    customStyle: string;
    durationSeconds: number;
    emphasisPoints: string[];
  }) => Promise<void> | void;
  onShowToast: (type: 'success' | 'error' | 'warning', message: string) => void;
  onModuleRefresh: (moduleId?: string | null) => void;
  isDraft?: boolean;
  onPendingAssetResolved?: (assetId?: string | null) => void;
}

export default function SongGeneratorTab({
  moduleId,
  lyrics,
  emphasisPrompt,
  reinforcement,
  policyHighlights,
  generating,
  songs,
  onDeleteSong,
  deletingSongId,
  onGenerate,
  onShowToast,
  onModuleRefresh,
  isDraft = false,
  onPendingAssetResolved,
}: SongGeneratorTabProps) {
  const [customStyles, setCustomStyles] = useState<string[]>([]);
  const styleOptions = useMemo(() => [...DEFAULT_STYLES, ...customStyles], [customStyles]);
  const [selectedStyle, setSelectedStyle] = useState('');
  const [newStyle, setNewStyle] = useState('');
  const [durationSeconds, setDurationSeconds] = useState(180);
  const [approvingSongId, setApprovingSongId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = JSON.parse(window.localStorage.getItem(HISTORY_KEY) || '[]');
      if (Array.isArray(saved) && saved.length) {
        const normalized = saved
          .map((value) => `${value}`.trim())
          .filter(Boolean)
          .filter((value, index, arr) => arr.indexOf(value) === index);
        setCustomStyles(normalized);
      }
    } catch {
      // ignore
    }
  }, []);

  const persistStyleHistory = (value: string) => {
    if (typeof window === 'undefined') return;
    try {
      setCustomStyles((prev) => {
        if (DEFAULT_STYLES.some((item) => item.toLowerCase() === value.toLowerCase())) {
          return prev;
        }
        if (prev.some((item) => item.toLowerCase() === value.toLowerCase())) {
          return prev;
        }
        const updated = [...prev, value];
        window.localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
        return updated;
      });
    } catch {
      // ignore
    }
  };

  const removeCustomStyle = (value: string) => {
    setCustomStyles((prev) => {
      const updated = prev.filter((item) => item.toLowerCase() !== value.toLowerCase());
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      }
      if (selectedStyle.toLowerCase() === value.toLowerCase()) {
        const fallback = DEFAULT_STYLES.find(
          (item) => !customStyles.some((custom) => custom.toLowerCase() === item.toLowerCase())
        );
        setSelectedStyle(fallback || updated[0] || '');
      }
      return updated;
    });
  };

  const emphasisPoints = useMemo(() => {
    const combined = [...reinforcement, ...policyHighlights];
    if (combined.length) {
      return combined;
    }
    return emphasisPrompt
      .split(/\r?\n|,/)
      .map((value) => value.trim())
      .filter(Boolean);
  }, [reinforcement, policyHighlights, emphasisPrompt]);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
  const resolveUrl = (input?: string | null) => {
    if (!input) return null;
    if (/^https?:\/\//i.test(input)) return input;
    return `${apiBase}${input}`;
  };
  const renderTimestamp = (input?: string | null) =>
    input ? new Date(input).toLocaleString() : 'Just now';

  const formatDuration = (seconds?: number | null) => {
    if (!seconds || seconds <= 0) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins && secs) return `${mins}m ${secs}s`;
    if (mins) return `${mins}m`;
    return `${secs}s`;
  };

  const renderStatus = (status?: string | null) => {
    if (status === 'pending') return 'Pending QC';
    if (status === 'rejected') return 'Rejected';
    return 'Approved';
  };

  const statusClasses = (status?: string | null) => {
    if (status === 'pending') return 'bg-yellow-100 text-yellow-700';
    if (status === 'rejected') return 'bg-red-100 text-red-700';
    return 'bg-green-100 text-green-700';
  };

  const handleApproveSong = async (song: ModuleSong) => {
    if (!song.asset_id) {
      onShowToast('error', 'Song asset not found. Refresh and try again.');
      return;
    }
    setApprovingSongId(song.id);
    try {
      await assetsAPI.approve(song.asset_id);
      onShowToast('success', 'Song approved and linked to the module.');
      onModuleRefresh(moduleId);
      onPendingAssetResolved?.(song.asset_id);
    } catch (error: any) {
      console.error('Approve failed', error);
      onShowToast('error', error?.response?.data?.error || 'Unable to approve song.');
    } finally {
      setApprovingSongId(null);
    }
  };

  const handleGenerateClick = () => {
    if (!moduleId || !lyrics.trim()) {
      return;
    }
    const styleValue = selectedStyle.trim();
    if (!styleValue) {
      return;
    }
    if (!styleOptions.some((item) => item.toLowerCase() === styleValue.toLowerCase())) {
      persistStyleHistory(styleValue);
    }
    onGenerate({
      preset: '',
      customStyle: styleValue,
      durationSeconds,
      emphasisPoints,
    });
  };

  const handleAddStyle = () => {
    const value = newStyle.trim();
    if (!value) return;
    if (styleOptions.some((item) => item.toLowerCase() === value.toLowerCase())) {
      setSelectedStyle(value);
      setNewStyle('');
      return;
    }
    persistStyleHistory(value);
    setSelectedStyle(value);
    setNewStyle('');
  };

  if (!moduleId) {
    return (
      <div className="px-4 py-8 max-w-5xl">
        <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-10 text-center shadow-sm">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Song Generator</h2>
          <p className="text-gray-600 mb-4">
            {isDraft
              ? 'Save your module once to unlock the song generator.'
              : 'Select a training module first to unlock song generation.'}
          </p>
        </div>
      </div>
    );
  }

  const missingLyrics = !lyrics.trim();

  return (
    <div className="px-4 py-8 max-w-5xl">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Song Generator</h2>
        <p className="text-gray-600">
          Turn your AI-generated lyrics into a polished training anthem using ElevenLabs Music. Pick a style preset,
          adjust the duration, and let the AI compose a song for your learners.
        </p>
      </div>

      {missingLyrics && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-6 text-yellow-900 text-sm">
          Generate lyrics first before composing the song.
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div>
          <p className="text-sm font-semibold text-primary-600 uppercase tracking-widest mb-1">Step 1</p>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Pick or enter a genre</h3>
          <p className="text-gray-600 mb-4">
            Start typing to add a new style or choose any previous genre from the dropdown.
          </p>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Selected style</p>
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-sm font-semibold">
                {selectedStyle || 'No style selected'}
              </span>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Add custom style</label>
              <div className="flex gap-2">
                <input
                  value={newStyle}
                  onChange={(event) => setNewStyle(event.target.value)}
                  placeholder="Example: upbeat funk with female vocals"
                  className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                />
                <button
                  type="button"
                  onClick={handleAddStyle}
                  className="px-4 py-3 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700"
                >
                  Add
                </button>
              </div>
            </div>
            {customStyles.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Saved custom styles</p>
                <div className="flex flex-wrap gap-2">
                  {customStyles.map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-700 px-3 py-1 text-xs font-semibold"
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedStyle(item)}
                        className="text-gray-700 hover:text-primary-600"
                      >
                        {item}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeCustomStyle(item)}
                        className="text-gray-500 hover:text-red-500"
                        aria-label={`Remove style ${item}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-primary-600 uppercase tracking-widest mb-1">Step 2</p>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Set duration</h3>
          <p className="text-gray-600 mb-4">Songs can range from 10 seconds up to 5 minutes. Aim for 2–3 minutes.</p>
          <div className="flex flex-col gap-2">
            <input
              type="range"
              min={10}
              max={300}
              value={durationSeconds}
              onChange={(event) => setDurationSeconds(Number(event.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-gray-600">
              <span>10s</span>
              <span>{durationSeconds} seconds</span>
              <span>300s</span>
            </div>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-primary-600 uppercase tracking-widest mb-1">Step 3</p>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Generate</h3>
          <button
            type="button"
            onClick={handleGenerateClick}
            disabled={generating || missingLyrics || !selectedStyle.trim()}
            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-3 font-semibold text-white shadow-lg hover:from-primary-700 hover:to-primary-800 disabled:opacity-60"
          >
            {generating ? 'Generating song…' : 'Generate Training Song'}
          </button>
        </div>
      </div>
      {songs.length > 0 && (
        <div className="mt-8 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">All mixes for this module</h3>
              <p className="text-gray-600 text-sm">
                Every generation stays attached to the module so you can compare takes or reuse them later.
              </p>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
                {songs.map((item) => {
                  const itemUrl = resolveUrl(item.song_url);
                  const key = `${item.id}-${item.song_url}`;
                  return (
                <div key={key} className="py-4 flex flex-col gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {item.song_style || 'Custom style'}
                      </p>
                      <div className="text-xs text-gray-500 flex items-center gap-2">
                        <span>{renderTimestamp(item.created_at)}</span>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusClasses(
                            item.status
                          )}`}
                        >
                          {renderStatus(item.status)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <span>{formatDuration(item.song_duration_seconds) || 'Duration pending'}</span>
                      {(item.status || 'approved') === 'pending' && (
                        <button
                          type="button"
                          onClick={() => handleApproveSong(item)}
                          disabled={approvingSongId === item.id}
                          className="text-green-600 hover:text-green-800 text-xs font-semibold disabled:opacity-60"
                        >
                          {approvingSongId === item.id ? 'Approving…' : 'Approve'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onDeleteSong(item.id)}
                        disabled={deletingSongId === item.id}
                        className="text-red-600 hover:text-red-800 text-xs font-semibold disabled:opacity-60"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                      {itemUrl && (
                    <audio key={key} controls className="w-full rounded-xl border border-gray-200">
                      <source src={itemUrl} type="audio/mpeg" />
                      Your browser does not support the audio element.
                    </audio>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
