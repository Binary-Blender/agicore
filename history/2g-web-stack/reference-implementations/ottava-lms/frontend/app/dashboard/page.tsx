'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { trainingModulesAPI, progressAPI } from '@/lib/api';
import Link from 'next/link';

interface TrainingModule {
  id: string;
  title: string;
  description?: string;
  category?: string;
  difficulty_level?: string;
  estimated_duration_minutes?: number;
  thumbnail_url?: string;
  policy_document_url?: string | null;
  videos: any[];
}

interface Progress {
  video_id: string;
  status: string;
  watch_count: number;
  quiz_attempts: number;
  best_score: number;
  title?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Auth disabled - enterprise clients will integrate custom auth (AD, SSO, etc)
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [modulesData, progressData, statsData] = await Promise.all([
        trainingModulesAPI.getAll(),
        progressAPI.getUserProgress(),
        progressAPI.getStats(),
      ]);

      setModules(modulesData.training_modules || []);

      // Convert progress array to map
      const progressMap: Record<string, Progress> = {};
      (progressData.progress || []).forEach((p: Progress) => {
        progressMap[p.video_id] = p;
      });
      setProgress(progressMap);
      setStats(statsData.stats);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (videoId: string) => {
    const prog = progress[videoId];
    if (!prog) return <span className="px-3 py-1.5 text-xs font-semibold bg-gray-100 text-gray-700 rounded-lg shadow-sm">Not Started</span>;

    switch (prog.status) {
      case 'completed':
        return <span className="px-3 py-1.5 text-xs font-semibold bg-green-500 text-white rounded-lg shadow-sm">✓ Completed</span>;
      case 'watching':
        return <span className="px-3 py-1.5 text-xs font-semibold bg-primary-500 text-white rounded-lg shadow-sm">In Progress</span>;
      case 'quiz_pending':
        return <span className="px-3 py-1.5 text-xs font-semibold bg-accent-400 text-gray-900 rounded-lg shadow-sm">Quiz Pending</span>;
      case 'failed':
        return <span className="px-3 py-1.5 text-xs font-semibold bg-red-500 text-white rounded-lg shadow-sm">Failed - Retry</span>;
      default:
        return <span className="px-3 py-1.5 text-xs font-semibold bg-gray-100 text-gray-700 rounded-lg shadow-sm">Not Started</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🎵</div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        {/* Stats Section */}
        {stats && (
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-white to-primary-50 p-6 rounded-2xl shadow-lg border border-primary-100 hover:shadow-xl transition-all duration-200">
              <div className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">{stats.total_videos_assigned}</div>
              <div className="text-gray-600 mt-2 font-medium">Total Videos</div>
            </div>
            <div className="bg-gradient-to-br from-white to-green-50 p-6 rounded-2xl shadow-lg border border-green-100 hover:shadow-xl transition-all duration-200">
              <div className="text-4xl font-bold text-green-600">{stats.completed_videos}</div>
              <div className="text-gray-600 mt-2 font-medium">Completed</div>
            </div>
            <div className="bg-gradient-to-br from-white to-accent-50 p-6 rounded-2xl shadow-lg border border-accent-200 hover:shadow-xl transition-all duration-200">
              <div className="text-4xl font-bold text-accent-600">{stats.completion_rate}%</div>
              <div className="text-gray-600 mt-2 font-medium">Completion Rate</div>
            </div>
            <div className="bg-gradient-to-br from-white to-purple-50 p-6 rounded-2xl shadow-lg border border-purple-100 hover:shadow-xl transition-all duration-200">
              <div className="text-4xl font-bold text-purple-600">{stats.average_score}%</div>
              <div className="text-gray-600 mt-2 font-medium">Avg Quiz Score</div>
            </div>
          </div>
        )}

        {/* Training Modules */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent mb-6">Training Modules</h2>

          {modules.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📚</div>
              <p className="text-gray-600 text-lg">No training modules available yet</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {modules.map((module) => (
                <Link
                  key={module.id}
                  href={`/training/${module.id}`}
                  className="group block bg-gradient-to-br from-white to-gray-50 rounded-xl overflow-hidden hover:shadow-2xl transition-all duration-300 border border-gray-200 hover:border-primary-300"
                >
                  <div className="aspect-video bg-gradient-to-br from-primary-100 to-accent-100 relative overflow-hidden">
                    {module.videos && module.videos.length > 0 && module.videos[0].thumbnail_url ? (
                      <img
                        src={module.videos[0].thumbnail_url}
                        alt={module.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : module.thumbnail_url ? (
                      <img
                        src={module.thumbnail_url}
                        alt={module.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl">
                        🎵
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-gray-900 mb-2 text-lg group-hover:text-primary-600 transition-colors">{module.title}</h3>
                    {module.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{module.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {module.category && (
                        <span className="inline-block bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-semibold">
                          {module.category}
                        </span>
                      )}
                      {module.difficulty_level && (
                        <span className="inline-block bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-semibold">
                          {module.difficulty_level}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center text-gray-500">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        {module.videos?.length || 0} {module.videos?.length === 1 ? 'genre' : 'genres'}
                      </span>
                      {module.estimated_duration_minutes && (
                        <span className="text-primary-600 font-semibold text-xs">
                          ~{module.estimated_duration_minutes} min
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
