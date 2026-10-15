'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface Message {
  id: number;
  user_id: number;
  content: string;
  message_type: 'text' | 'image' | 'file';
  file_url?: string;
  file_name?: string;
  created_at: string;
  username: string;
  display_name: string;
  role: string;
}

function ChatContent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const params = useParams();
  const chatId = params.id as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      loadMessages();
    } else {
      router.push('/login');
    }
  }, [chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadMessages() {
    try {
      const response = await fetch(`/api/messages?chatId=${chatId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Load messages error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: parseInt(chatId),
          content: newMessage.trim(),
          message_type: 'text',
        }),
      });

      if (response.ok) {
        setNewMessage('');
        await loadMessages();
      }
    } catch (error) {
      console.error('Send message error:', error);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Размер файла не должен превышать 10 МБ');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        
        await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: parseInt(chatId),
            content: data.file_name,
            message_type: file.type.startsWith('image/') ? 'image' : 'file',
            file_url: data.file_url,
            file_name: data.file_name,
            file_size: data.file_size,
          }),
        });

        await loadMessages();
      }
    } catch (error) {
      console.error('Upload error:', error);
    }
  }

  function formatTime(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }

  if (!user || loading) {
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
    <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', flexDirection: 'column' }}>
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
        <h1 style={{ fontSize: '18px', fontWeight: 'bold' }}>Чат</h1>
      </header>

      <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {messages.map((message) => (
            <div
              key={message.id}
              style={{
                display: 'flex',
                justifyContent: message.user_id === user.id ? 'flex-end' : 'flex-start',
                marginBottom: '16px'
              }}
            >
              <div style={{
                maxWidth: '70%',
                padding: '12px 16px',
                background: message.user_id === user.id ? '#4a90e2' : 'white',
                color: message.user_id === user.id ? 'white' : '#333',
                borderRadius: '8px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }}>
                {message.user_id !== user.id && (
                  <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                    {message.display_name}
                  </div>
                )}
                
                {message.message_type === 'image' && message.file_url && (
                  <img
                    src={message.file_url}
                    alt={message.file_name}
                    style={{ maxWidth: '100%', borderRadius: '4px', marginBottom: '8px' }}
                  />
                )}
                
                {message.message_type === 'file' && message.file_url && (
                  <a
                    href={message.file_url}
                    download={message.file_name}
                    style={{
                      display: 'block',
                      padding: '8px',
                      background: message.user_id === user.id ? 'rgba(255,255,255,0.2)' : '#f0f0f0',
                      borderRadius: '4px',
                      marginBottom: '8px',
                      color: message.user_id === user.id ? 'white' : '#333',
                      textDecoration: 'none'
                    }}
                  >
                    📎 {message.file_name}
                  </a>
                )}
                
                <div style={{ wordBreak: 'break-word' }}>{message.content}</div>
                
                <div style={{
                  fontSize: '11px',
                  opacity: 0.7,
                  marginTop: '4px',
                  textAlign: 'right'
                }}>
                  {formatTime(message.created_at)}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div style={{
        background: 'white',
        padding: '16px 24px',
        borderTop: '1px solid #e0e0e0'
      }}>
        <form onSubmit={sendMessage} style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', gap: '12px' }}>
          <input
            type="file"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            id="file-input"
            accept="image/*,application/*"
          />
          
          <label
            htmlFor="file-input"
            style={{
              padding: '12px',
              background: '#f0f0f0',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            📎
          </label>
          
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Введите сообщение..."
            style={{
              flex: 1,
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
          
          <button
            type="submit"
            disabled={!newMessage.trim()}
            style={{
              padding: '12px 24px',
              background: '#4a90e2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
              opacity: newMessage.trim() ? 1 : 0.6
            }}
          >
            Отправить
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        Загрузка...
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
}
