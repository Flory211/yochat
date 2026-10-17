import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { MessageCircle, Users, LogOut } from 'lucide-react';

interface Chat {
  id: number;
  name: string;
  description: string;
  type: string;
  type_name: string;
}

interface User {
  id: number;
  username: string;
  display_name: string;
  role: string;
}

export default function Chats() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user) {
      navigate('/login');
      return;
    }
    setCurrentUser(user);
    loadData();
  }, [navigate]);

  const loadData = async () => {
    try {
      const [chatsData, usersData] = await Promise.all([
        api.chats.getAll(),
        api.users.getAll(),
      ]);
      setChats(chatsData.chats);
      setUsers(usersData.users);
    } catch (err) {
      console.error('Load error:', err);
    }
  };

  const handleCreateChat = async (otherUserId: number) => {
    try {
      const result = await api.chats.create({
        name: 'Личный чат',
        type: 'private',
        member_ids: [otherUserId],
      });
      navigate(`/chat/${result.chat_id}`);
    } catch (err) {
      console.error('Create chat error:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f7fafc' }}>
      <header style={{ background: 'white', padding: '1rem 2rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ color: '#1a202c', fontSize: '1.5rem' }}>ЁЧат</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: '#4a5568' }}>Привет, {currentUser?.display_name}!</span>
          {currentUser?.username === 'Leo' && (
            <button
              onClick={() => navigate('/admin')}
              style={{ padding: '0.5rem 1rem', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              Админ-панель
            </button>
          )}
          <button
            onClick={handleLogout}
            style={{ padding: '0.5rem 1rem', background: '#e53e3e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <div style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div>
          <h2 style={{ color: '#1a202c', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MessageCircle /> Мои чаты
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {chats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => navigate(`/chat/${chat.id}`)}
                style={{ background: 'white', padding: '1rem', borderRadius: '8px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', transition: 'transform 0.2s' }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                <div style={{ fontWeight: '600', color: '#1a202c' }}>{chat.name}</div>
                <div style={{ fontSize: '0.875rem', color: '#718096' }}>{chat.type_name}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 style={{ color: '#1a202c', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users /> Пользователи
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {users.map((user) => (
              <div
                key={user.id}
                style={{ background: 'white', padding: '1rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div>
                  <div style={{ fontWeight: '600', color: '#1a202c' }}>{user.display_name}</div>
                  <div style={{ fontSize: '0.875rem', color: '#718096' }}>@{user.username}</div>
                </div>
                {user.id !== currentUser?.id && (
                  <button
                    onClick={() => handleCreateChat(user.id)}
                    style={{ padding: '0.5rem 1rem', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    Написать
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
