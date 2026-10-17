import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { ArrowLeft, Ban, Check } from 'lucide-react';

interface User {
  id: number;
  username: string;
  display_name: string;
  role: string;
  is_banned: number;
  created_at: string;
}

export default function Admin() {
  const [users, setUsers] = useState<User[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user || user.username !== 'Leo') {
      navigate('/chats');
      return;
    }
    loadUsers();
  }, [navigate]);

  const loadUsers = async () => {
    try {
      const data = await api.admin.getUsers();
      setUsers(data.users);
    } catch (err) {
      console.error('Load users error:', err);
    }
  };

  const handleBan = async (userId: number, isBanned: number) => {
    try {
      await api.admin.banUser(userId, !isBanned);
      await loadUsers();
    } catch (err) {
      console.error('Ban user error:', err);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f7fafc' }}>
      <header style={{ background: 'white', padding: '1rem 2rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          onClick={() => navigate('/chats')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#667eea' }}
        >
          <ArrowLeft size={24} />
        </button>
        <h1 style={{ color: '#1a202c', fontSize: '1.5rem' }}>Админ-панель</h1>
      </header>

      <div style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 2rem' }}>
        <h2 style={{ color: '#1a202c', marginBottom: '1rem' }}>Пользователи</h2>
        <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f7fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#4a5568' }}>Имя</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#4a5568' }}>Username</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#4a5568' }}>Роль</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#4a5568' }}>Статус</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#4a5568' }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '1rem', color: '#1a202c' }}>{user.display_name}</td>
                  <td style={{ padding: '1rem', color: '#718096' }}>@{user.username}</td>
                  <td style={{ padding: '1rem' }}>
                    <span
                      style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        background: user.role === 'admin' ? '#9f7aea' : user.role === 'teacher' ? '#4299e1' : '#a0aec0',
                        color: 'white',
                      }}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span
                      style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        fontSize: '0.875rem',
                        background: user.is_banned ? '#fed7d7' : '#c6f6d5',
                        color: user.is_banned ? '#c53030' : '#276749',
                      }}
                    >
                      {user.is_banned ? 'Забанен' : 'Активен'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {user.username !== 'Leo' && (
                      <button
                        onClick={() => handleBan(user.id, user.is_banned)}
                        style={{
                          padding: '0.5rem',
                          background: user.is_banned ? '#48bb78' : '#f56565',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        {user.is_banned ? <Check size={16} /> : <Ban size={16} />}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
