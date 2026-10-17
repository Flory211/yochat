import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { ArrowLeft, Send } from 'lucide-react';

interface Message {
  id: number;
  content: string;
  message_type: string;
  user_id: number;
  username: string;
  display_name: string;
  role: string;
  created_at: string;
}

export default function Chat() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user) {
      navigate('/login');
      return;
    }
    setCurrentUser(user);
    loadMessages();
    const interval = setInterval(loadMessages, 2000);
    return () => clearInterval(interval);
  }, [id, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    try {
      const data = await api.messages.getByChat(Number(id));
      setMessages(data.messages);
    } catch (err) {
      console.error('Load messages error:', err);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    try {
      await api.messages.send({
        chat_id: Number(id),
        content: content.trim(),
        message_type: 'text',
      });
      setContent('');
      await loadMessages();
    } catch (err) {
      console.error('Send message error:', err);
    }
  };

  const handleDelete = async (messageId: number) => {
    try {
      await api.messages.delete(messageId);
      await loadMessages();
    } catch (err) {
      console.error('Delete message error:', err);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f7fafc', display: 'flex', flexDirection: 'column' }}>
      <header style={{ background: 'white', padding: '1rem 2rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          onClick={() => navigate('/chats')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#667eea' }}
        >
          <ArrowLeft size={24} />
        </button>
        <h1 style={{ color: '#1a202c', fontSize: '1.5rem' }}>Чат</h1>
      </header>

      <div style={{ flex: 1, overflow: 'auto', padding: '2rem', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        {messages.map((msg) => {
          const isOwn = msg.user_id === currentUser?.id;
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                justifyContent: isOwn ? 'flex-end' : 'flex-start',
                marginBottom: '1rem',
              }}
            >
              <div
                style={{
                  background: isOwn ? '#667eea' : 'white',
                  color: isOwn ? 'white' : '#1a202c',
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  maxWidth: '70%',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.25rem', opacity: 0.8 }}>
                  {msg.display_name}
                </div>
                <div style={{ wordBreak: 'break-word' }}>{msg.content}</div>
                <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', opacity: 0.6, textAlign: 'right' }}>
                  {new Date(msg.created_at).toLocaleTimeString()}
                </div>
                {isOwn && (
                  <button
                    onClick={() => handleDelete(msg.id)}
                    style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '0.75rem', opacity: 0.6 }}
                  >
                    Удалить
                  </button>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={handleSend}
        style={{ background: 'white', padding: '1rem 2rem', boxShadow: '0 -2px 4px rgba(0,0,0,0.1)', display: 'flex', gap: '1rem', maxWidth: '800px', margin: '0 auto', width: '100%' }}
      >
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Введите сообщение..."
          style={{ flex: 1, padding: '0.75rem', border: '2px solid #e2e8f0', borderRadius: '6px', fontSize: '1rem' }}
        />
        <button
          type="submit"
          style={{ padding: '0.75rem 1.5rem', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
}
