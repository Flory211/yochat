'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  username: string;
  display_name: string;
  role: string;
  is_banned: number;
  created_at: string;
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      if (parsedUser.username === 'Leo') {
        setUser(parsedUser);
        loadUsers();
      } else {
        router.push('/chats');
      }
    } else {
      router.push('/login');
    }
  }, []);

  async function loadUsers() {
    try {
      const response = await fetch('/api/admin?type=users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Load users error:', error);
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
      });

      if (response.ok) {
        loadUsers();
      }
    } catch (error) {
      console.error('Ban error:', error);
    }
  }

  if (!user) return null;

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        Загрузка...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <header style={{
        background: 'white',
        padding: '16px 24px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
      }}>
        <button
          onClick={() => router.push('/chats')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '20px'
          }}
        >
          ←
        </button>
        <h1 style={{ fontSize: '20px', fontWeight: 'bold' }}>Панель администратора</h1>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Пользователи</h2>

        <div style={{
          background: 'white',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', color: '#666' }}>Пользователь</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', color: '#666' }}>Роль</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', color: '#666' }}>Статус</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', color: '#666' }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderTop: '1px solid #e0e0e0' }}>
                  <td style={{ padding: '12px' }}>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{u.display_name}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>@{u.username}</div>
                    </div>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '4px 8px',
                      background: u.role === 'admin' ? '#9b59b6' : '#3498db',
                      color: 'white',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      {u.role === 'admin' ? 'Админ' : 'Ученик'}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '4px 8px',
                      background: u.is_banned ? '#e74c3c' : '#2ecc71',
                      color: 'white',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      {u.is_banned ? 'Забанен' : 'Активен'}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    {u.username !== 'Leo' && (
                      <button
                        onClick={() => toggleBan(u.id, !!u.is_banned)}
                        style={{
                          padding: '8px 16px',
                          background: u.is_banned ? '#2ecc71' : '#e74c3c',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        {u.is_banned ? 'Разбанить' : 'Забанить'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
