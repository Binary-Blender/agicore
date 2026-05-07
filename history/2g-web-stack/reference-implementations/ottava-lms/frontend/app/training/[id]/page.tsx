'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { trainingModulesAPI, preferencesAPI, quizAPI, progressAPI, favoritesAPI } from '@/lib/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Video {
  id: string;
  genre: string;
  title: string;
  description?: string;
  duration_seconds: number;
  thumbnail_url?: string;
  s3_url: string;
  lyrics?: string;
}

interface TrainingModule {
  id: string;
  title: string;
  description?: string;
  category?: string;
  difficulty_level?: string;
  estimated_duration_minutes?: number;
  thumbnail_url?: string;
  policy_document_url?: string | null;
  policy_document_filename?: string | null;
  policy_summary_text?: string | null;
  emphasis_prompt?: string | null;
  ai_song_lyrics?: string | null;
  ai_song_url?: string | null;
  ai_song_duration_seconds?: number | null;
  ai_song_style?: string | null;
  ai_song_generated_at?: string | null;
  ai_overlay_texts?: {
    reinforcement?: string[];
    policy_highlights?: string[];
    combined?: string[];
  } | null;
  videos: Video[];
  default_video?: Video;
}

interface QuizQuestion {
  id: string;
  question: string;
  type: string;
  options?: string[];
  correct_answer: string | string[];
  points: number;
  hint?: string;
}

interface Quiz {
  id: string;
  passing_score: number;
  questions: QuizQuestion[];
}

const buildSongUrl = (input?: string | null) => {
  if (!input) return null;
  if (/^https?:\/\//i.test(input)) {
    return input;
  }
  return `${API_BASE_URL}${input}`;
};

const formatDuration = (seconds?: number | null) => {
  if (!seconds || seconds <= 0) return null;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins && secs) return `${mins}m ${secs}s`;
  if (mins) return `${mins}m`;
  return `${secs}s`;
};

