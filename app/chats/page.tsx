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

export default function ChatsPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      loadChats();
    } else {
      router.push('/login');
    }
  }, []);

  async function loadChats() {
    try {
      const response = await fetch('/api/chats');
      if (response.ok) {
        const data = await response.json();
        setChats(data.chats || []);
      }
    } catch (error) {
      console.error('Load chats error:', error);
    } finally {
      setLoading(false);
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
      </main>
    </div>
  );
}
