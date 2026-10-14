'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Send, Paperclip, Edit2, Trash2, ArrowLeft } from 'lucide-react';

interface Message {
  id: number;
  chat_id: number;
  user_id: number;
  content: string;
  message_type: 'text' | 'image' | 'file';
  file_url?: string;
  file_name?: string;
  file_size?: number;
  is_edited: number;
  is_deleted: number;
  created_at: string;
  username: string;
  display_name: string;
  role: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const chatId = params.id as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadMessages();
  }, [user, chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadMessages() {
    try {
      const response = await fetch(`/api/messages?chatId=${chatId}`, {
        credentials: 'include',
      });
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
        credentials: 'include',
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
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        
        const msgResponse = await fetch('/api/messages', {
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
          credentials: 'include',
        });

        if (msgResponse.ok) {
          await loadMessages();
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function handleEdit(message: Message) {
    const newContent = prompt('Редактировать сообщение:', message.content);
    if (!newContent || newContent === message.content) return;

    try {
      const response = await fetch(`/api/messages/${message.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent }),
        credentials: 'include',
      });

      if (response.ok) {
        await loadMessages();
      }
    } catch (error) {
      console.error('Edit message error:', error);
    }
  }

  async function handleDelete(messageId: number) {
    if (!confirm('Удалить сообщение?')) return;

    try {
      const response = await fetch(`/api/messages/${messageId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        await loadMessages();
      }
    } catch (error) {
      console.error('Delete message error:', error);
    }
  }

  function formatTime(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }

  function getRoleBadge(role: string) {
    const badges = {
      admin: { text: 'Админ', color: 'bg-red-500' },
      teacher: { text: 'Учитель', color: 'bg-purple-500' },
      student: { text: 'Ученик', color: 'bg-blue-500' },
    };
    const badge = badges[role as keyof typeof badges];
    return (
      <span className={`${badge.color} text-white text-xs px-2 py-0.5 rounded-full`}>
        {badge.text}
      </span>
    );
  }

  if (!user || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-white to-purple-500 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-white to-purple-500 flex flex-col">
      <header className="bg-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.push('/chats')}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Чат</h1>
            <p className="text-sm text-gray-800">Групповой чат</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.user_id === user.id ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                  message.user_id === user.id
                    ? 'bg-gradient-to-r from-yellow-400 to-purple-500 text-white'
                    : 'bg-white shadow-lg text-gray-900'
                }`}
              >
                {message.is_deleted ? (
                  <p className="italic text-gray-700">Сообщение удалено</p>
                ) : (
                  <>
                    {message.user_id !== user.id && (
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-gray-900">{message.display_name}</span>
                        {getRoleBadge(message.role)}
                      </div>
                    )}
                    
                    {message.message_type === 'image' && message.file_url && (
                      <img
                        src={message.file_url}
                        alt={message.file_name}
                        className="rounded-lg max-w-full mb-2"
                      />
                    )}
                    
                    {message.message_type === 'file' && message.file_url && (
                      <a
                        href={message.file_url}
                        download={message.file_name}
                        className={`flex items-center gap-2 rounded-lg px-3 py-2 mb-2 transition ${
                          message.user_id === user.id
                            ? 'bg-white/20 hover:bg-white/30'
                            : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                      >
                        <Paperclip className="w-4 h-4" />
                        <span className="text-sm font-medium">{message.file_name}</span>
                      </a>
                    )}
                    
                    <p className={`break-words ${message.user_id === user.id ? 'text-white' : 'text-gray-900'}`}>
                      {message.content}
                    </p>
                    
                    <div className={`flex items-center justify-between mt-2 text-xs ${
                      message.user_id === user.id ? 'opacity-90' : 'opacity-75'
                    }`}>
                      <span>{formatTime(message.created_at)}</span>
                      {message.is_edited && <span>(изменено)</span>}
                    </div>

                    {message.user_id === user.id && !message.is_deleted && (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleEdit(message)}
                          className="p-1 hover:bg-white/20 rounded transition"
                          title="Редактировать"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(message.id)}
                          className="p-1 hover:bg-white/20 rounded transition"
                          title="Удалить"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="bg-white border-t">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <form onSubmit={sendMessage} className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept="image/*,application/*"
            />
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-3 text-gray-800 hover:bg-gray-100 rounded-lg transition"
              title="Прикрепить файл"
            >
              <Paperclip className="w-6 h-6" />
            </button>
            
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Введите сообщение..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
            />
            
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="p-3 bg-gradient-to-r from-yellow-400 to-purple-500 text-white rounded-lg hover:from-yellow-500 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-6 h-6" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
