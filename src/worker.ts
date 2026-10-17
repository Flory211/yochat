import { hashPassword, verifyPassword, createToken, verifyToken } from './auth-worker';

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = any>(): Promise<T | undefined>;
  all<T = any>(): Promise<{ results: T[] }>;
  run(): Promise<{ meta: { last_row_id: number } }>;
}

interface Env {
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Proxy /api requests to yochat-worker
    if (path.startsWith('/api/')) {
      const workerUrl = `https://yochat-worker.leogushinets.workers.dev${path}`;
      const response = await fetch(workerUrl, {
        method: request.method,
        headers: {
          ...Object.fromEntries(request.headers),
          'Host': 'yochat-worker.leogushinets.workers.dev',
        },
        body: request.body,
      });
      return new Response(response.body, {
        status: response.status,
        headers: {
          ...Object.fromEntries(response.headers),
          ...corsHeaders,
        },
      });
    }

    try {
      // Auth routes
      if (path === '/api/auth/login' && request.method === 'POST') {
        return await handleLogin(request, env, corsHeaders);
      }
      if (path === '/api/auth/register' && request.method === 'POST') {
        return await handleRegister(request, env, corsHeaders);
      }

      // Users routes
      if (path === '/api/users' && request.method === 'GET') {
        return await handleGetUsers(request, env, corsHeaders);
      }

      // Chats routes
      if (path === '/api/chats' && request.method === 'GET') {
        return await handleGetChats(request, env, corsHeaders);
      }
      if (path === '/api/chats' && request.method === 'POST') {
        return await handleCreateChat(request, env, corsHeaders);
      }

      // Messages routes
      if (path === '/api/messages' && request.method === 'GET') {
        return await handleGetMessages(request, env, corsHeaders);
      }
      if (path === '/api/messages' && request.method === 'POST') {
        return await handleSendMessage(request, env, corsHeaders);
      }
      if (path.startsWith('/api/messages/') && request.method === 'DELETE') {
        return await handleDeleteMessage(request, env, corsHeaders);
      }

      // Admin routes
      if (path === '/api/admin' && request.method === 'GET') {
        return await handleAdminGet(request, env, corsHeaders);
      }
      if (path === '/api/admin' && request.method === 'POST') {
        return await handleAdminAction(request, env, corsHeaders);
      }

      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};

async function getUser(request: Request): Promise<any> {
  const authHeader = request.headers.get('authorization');
  let token: string | undefined;
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }
  if (!token) return null;
  return await verifyToken(token);
}

