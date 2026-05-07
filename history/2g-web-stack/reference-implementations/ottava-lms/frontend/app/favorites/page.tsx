'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { favoritesAPI } from '@/lib/api';

interface FavoriteVideo {
  favorite_id: string;
  favorited_at: string;
  id: string;
  title: string;
  description?: string;
  duration_seconds: number;
  thumbnail_url?: string;
  genre?: string;
  training_module_id?: string | null;
}

export default function FavoritesPage() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<FavoriteVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      const response = await favoritesAPI.getAll();
      setFavorites(response.favorites || []);
    } catch (error) {
      console.error('Failed to fetch favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateToTraining = (video: FavoriteVideo) => {
    if (video.training_module_id) {
      const query = video.id ? `?videoId=${video.id}` : '';
      router.push(`/training/${video.training_module_id}${query}`);
    } else {
      router.push('/dashboard');
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">❤️</div>
          <p className="text-gray-600 text-lg">Loading favorites...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent mb-2">
              My Favorite Videos
            </h1>
            <p className="text-gray-600 text-lg">
              Your collection of favorited training videos
            </p>
          </div>

          {favorites.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-100">
              <div className="text-6xl mb-4">💔</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">No favorites yet</h2>
              <p className="text-gray-600 mb-6 text-lg">
                Start adding videos to your favorites by clicking the heart icon on any video!
              </p>
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Browse Videos
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favorites.map((video) => (
                <div
                  key={video.favorite_id}
                  onClick={() => navigateToTraining(video)}
                  className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-200 cursor-pointer transform hover:scale-105 border border-gray-100"
                >
                  {video.thumbnail_url ? (
                    <div className="aspect-video bg-gray-200">
                      <img
                        src={video.thumbnail_url}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-video bg-gradient-to-br from-primary-100 to-accent-100 flex items-center justify-center">
                      <div className="text-6xl">🎵</div>
                    </div>
                  )}

                  <div className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-bold text-gray-900 line-clamp-2 flex-1">
                        {video.title}
                      </h3>
                      <div className="ml-2 text-red-600">
                        <svg
                          className="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </div>
                    </div>

                    {video.genre && (
                      <div className="mb-2">
                        <span className="inline-block bg-primary-100 text-primary-700 px-2 py-1 rounded-full text-xs font-semibold">
                          {video.genre.charAt(0).toUpperCase() + video.genre.slice(1)}
                        </span>
                      </div>
                    )}

                    {video.description && (
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                        {video.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">
                        {formatDuration(video.duration_seconds)}
                      </span>
                      <span className="text-primary-600 font-semibold hover:text-primary-700">
                        Watch Now →
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
