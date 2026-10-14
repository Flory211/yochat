'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Users, MessageCircle, FileText, Trash2 } from 'lucide-react';

interface User {
  id: number;
  username: string;
  display_name: string;
  role: string;
  is_banned: number;
  created_at: string;
}

interface Chat {
  id: number;
  name: string;
  description: string;
  member_count: number;
  created_by_name: string;
  created_at: string;
}

interface Log {
  id: number;
  user_id: number;
  action: string;
  details: string;
  username: string;
  display_name: string;
  created_at: string;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'chats' | 'logs'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user || user.username !== 'Leo') {
      router.push('/chats');
      return;
    }
    loadData();
  }, [user, activeTab]);

  async function loadData() {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin?type=${activeTab}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        if (activeTab === 'users') setUsers(data.users);
        if (activeTab === 'chats') setChats(data.chats);
        if (activeTab === 'logs') setLogs(data.logs);
      }
    } catch (error) {
      console.error('Load data error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleBan(userId: number, isBanned: boolean) {
    try {
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ban_user',
          user_id: userId,
          is_banned: !isBanned,
        }),
        credentials: 'include',
      });

      if (response.ok) {
        loadData();
      }
    } catch (error) {
      console.error('Ban error:', error);
    }
  }

  async function deleteUser(userId: number, username: string) {
    if (!confirm(`Вы уверены, что хотите удалить пользователя @${username}? Это действие нельзя отменить.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        loadData();
      } else {
        const data = await response.json();
        alert(data.error || 'Ошибка при удалении пользователя');
      }
    } catch (error) {
      console.error('Delete user error:', error);
      alert('Ошибка при удалении пользователя');
    }
  }

  if (!user || user.username !== 'Leo') return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-white to-purple-500">
      <header className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.push('/chats')}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-6 h-6 text-gray-800" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Панель администратора</h1>
            <p className="text-sm text-gray-800">Управление системой Чат</p>
          </div>
        </div>
      </header>

      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-6 py-3 font-semibold transition ${
                activeTab === 'users'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              <Users className="w-5 h-5 inline mr-2" />
              Пользователи
            </button>
            <button
              onClick={() => setActiveTab('chats')}
              className={`px-6 py-3 font-semibold transition ${
                activeTab === 'chats'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              <MessageCircle className="w-5 h-5 inline mr-2" />
              Чаты
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-6 py-3 font-semibold transition ${
                activeTab === 'logs'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              <FileText className="w-5 h-5 inline mr-2" />
              Логи
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500 mx-auto"></div>
          </div>
        ) : (
          <>
            {activeTab === 'users' && (
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Пользователь</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Роль</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Статус</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                              {u.display_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800">{u.display_name}</p>
                              <p className="text-sm text-gray-800">@{u.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            u.role === 'admin' 
                              ? 'bg-purple-100 text-purple-700' 
                              : u.role === 'teacher'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {u.role === 'admin' ? 'Админ' : u.role === 'teacher' ? 'Учитель' : 'Ученик'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {u.is_banned ? (
                            <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-sm">Забанен</span>
                          ) : (
                            <span className="px-3 py-1 bg-green-100 text-green-600 rounded-full text-sm">Активен</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => toggleBan(u.id, !!u.is_banned)}
                              className={`px-4 py-2 rounded-lg font-semibold transition ${
                                u.is_banned
                                  ? 'bg-green-500 text-white hover:bg-green-600'
                                  : 'bg-red-500 text-white hover:bg-red-600'
                              }`}
                            >
                              {u.is_banned ? 'Разбанить' : 'Забанить'}
                            </button>
                            {u.username !== 'Leo' && (
                              <button
                                onClick={() => deleteUser(u.id, u.username)}
                                className="px-4 py-2 bg-gray-800 text-white rounded-lg font-semibold hover:bg-gray-900 transition flex items-center gap-2"
                                title="Удалить пользователя"
                              >
                                <Trash2 className="w-4 h-4" />
                                Удалить
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'chats' && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {chats.map((chat) => (
                  <div key={chat.id} className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-purple-500 rounded-full flex items-center justify-center">
                        <MessageCircle className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-sm text-gray-800">{chat.member_count} участников</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">{chat.name}</h3>
                    <p className="text-gray-800 text-sm mb-4">{chat.description || 'Без описания'}</p>
                    <p className="text-xs text-gray-700">Создан: {new Date(chat.created_at).toLocaleDateString('ru-RU')}</p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'logs' && (
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Пользователь</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Действие</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Детали</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Время</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {logs.map((log) => (
                      <tr key={log.id}>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-gray-800">{log.display_name || 'Система'}</p>
                          <p className="text-sm text-gray-800">@{log.username || '-'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-purple-100 text-purple-600 rounded-full text-sm">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-800">{log.details}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {new Date(log.created_at).toLocaleString('ru-RU')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
