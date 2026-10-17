const API_BASE = '/api';

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Ошибка сервера' }));
    throw new Error(error.error || 'Ошибка сервера');
  }

  return response.json();
}

export const api = {
  auth: {
    login: (username: string, password: string) =>
      apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
    register: (username: string, display_name: string, password: string) =>
      apiRequest('/auth/register', { method: 'POST', body: JSON.stringify({ username, display_name, password }) }),
  },
  users: {
    getAll: () => apiRequest('/users'),
  },
  chats: {
    getAll: () => apiRequest('/chats'),
    create: (data: { name: string; description?: string; type: string; member_ids?: number[] }) =>
      apiRequest('/chats', { method: 'POST', body: JSON.stringify(data) }),
  },
  messages: {
    getByChat: (chatId: number) => apiRequest(`/messages?chatId=${chatId}`),
    send: (data: { chat_id: number; content: string; message_type?: string; file_url?: string; file_name?: string; file_size?: number }) =>
      apiRequest('/messages', { method: 'POST', body: JSON.stringify(data) }),
    delete: (messageId: number) => apiRequest(`/messages/${messageId}`, { method: 'DELETE' }),
  },
  admin: {
    getUsers: () => apiRequest('/admin?type=users'),
    getChats: () => apiRequest('/admin?type=chats'),
    getLogs: () => apiRequest('/admin?type=logs'),
    banUser: (user_id: number, is_banned: boolean) =>
      apiRequest('/admin', { method: 'POST', body: JSON.stringify({ action: 'ban_user', user_id, is_banned }) }),
  },
};
