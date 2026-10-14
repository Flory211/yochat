'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft } from 'lucide-react';

interface User {
  id: number;
  username: string;
  display_name: string;
  role: string;
}

export default function NewChatPage() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
      router.push('/chats');
      return;
    }
    loadUsers();
  }, [user]);

  async function loadUsers() {
    try {
      const response = await fetch('/api/admin?type=users', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Load users error:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          member_ids: selectedUsers,
        }),
        credentials: 'include',
      });

      if (response.ok) {
        router.push('/chats');
      } else {
        const data = await response.json();
        setError(data.error);
      }
    } catch (error) {
      setError('Ошибка сервера');
    } finally {
      setLoading(false);
    }
  }

  function toggleUser(userId: number) {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-white to-purple-500">
      <header className="bg-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.push('/chats')}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-6 h-6 text-gray-800" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Создать новый чат</h1>
            <p className="text-sm text-gray-800">Создайте групповой чат для вашего класса</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Название чата *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
              placeholder="Например: Математика 9 класс"
              required
            />
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Описание
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
              placeholder="Описание чата (необязательно)"
              rows={3}
            />
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <label className="block text-sm font-medium text-gray-700 mb-4">
              Участники ({selectedUsers.length} выбрано)
            </label>
            
            {users.length === 0 ? (
              <p className="text-gray-800 text-center py-8">Нет доступных пользователей</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {users.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => toggleUser(u.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${
                      selectedUsers.includes(u.id)
                        ? 'bg-purple-100 border-2 border-purple-500'
                        : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                    }`}
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {u.display_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">{u.display_name}</p>
                      <p className="text-sm text-gray-800">@{u.username}</p>
                    </div>
                    <div className="text-sm text-gray-800 capitalize">
                      {u.role === 'admin' ? 'Админ' : u.role === 'teacher' ? 'Учитель' : 'Ученик'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.push('/chats')}
              className="flex-1 bg-white border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 bg-gradient-to-r from-yellow-400 to-purple-500 text-white py-3 rounded-lg font-semibold hover:from-yellow-500 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {loading ? 'Создание...' : 'Создать чат'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
