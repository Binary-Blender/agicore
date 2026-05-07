'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/training-modules');
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-4">🎵</div>
        <p className="text-gray-600 text-lg">Redirecting to training modules...</p>
      </div>
    </div>
  );
}
