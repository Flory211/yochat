'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { MessageCircle, Plus, Users, LogOut as LogOutIcon } from 'lucide-react';

interface Chat {
  id: number;
  name: string;
  description: string;
  member_count: number;
  created_at: string;
}

export default function ChatsPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadChats();
  }, [user]);

  async function loadChats() {
    try {
      const response = await fetch('/api/chats', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setChats(data.chats || []);
      } else {
        setChats([]);
      }
    } catch (error) {
      console.error('Load chats error:', error);
      setChats([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-white to-purple-500 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500 mx-auto"></div>
          <p className="mt-4 text-gray-800">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-white to-purple-500">
      {/* Header */}
      <header className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-purple-500 rounded-full flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-500 to-purple-600 bg-clip-text text-transparent">
                Чат
              </h1>
              <p className="text-sm text-gray-800">Онлайн-школа Ёшкола</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-semibold text-gray-800">{user.display_name}</p>
              <p className="text-sm text-gray-800 capitalize">
                {user.role === 'admin' ? 'Администратор' : user.role === 'teacher' ? 'Учитель' : 'Ученик'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-800 hover:text-red-600 transition flex items-center gap-2"
              title="Выйти"
            >
              <LogOutIcon className="w-6 h-6" />
              <span className="text-sm font-medium">Выйти</span>
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-gray-800">Мои чаты</h2>
          {(user.role === 'admin' || user.role === 'teacher') && (
            <button
              onClick={() => router.push('/chats/new')}
              className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-purple-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-yellow-500 hover:to-purple-600 transition-all shadow-lg"
            >
              <Plus className="w-5 h-5" />
              Создать чат
            </button>
          )}
        </div>

        {chats.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <MessageCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Пока нет чатов</h3>
            <p className="text-gray-800">
              {user.role === 'admin' || user.role === 'teacher'
                ? 'Создайте первый чат для ваших учеников'
                : 'Администратор скоро добавит вас в чаты'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {chats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => router.push(`/chats/${chat.id}`)}
                className="bg-white rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-2xl transition-all hover:scale-105"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-purple-500 rounded-full flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-800">
                    <Users className="w-4 h-4" />
                    <span>{chat.member_count}</span>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">{chat.name}</h3>
                <p className="text-gray-700 text-sm line-clamp-2">{chat.description || 'Без описания'}</p>
              </div>
            ))}
          </div>
        )}

        {/* Кнопка админ-панели - только для Leo */}
        {user.username === 'Leo' && (
          <div className="mt-8">
            <button
              onClick={() => router.push('/admin')}
              className="w-full bg-white border-2 border-purple-500 text-purple-600 py-4 rounded-xl font-semibold hover:bg-purple-50 transition-all shadow-lg"
            >
              Панель администратора
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
