'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard immediately
    router.push('/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-blue-50 to-accent-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">🎵</div>
        <p className="text-gray-600 text-lg">Loading MelodyLMS...</p>
      </div>
    </div>
  );
}
