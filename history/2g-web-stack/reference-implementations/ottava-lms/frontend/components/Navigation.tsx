'use client';

import Link from 'next/link';

export default function Navigation() {
  return (
    <nav className="bg-gradient-to-r from-primary-600 to-primary-700 shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center space-x-3 group">
            <div className="bg-accent-400 p-2 rounded-lg group-hover:bg-accent-500 transition-all duration-200">
              <span className="text-2xl">🎵</span>
            </div>
            <span
              className="text-2xl font-bold text-white tracking-tight"
              title="at an octave higher or lower than written — used as a direction in music"
            >
              Ottava LMS
            </span>
          </Link>

          <div className="flex items-center space-x-6">
            <Link
              href="/dashboard"
              className="text-white/90 hover:text-accent-300 font-medium transition-colors duration-200 flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Training</span>
            </Link>
            <Link
              href="/favorites"
              className="text-white/90 hover:text-accent-300 font-medium transition-colors duration-200 flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span>Favorites</span>
            </Link>
            <Link
              href="/command-center"
              className="text-white/90 hover:text-accent-300 font-medium transition-colors duration-200 flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h10a4 4 0 004-4M3 9a4 4 0 014-4h10a4 4 0 014 4M3 9h18M3 15h18" />
              </svg>
              <span>Command Center</span>
            </Link>
            <Link
              href="/admin/ai-studio"
              className="text-white/90 hover:text-accent-300 font-medium transition-colors duration-200 flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7M9 5l.867 1.802 1.994.29-1.44 1.404.34 2-1.761-.926-1.761.926.34-2-1.44-1.404 1.994-.29L9 5z" />
              </svg>
              <span>AI Studio</span>
            </Link>
            <Link
              href="/admin/training-modules"
              className="text-white/90 hover:text-accent-300 font-medium transition-colors duration-200 flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span>Admin</span>
            </Link>
            <Link
              href="/admin/system"
              className="text-white/90 hover:text-accent-300 font-medium transition-colors duration-200 flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
              <span>System</span>
            </Link>
            <div className="flex items-center space-x-4 border-l border-primary-500 pl-6">
              <span className="text-white/80 font-medium text-sm">
                Demo Mode
              </span>
              <div className="bg-accent-400/20 text-accent-200 font-medium px-3 py-1.5 rounded-lg text-sm border border-accent-400/30">
                Custom Auth Placeholder
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