export default function TrainingModulePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const videoIdFromQuery = searchParams.get('videoId');
  const [module, setModule] = useState<TrainingModule | null>(null);
  const [preferredGenre, setPreferredGenre] = useState<string>('');
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [videoProgress, setVideoProgress] = useState<any>(null);
  const [watchStatuses, setWatchStatuses] = useState<Record<string, boolean>>({});
  const [readyVideoId, setReadyVideoId] = useState<string | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [quizResult, setQuizResult] = useState<any>(null);
  const [isHistoricalResult, setIsHistoricalResult] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hintsShown, setHintsShown] = useState<Record<string, boolean>>({});
  const [hintsUsed, setHintsUsed] = useState<string[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [stateLoading, setStateLoading] = useState(false);
  const [policyDownloadLoading, setPolicyDownloadLoading] = useState(false);

  useEffect(() => {
    loadModule(videoIdFromQuery);
  }, [params.id, videoIdFromQuery]);

  useEffect(() => {
    if (!selectedVideo) return;

    const fetchVideoState = async () => {
      setStateLoading(true);
      try {
        const [progressRes, favoriteStatus] = await Promise.all([
          progressAPI.getVideoProgress(selectedVideo.id).catch(() => ({ progress: null })),
          favoritesAPI.checkStatus(selectedVideo.id).catch(() => ({ is_favorite: false })),
        ]);
        const progressData = progressRes.progress ?? null;
        setVideoProgress(progressData);

        if (progressData && progressData.watch_count > 0) {
          setWatchStatuses((prev) => ({ ...prev, [selectedVideo.id]: true }));
          setReadyVideoId((prev) => prev || selectedVideo.id);
          setShowQuiz(true);
        }
        setIsFavorite(favoriteStatus.is_favorite);
      } catch (error) {
        console.error('Failed to fetch video state:', error);
      } finally {
        setStateLoading(false);
      }
    };

    fetchVideoState();
  }, [selectedVideo?.id]);

  const loadModule = async (requestedVideoId?: string | null) => {
    setLoading(true);
    try {
      let pref: string | undefined;
      try {
        const prefResponse = await preferencesAPI.getGenre();
        const existingPreference = prefResponse?.preferred_genre || prefResponse?.genre;
        if (existingPreference) {
          pref = existingPreference;
          setPreferredGenre(existingPreference);
        }
      } catch {
        // No preference stored yet
      }

      const moduleId = params.id as string;
      const [moduleResponse, quizResponse, latestAttemptResponse] = await Promise.all([
        trainingModulesAPI.getById(moduleId, pref),
        quizAPI.getByTrainingModuleId(moduleId).catch(() => ({ quiz: null })),
        quizAPI.getLatestAttemptByTrainingModule(moduleId).catch(() => ({ attempt: null })),
      ]);

      const moduleData: TrainingModule = moduleResponse.training_module;
      const availableVideos = moduleData.videos || [];
      let initialVideo: Video | undefined;

      if (requestedVideoId) {
        initialVideo = availableVideos.find((video) => video.id === requestedVideoId);
      }

      if (!initialVideo && moduleData.default_video) {
        initialVideo = moduleData.default_video;
      }

      if (!initialVideo && availableVideos.length > 0) {
        initialVideo = pref
          ? availableVideos.find((video) => video.genre === pref) || availableVideos[0]
          : availableVideos[0];
      }

      setModule({ ...moduleData, videos: availableVideos });
      setSelectedVideo(initialVideo || null);
      setQuiz(quizResponse.quiz || null);

      if (latestAttemptResponse.attempt && quizResponse.quiz) {
        setQuizResult({
          ...latestAttemptResponse.attempt,
          score: Number(latestAttemptResponse.attempt.score),
          passing_score: Number(
            latestAttemptResponse.attempt.passing_score ?? quizResponse.quiz.passing_score ?? 0
          ),
        });
        setIsHistoricalResult(true);
        setShowQuiz(true);
      } else {
        setQuizResult(null);
        setIsHistoricalResult(false);
      }
    } catch (error) {
      console.error('Failed to fetch training module:', error);
    } finally {
      setLoading(false);
    }
  };

  const availableGenres = useMemo(() => {
    if (!module) return [];
    return module.videos.map((video) => video.genre).filter(Boolean);
  }, [module]);

  const otherVideos = useMemo(() => {
    if (!module || !selectedVideo) return [];
    return module.videos.filter((video) => video.id !== selectedVideo.id);
  }, [module, selectedVideo]);

  const hasCompletedSelectedVideo = selectedVideo ? !!watchStatuses[selectedVideo.id] : false;
  const readyVideo = module?.videos.find((video) => video.id === readyVideoId) || null;

  const handleGenreChange = async (genre: string) => {
    if (!module) return;
    const video = module.videos.find((v) => v.genre === genre);
    if (!video) return;

    setSelectedVideo(video);

    if (genre !== preferredGenre) {
      try {
        await preferencesAPI.setGenre(genre);
        setPreferredGenre(genre);
      } catch (error) {
        console.error('Failed to save preferred genre:', error);
      }
    }
  };

  const handleDownloadPolicy = async () => {
    if (!module?.id || !module.policy_document_url) {
      return;
    }
    try {
      setPolicyDownloadLoading(true);
      const response = await trainingModulesAPI.downloadPolicy(module.id);
      const blob = new Blob([response.data], {
        type: response.headers['content-type'] || 'application/pdf',
      });
      const filename = module.policy_document_filename || `${module.title || 'policy'}.pdf`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download policy document:', error);
    } finally {
      setPolicyDownloadLoading(false);
    }
  };

  const handleVideoComplete = async () => {
    if (!selectedVideo) return;
    if (readyVideoId === selectedVideo.id) {
      setShowQuiz(true);
      return;
    }

    try {
      await progressAPI.recordWatch({
        video_id: selectedVideo.id,
        watch_percentage: 100,
        device_type: 'web',
      });

      setWatchStatuses((prev) => ({ ...prev, [selectedVideo.id]: true }));
      setReadyVideoId(selectedVideo.id);
      setShowQuiz(true);
      setQuizResult(null);
      setIsHistoricalResult(false);
      setAnswers({});
      setHintsShown({});
      setHintsUsed([]);
    } catch (error) {
      console.error('Failed to record watch session:', error);
    }
  };

  const handleAnswerChange = (questionId: string, answer: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const toggleHint = (questionId: string) => {
    setHintsShown((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));

    setHintsUsed((prev) => (
      prev.includes(questionId) ? prev : [...prev, questionId]
    ));
  };

  const handleQuizSubmit = async () => {
    if (!quiz || !readyVideoId) return;

    setSubmitting(true);
    try {
      const result = await quizAPI.submit({
        video_id: readyVideoId,
        quiz_id: quiz.id,
        answers,
        hints_used: hintsUsed,
      });

      const normalizedResult = {
        ...result,
        score: Number(result.score),
        passing_score: Number(result.passing_score),
        completed_at: new Date().toISOString(),
      };

      setQuizResult(normalizedResult);
      setIsHistoricalResult(false);
    } catch (error) {
      console.error('Failed to submit quiz:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetakeQuiz = () => {
    setQuizResult(null);
    setAnswers({});
    setHintsShown({});
    setHintsUsed([]);
    setIsHistoricalResult(false);
    setShowQuiz(true);
  };

  const toggleFavorite = async () => {
    if (!selectedVideo || favoriteLoading) return;

    setFavoriteLoading(true);
    try {
      if (isFavorite) {
        await favoritesAPI.remove(selectedVideo.id);
        setIsFavorite(false);
      } else {
        await favoritesAPI.add(selectedVideo.id);
        setIsFavorite(true);
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    } finally {
      setFavoriteLoading(false);
    }
  };

  const songUrl = useMemo(() => buildSongUrl(module?.ai_song_url), [module?.ai_song_url]);
  const songDurationLabel = useMemo(
    () => formatDuration(module?.ai_song_duration_seconds),
    [module?.ai_song_duration_seconds]
  );
  const songGeneratedLabel = useMemo(
    () => (module?.ai_song_generated_at ? new Date(module.ai_song_generated_at).toLocaleString() : null),
    [module?.ai_song_generated_at]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🎵</div>
          <p className="text-gray-600 text-lg">Loading training module...</p>
        </div>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <Navigation />
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Training Module Not Found</h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!selectedVideo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <Navigation />
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="text-6xl mb-4">🎬</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">No videos are available for this module yet.</h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="flex-1">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent mb-2">
                  {module.title}
                </h1>
                {module.description && (
                  <p className="text-gray-600 text-lg mb-4">{module.description}</p>
                )}
                {module?.policy_document_url && (
                  <button
                    type="button"
                    onClick={handleDownloadPolicy}
                    disabled={policyDownloadLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 mb-4 bg-white border border-primary-200 text-primary-700 rounded-xl font-semibold shadow-sm hover:bg-primary-50 transition disabled:opacity-60"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m7-7H5" />
                    </svg>
                    {policyDownloadLoading ? 'Preparing PDF…' : 'View Policy PDF'}
                  </button>
                )}
                <div className="flex flex-wrap gap-3">
                  {module.category && (
                    <span className="inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">
                      {module.category}
                    </span>
                  )}
                  {module.difficulty_level && (
                    <span className="inline-block bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-semibold">
                      {module.difficulty_level}
                    </span>
                  )}
                  {module.estimated_duration_minutes && (
                    <span className="inline-block bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">
                      ~{module.estimated_duration_minutes} min
                    </span>
                  )}
                </div>
              </div>
              <div className="bg-accent-100 text-accent-700 px-4 py-2 rounded-xl text-sm font-semibold border border-accent-200">
                Pick your genre, learn fast, pass the quiz ✅
              </div>
            </div>
          </div>
          {songUrl && (
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
              <div className="flex flex-col lg:flex-row gap-6 lg:items-center">
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-widest text-primary-600 mb-2">
                    AI Training Song
                  </p>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Listen before you quiz
                  </h2>
                  <p className="text-gray-600">
                    This song turns {module.title} into a memorable hook. Listen while reviewing the policy,
                    then jump into your preferred music genre videos.
                  </p>

                  <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-4">
                    {module.ai_song_style && (
                      <span className="inline-flex items-center gap-2 rounded-full bg-primary-50 text-primary-700 px-3 py-1 font-semibold">
                        <span>Style</span>
                        <span className="text-primary-500">•</span>
                        <span className="font-normal">{module.ai_song_style}</span>
                      </span>
                    )}
                    {songDurationLabel && (
                      <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 text-gray-700 px-3 py-1 font-semibold">
                        <span>Duration</span>
                        <span className="text-gray-400">•</span>
                        <span className="font-normal">{songDurationLabel}</span>
                      </span>
                    )}
                    {songGeneratedLabel && (
                      <span className="inline-flex items-center gap-2 text-xs text-gray-500">
                        Generated {songGeneratedLabel}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3 mt-4">
                    <a
                      href={songUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-primary-200 text-primary-700 font-semibold hover:bg-primary-50 transition"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M3 14a2 2 0 012-2h6a2 2 0 012 2v3H5a2 2 0 01-2-2v-1z" />
                        <path d="M9 3h2v9H9V3z" />
                        <path d="M7 3h2v5H7V3z" />
                      </svg>
                      Download MP3
                    </a>
                  </div>
                </div>
                <div className="lg:w-80">
                  <audio controls className="w-full rounded-2xl border border-gray-200" src={songUrl} preload="metadata">
                    Your browser does not support the audio element.
                  </audio>
                </div>
              </div>
            </div>
          )}

        {/* Genre Picker */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Choose Your Genre</h2>
                <p className="text-gray-600">
                  Explore every musical style before you lock in your quiz attempt.
                  {preferredGenre && (
                    <span className="block mt-1 text-primary-600 font-semibold">
                      Saved preference: {preferredGenre.charAt(0).toUpperCase() + preferredGenre.slice(1)}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {availableGenres.map((genre) => (
                <button
                  key={genre}
                  onClick={() => handleGenreChange(genre)}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-start ${
                    selectedVideo.genre === genre
                      ? 'border-primary-600 bg-primary-50 shadow-lg scale-105'
                      : 'border-gray-200 bg-white hover:border-primary-300 hover:shadow-md'
                  }`}
                >
                  <span className="text-3xl mb-2">
                    {genre === 'rock' && '🎸'}
                    {genre === 'jazz' && '🎷'}
                    {genre === 'classical' && '🎻'}
                    {genre === 'pop' && '🎤'}
                    {genre === 'hip-hop' && '🎧'}
                    {genre === 'country' && '🤠'}
                    {!['rock', 'jazz', 'classical', 'pop', 'hip-hop', 'country'].includes(genre) && '🎵'}
                  </span>
                  <span className={`font-bold ${selectedVideo.genre === genre ? 'text-primary-700' : 'text-gray-700'}`}>
                    {genre.charAt(0).toUpperCase() + genre.slice(1)}
                  </span>
                  {watchStatuses[module.videos.find((v) => v.genre === genre)?.id || ''] && (
                    <span className="mt-2 text-xs font-semibold text-green-600">Watched</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Video Experience */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
            <div className="aspect-video bg-black">
              <iframe
                key={selectedVideo.id}
                src={selectedVideo.s3_url}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="p-8 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">
                      {selectedVideo.title}
                    </h3>
                    <span className="inline-block bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-sm font-semibold">
                      {selectedVideo.genre.charAt(0).toUpperCase() + selectedVideo.genre.slice(1)}
                    </span>
                  </div>
                  <p className="text-gray-600 text-lg">
                    Duration: {Math.floor(selectedVideo.duration_seconds / 60)}:
                    {(selectedVideo.duration_seconds % 60).toString().padStart(2, '0')}
                  </p>
                  {videoProgress?.status && (
                    <p className="text-sm text-gray-500 mt-1">
                      Status: <span className="font-semibold text-primary-600">{videoProgress.status.replace(/_/g, ' ')}</span>
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={toggleFavorite}
                    disabled={favoriteLoading}
                    className={`p-3 rounded-full transition-all duration-200 ${
                      isFavorite
                        ? 'bg-red-100 text-red-600 hover:bg-red-200'
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-red-600'
                    } ${favoriteLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <svg
                      className="w-6 h-6"
                      fill={isFavorite ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={handleVideoComplete}
                    disabled={stateLoading}
                    className={`bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 text-lg ${
                      stateLoading ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    {readyVideoId === selectedVideo.id ? 'Quiz Ready ✓' : "I'm Ready - Unlock Quiz"}
                  </button>
                </div>
              </div>

              {selectedVideo.description && (
                <p className="text-gray-600 leading-relaxed">{selectedVideo.description}</p>
              )}
              {module?.policy_document_url && (
                <div className="mt-6 rounded-xl border border-primary-100 bg-primary-50/60 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-primary-700">Prefer to read the policy?</p>
                    <p className="text-sm text-primary-600">Open the official PDF for deeper context or to skip straight to the details.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadPolicy}
                    disabled={policyDownloadLoading}
                    className="px-5 py-2 bg-primary-600 text-white rounded-xl font-semibold shadow hover:bg-primary-700 transition disabled:opacity-60"
                  >
                    {policyDownloadLoading ? 'Preparing PDF…' : 'Read Policy'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Other Videos */}
          {otherVideos.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Other Ways to Learn</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {otherVideos.map((video) => (
                  <div key={video.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
                    <div>
                      <p className="font-semibold text-gray-900">{video.title}</p>
                      <p className="text-sm text-gray-500">{video.genre.charAt(0).toUpperCase() + video.genre.slice(1)} • {Math.floor(video.duration_seconds / 60)}:{(video.duration_seconds % 60).toString().padStart(2, '0')}</p>
                    </div>
                    <button
                      onClick={() => handleGenreChange(video.genre)}
                      className="text-primary-600 font-semibold hover:text-primary-700"
                    >
                      Watch →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quiz Section */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">Quiz</h2>
                <p className="text-sm text-gray-600 mt-1">
                  One quiz per module - sample every genre you like before answering.
                </p>
                {readyVideo && (
                  <p className="text-xs text-gray-500 mt-1">
                    Currently unlocked after finishing: <span className="font-semibold">{readyVideo.title}</span> ({readyVideo.genre})
                  </p>
                )}
              </div>
              {quiz && (
                <span className="bg-accent-100 text-accent-700 px-4 py-2 rounded-xl font-bold text-sm">
                  Passing: {quiz.passing_score}%
                </span>
              )}
            </div>

            {!quiz && (
              <div className="text-center py-10">
                <div className="text-6xl mb-4">🛠️</div>
                <p className="text-gray-600 text-lg">Quiz coming soon for this module.</p>
              </div>
            )}

            {quiz && !showQuiz && (
              <div className="bg-gradient-to-br from-white to-primary-50 rounded-2xl shadow-inner p-8 text-center border border-primary-100">
                <div className="text-5xl mb-4">🎯</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Watch your favorite version first</h3>
                <p className="text-gray-600 mb-6 text-lg">
                  Ready when you are! Unlock the quiz by marking at least one music video as watched.
                </p>
                <p className="text-sm text-gray-500">Select a video above and click "I'm Ready - Unlock Quiz"</p>
              </div>
            )}

            {quiz && showQuiz && !quizResult && (
              <div className="space-y-8">
                {quiz.questions.map((question, index) => (
                  <div key={question.id} className="bg-gradient-to-br from-gray-50 to-primary-50 p-6 rounded-xl border border-gray-200">
                    <h3 className="font-bold text-gray-900 mb-4 text-lg">
                      <span className="bg-primary-600 text-white w-8 h-8 rounded-full inline-flex items-center justify-center mr-3">
                        {index + 1}
                      </span>
                      {question.question}
                    </h3>

                    {question.type === 'multiple_choice' && question.options && (
                      <div className="space-y-3">
                        {question.options.map((option) => (
                          <label key={option} className="flex items-center space-x-3 cursor-pointer group">
                            <input
                              type="radio"
                              name={question.id}
                              value={option}
                              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                              className="w-5 h-5 text-primary-600 focus:ring-primary-500 focus:ring-2"
                            />
                            <span className="text-gray-800 group-hover:text-primary-600 transition-colors font-medium">{option}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {question.type === 'true_false' && question.options && (
                      <div className="space-y-3">
                        {question.options.map((option) => (
                          <label key={option} className="flex items-center space-x-3 cursor-pointer group">
                            <input
                              type="radio"
                              name={question.id}
                              value={option}
                              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                              className="w-5 h-5 text-primary-600 focus:ring-primary-500 focus:ring-2"
                            />
                            <span className="text-gray-800 group-hover:text-primary-600 transition-colors font-medium">{option}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {question.type === 'fill_in_the_blank' && (
                      <input
                        type="text"
                        placeholder="Type your answer here..."
                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all font-medium"
                      />
                    )}

                    {question.hint && (
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => toggleHint(question.id)}
                          className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center transition-colors"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {hintsShown[question.id] ? 'Hide Hint' : 'Show Hint'}
                        </button>
                        {hintsShown[question.id] && (
                          <p className="text-sm text-gray-700 mt-2 p-3 bg-blue-50 border-l-4 border-primary-500 rounded">
                            💡 {question.hint}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                <button
                  onClick={handleQuizSubmit}
                  disabled={submitting || Object.keys(answers).length !== quiz.questions.length}
                  className="mt-4 w-full bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Submitting...' : 'Submit Quiz'}
                </button>
              </div>
            )}

            {quizResult && (
              <div
                className={`rounded-2xl shadow-2xl p-10 text-center border-2 ${
                  quizResult.passed
                    ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-300'
                    : 'bg-gradient-to-br from-red-50 to-red-100 border-red-300'
                }`}
              >
                <div className="text-7xl mb-6">{quizResult.passed ? '🎉' : '😔'}</div>
                <h2 className="text-4xl font-bold mb-2">
                  {quizResult.passed ? 'Nice work!' : 'Keep going!'}
                </h2>
                <p className="text-sm text-gray-500 mb-4">
                  {isHistoricalResult ? 'Last recorded attempt' : 'Latest attempt'}
                  {quizResult.attempt_number ? ` • Attempt #${quizResult.attempt_number}` : ''}
                  {quizResult.completed_at ? ` • ${new Date(quizResult.completed_at).toLocaleString()}` : ''}
                </p>
                <p className="text-2xl font-semibold text-gray-800 mb-4">
                  Your score:{' '}
                  <span className={quizResult.passed ? 'text-green-600' : 'text-red-600'}>
                    {Number(quizResult.score).toFixed(1)}%
                  </span>{' '}
                  (Pass: {Number(quizResult.passing_score)}%)
                </p>
                <p className="text-gray-700 mb-6 text-lg">
                  {quizResult.passed
                    ? 'You passed this module! Explore another genre or retake the quiz for extra practice.'
                    : 'Rewatch any genre you like and give the quiz another shot.'}
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <button
                    onClick={handleRetakeQuiz}
                    className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-bold py-4 px-10 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 text-lg"
                  >
                    {quizResult.passed ? 'Retake Quiz' : 'Try Again'}
                  </button>
                  {quizResult.passed && (
                    <div className="inline-block bg-green-500 text-white px-6 py-3 rounded-xl font-bold">
                      ✓ Training Complete
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
