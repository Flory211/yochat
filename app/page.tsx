'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    
    if (user) {
      router.push('/chats');
    } else {
      router.push('/login');
    }
  }, [user, loading]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-white to-purple-500 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500 mx-auto"></div>
        <p className="mt-4 text-gray-800">Загрузка...</p>
      </div>
    </div>
  );
}
