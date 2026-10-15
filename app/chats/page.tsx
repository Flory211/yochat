'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Chat {
  id: number;
  name: string;
  description: string;
  type: 'general' | 'private';
  last_message?: string;
}

interface User {
  id: number;
  username: string;
  display_name: string;
  role: string;
}

export default function ChatsPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      loadData();
    } else {
      router.push('/login');
    }
  }, []);

  async function loadData() {
    try {
      const [chatsRes, usersRes] = await Promise.all([
        fetch('/api/chats'),
        fetch('/api/users')
      ]);

      if (chatsRes.ok) {
        const chatsData = await chatsRes.json();
        setChats(chatsData.chats || []);
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users || []);
      }
    } catch (error) {
      console.error('Load data error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function startPrivateChat(userId: number) {
    try {
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'private',
          member_ids: [userId]
        }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/chats/${data.chat_id}`);
      }
    } catch (error) {
      console.error('Start chat error:', error);
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('user');
    router.push('/login');
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
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{ fontSize: '20px', fontWeight: 'bold' }}>ЁЧат</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span>{user.display_name}</span>
          <button
            onClick={handleLogout}
            style={{
              padding: '8px 16px',
              background: '#e74c3c',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Выйти
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Мои чаты</h2>

        {chats.length === 0 ? (
          <div style={{
            background: 'white',
            padding: '40px',
            borderRadius: '8px',
            textAlign: 'center',
            color: '#666'
          }}>
            Пока нет чатов
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            {chats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => router.push(`/chats/${chat.id}`)}
                style={{
                  background: 'white',
                  padding: '16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>
                      {chat.name}
                    </h3>
                    <p style={{ fontSize: '14px', color: '#666' }}>
                      {chat.description || 'Нет описания'}
                    </p>
                  </div>
                  <span style={{
                    padding: '4px 8px',
                    background: chat.type === 'general' ? '#3498db' : '#9b59b6',
                    color: 'white',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}>
                    {chat.type === 'general' ? 'Общий' : 'Личный'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Пользователи</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {users.filter(u => u.id !== user.id).map((u) => (
            <div
              key={u.id}
              style={{
                background: 'white',
                padding: '16px',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}
            >
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{u.display_name}</div>
                <div style={{ fontSize: '14px', color: '#666' }}>@{u.username}</div>
              </div>
              <button
                onClick={() => startPrivateChat(u.id)}
                style={{
                  padding: '8px 16px',
                  background: '#4a90e2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Написать
              </button>
            </div>
          ))}
        </div>

        {user.username === 'Leo' && (
          <div style={{ marginTop: '24px' }}>
            <button
              onClick={() => router.push('/admin')}
              style={{
                width: '100%',
                padding: '16px',
                background: 'white',
                border: '2px solid #9b59b6',
                color: '#9b59b6',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#9b59b6';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.color = '#9b59b6';
              }}
            >
              Панель администратора
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