async function handleLogin(request: Request, env: Env, corsHeaders: any): Promise<Response> {
  const { username, password } = await request.json();
  if (!username || !password) {
    return new Response(JSON.stringify({ error: 'Все поля обязательны' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const user = await env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(username).first() as any;
  if (!user) {
    return new Response(JSON.stringify({ error: 'Неверное имя пользователя или пароль' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  if (user.is_banned) {
    return new Response(JSON.stringify({ error: 'Ваш аккаунт заблокирован' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const isValid = await verifyPassword(password, user.password_hash);
  if (!isValid) {
    return new Response(JSON.stringify({ error: 'Неверное имя пользователя или пароль' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const token = await createToken({ id: user.id, username: user.username, display_name: user.display_name, role: user.role, is_banned: user.is_banned });
  await env.DB.prepare('INSERT INTO logs (user_id, action, details) VALUES (?, ?, ?)').bind(user.id, 'login', 'Вход в систему').run();

  return new Response(JSON.stringify({
    user: { id: user.id, username: user.username, display_name: user.display_name, role: user.role },
    token,
  }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

async function handleRegister(request: Request, env: Env, corsHeaders: any): Promise<Response> {
  const { username, display_name, password } = await request.json();
  if (!username || !display_name || !password) {
    return new Response(JSON.stringify({ error: 'Все поля обязательны' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  if (password.length < 6) {
    return new Response(JSON.stringify({ error: 'Пароль должен быть не менее 6 символов' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const existing = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first();
  if (existing) {
    return new Response(JSON.stringify({ error: 'Пользователь с таким именем уже существует' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const passwordHash = await hashPassword(password);
  const userCount = await env.DB.prepare('SELECT COUNT(*) as count FROM users').first() as { count: number };
  const role = userCount.count === 0 ? 'admin' : 'student';

  const result = await env.DB.prepare('INSERT INTO users (username, display_name, password_hash, role) VALUES (?, ?, ?, ?)').bind(username, display_name, passwordHash, role).run();
  const userId = result.meta.last_row_id;

  const user = await env.DB.prepare('SELECT id, username, display_name, role, is_banned FROM users WHERE id = ?').bind(userId).first() as any;
  const token = await createToken({ id: user.id, username: user.username, display_name: user.display_name, role: user.role, is_banned: user.is_banned });

  const generalChat = await env.DB.prepare("SELECT id FROM chats WHERE type = 'general'").first() as any;
  if (!generalChat) {
    const chatResult = await env.DB.prepare("INSERT INTO chats (name, description, type, created_by) VALUES (?, ?, ?, ?)").bind('Общий чат', 'Общий чат для всех пользователей', 'general', userId).run();
    await env.DB.prepare('INSERT INTO chat_members (chat_id, user_id) VALUES (?, ?)').bind(chatResult.meta.last_row_id, userId).run();
  } else {
    const isMember = await env.DB.prepare('SELECT 1 FROM chat_members WHERE chat_id = ? AND user_id = ?').bind(generalChat.id, userId).first();
    if (!isMember) {
      await env.DB.prepare('INSERT INTO chat_members (chat_id, user_id) VALUES (?, ?)').bind(generalChat.id, userId).run();
    }
  }

  await env.DB.prepare('INSERT INTO logs (user_id, action, details) VALUES (?, ?, ?)').bind(userId, 'register', `Новый пользователь: ${username}`).run();

  return new Response(JSON.stringify({
    user: { id: user.id, username: user.username, display_name: user.display_name, role: user.role },
    token,
  }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

async function handleGetUsers(request: Request, env: Env, corsHeaders: any): Promise<Response> {
  const user = await getUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Необходима авторизация' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const users = await env.DB.prepare('SELECT id, username, display_name, role FROM users ORDER BY display_name').all();
  return new Response(JSON.stringify({ users: users.results }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

async function handleGetChats(request: Request, env: Env, corsHeaders: any): Promise<Response> {
  const user = await getUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Необходима авторизация' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const chats = await env.DB.prepare(`SELECT c.*, CASE WHEN c.type = 'general' THEN 'Общий чат' ELSE 'Личный чат' END as type_name FROM chats c JOIN chat_members cm ON c.id = cm.chat_id WHERE cm.user_id = ? ORDER BY c.created_at DESC`).bind(user.id).all();
  return new Response(JSON.stringify({ chats: chats.results }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

async function handleCreateChat(request: Request, env: Env, corsHeaders: any): Promise<Response> {
  const user = await getUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Необходима авторизация' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const { name, description, type, member_ids } = await request.json();

  if (type === 'private' && member_ids?.length === 1) {
    const otherUserId = member_ids[0];
    const existing = await env.DB.prepare(`SELECT c.id FROM chats c JOIN chat_members cm1 ON c.id = cm1.chat_id JOIN chat_members cm2 ON c.id = cm2.chat_id WHERE c.type = 'private' AND cm1.user_id = ? AND cm2.user_id = ?`).bind(user.id, otherUserId).first() as any;
    if (existing) {
      return new Response(JSON.stringify({ success: true, chat_id: existing.id, exists: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const result = await env.DB.prepare('INSERT INTO chats (name, description, type, created_by) VALUES (?, ?, ?, ?)').bind('Личный чат', '', 'private', user.id).run();
    const chatId = result.meta.last_row_id;
    await env.DB.prepare('INSERT INTO chat_members (chat_id, user_id) VALUES (?, ?)').bind(chatId, user.id).run();
    await env.DB.prepare('INSERT INTO chat_members (chat_id, user_id) VALUES (?, ?)').bind(chatId, otherUserId).run();
    return new Response(JSON.stringify({ success: true, chat_id: chatId }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  if (!name) {
    return new Response(JSON.stringify({ error: 'Название чата обязательно' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  const result = await env.DB.prepare('INSERT INTO chats (name, description, type, created_by) VALUES (?, ?, ?, ?)').bind(name, description || '', type || 'general', user.id).run();
  const chatId = result.meta.last_row_id;
  await env.DB.prepare('INSERT INTO chat_members (chat_id, user_id) VALUES (?, ?)').bind(chatId, user.id).run();
  if (member_ids?.length) {
    for (const m of member_ids) {
      await env.DB.prepare('INSERT INTO chat_members (chat_id, user_id) VALUES (?, ?)').bind(chatId, m).run();
    }
  }
  return new Response(JSON.stringify({ success: true, chat_id: chatId }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

async function handleGetMessages(request: Request, env: Env, corsHeaders: any): Promise<Response> {
  const user = await getUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Необходима авторизация' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const url = new URL(request.url);
  const chatId = url.searchParams.get('chatId');
  if (!chatId) {
    return new Response(JSON.stringify({ error: 'ID чата обязателен' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const isMember = await env.DB.prepare('SELECT 1 FROM chat_members WHERE chat_id = ? AND user_id = ?').bind(chatId, user.id).first();
  if (!isMember) {
    return new Response(JSON.stringify({ error: 'Вы не являетесь участником этого чата' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const messages = await env.DB.prepare('SELECT m.*, u.username, u.display_name, u.role FROM messages m JOIN users u ON m.user_id = u.id WHERE m.chat_id = ? ORDER BY m.created_at ASC LIMIT 100').bind(chatId).all();
  return new Response(JSON.stringify({ messages: messages.results }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

async function handleSendMessage(request: Request, env: Env, corsHeaders: any): Promise<Response> {
  const user = await getUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Необходима авторизация' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const { chat_id, content, message_type = 'text', file_url, file_name, file_size } = await request.json();
  if (!chat_id || !content) {
    return new Response(JSON.stringify({ error: 'ID чата и содержимое обязательны' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const isMember = await env.DB.prepare('SELECT 1 FROM chat_members WHERE chat_id = ? AND user_id = ?').bind(chat_id, user.id).first();
  if (!isMember) {
    return new Response(JSON.stringify({ error: 'Вы не являетесь участником этого чата' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const result = await env.DB.prepare('INSERT INTO messages (chat_id, user_id, content, message_type, file_url, file_name, file_size) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(chat_id, user.id, content, message_type, file_url || null, file_name || null, file_size || null).run();
  const message = await env.DB.prepare('SELECT m.*, u.username, u.display_name, u.role FROM messages m JOIN users u ON m.user_id = u.id WHERE m.id = ?').bind(result.meta.last_row_id).first();
  return new Response(JSON.stringify({ success: true, message }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

async function handleDeleteMessage(request: Request, env: Env, corsHeaders: any): Promise<Response> {
  const user = await getUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Необходима авторизация' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const url = new URL(request.url);
  const messageId = url.pathname.split('/').pop();
  if (!messageId) {
    return new Response(JSON.stringify({ error: 'ID сообщения обязателен' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const message = await env.DB.prepare('SELECT * FROM messages WHERE id = ?').bind(messageId).first() as any;
  if (!message) {
    return new Response(JSON.stringify({ error: 'Сообщение не найдено' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  if (message.user_id !== user.id && user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Вы можете удалять только свои сообщения' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  await env.DB.prepare("UPDATE messages SET is_deleted = 1, content = 'Сообщение удалено' WHERE id = ?").bind(messageId).run();
  return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

async function handleAdminGet(request: Request, env: Env, corsHeaders: any): Promise<Response> {
  const user = await getUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Необходима авторизация' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  if (user.username !== 'Leo') {
    return new Response(JSON.stringify({ error: 'Недостаточно прав' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get('type');
  if (type === 'users') {
    const r = await env.DB.prepare('SELECT id, username, display_name, role, is_banned, created_at FROM users ORDER BY created_at DESC').all();
    return new Response(JSON.stringify({ users: r.results }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  if (type === 'chats') {
    const r = await env.DB.prepare('SELECT * FROM chats ORDER BY created_at DESC').all();
    return new Response(JSON.stringify({ chats: r.results }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  if (type === 'logs') {
    const r = await env.DB.prepare('SELECT * FROM logs ORDER BY created_at DESC LIMIT 100').all();
    return new Response(JSON.stringify({ logs: r.results }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  return new Response(JSON.stringify({ error: 'Неверный тип данных' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

async function handleAdminAction(request: Request, env: Env, corsHeaders: any): Promise<Response> {
  const user = await getUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Необходима авторизация' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  if (user.username !== 'Leo') {
    return new Response(JSON.stringify({ error: 'Недостаточно прав' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const { action, user_id, is_banned } = await request.json();
  if (action === 'ban_user') {
    await env.DB.prepare('UPDATE users SET is_banned = ? WHERE id = ?').bind(is_banned ? 1 : 0, user_id).run();
    await env.DB.prepare('INSERT INTO logs (user_id, action, details) VALUES (?, ?, ?)').bind(user.id, 'ban_user', `Пользователь ${is_banned ? 'забанен' : 'разбанен'} ID: ${user_id}`).run();
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  return new Response(JSON.stringify({ error: 'Неверное действие' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
