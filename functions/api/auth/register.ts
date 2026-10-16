import { hashPassword, createToken } from '@/lib/auth';

export async function onRequestPost(context: any) {
  try {
    const { request, env } = context;
    const db = env.DB;
    const { username, display_name, password } = await request.json();

    if (!username || !display_name || !password) {
      return new Response(JSON.stringify({ error: 'Все поля обязательны' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({ error: 'Пароль должен быть не менее 6 символов' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const existingUser = await db.prepare('SELECT id FROM users WHERE username = ?').bind(username).first();

    if (existingUser) {
      return new Response(JSON.stringify({ error: 'Пользователь с таким именем уже существует' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const passwordHash = await hashPassword(password);

    const userCount = await db.prepare('SELECT COUNT(*) as count FROM users').first() as { count: number };
    const role = userCount.count === 0 ? 'admin' : 'student';

    const result = await db.prepare(
      'INSERT INTO users (username, display_name, password_hash, role) VALUES (?, ?, ?, ?)'
    ).bind(username, display_name, passwordHash, role).run();

    const userId = result.meta.last_row_id;

    const user = await db.prepare('SELECT id, username, display_name, role, is_banned FROM users WHERE id = ?').bind(userId).first() as any;

    const token = await createToken({
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      role: user.role,
      is_banned: user.is_banned,
    });

    // Создаём общий чат, если его ещё нет
    const generalChat = await db.prepare("SELECT id FROM chats WHERE type = 'general'").first() as any;

    if (!generalChat) {
      const chatResult = await db.prepare(
        "INSERT INTO chats (name, description, type, created_by) VALUES (?, ?, ?, ?)"
      ).bind('Общий чат', 'Общий чат для всех пользователей', 'general', userId).run();

      const chatId = chatResult.meta.last_row_id;
      await db.prepare('INSERT INTO chat_members (chat_id, user_id) VALUES (?, ?)').bind(chatId, userId).run();
    } else {
      const isMember = await db.prepare('SELECT 1 FROM chat_members WHERE chat_id = ? AND user_id = ?').bind(generalChat.id, userId).first();
      if (!isMember) {
        await db.prepare('INSERT INTO chat_members (chat_id, user_id) VALUES (?, ?)').bind(generalChat.id, userId).run();
      }
    }

    await db.prepare('INSERT INTO logs (user_id, action, details) VALUES (?, ?, ?)').bind(userId, 'register', `Новый пользователь: ${username}`).run();

    const response = new Response(JSON.stringify({
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        role: user.role,
      },
      token,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

    response.headers.set('Set-Cookie', `yochat_token=${token}; HttpOnly; Secure; SameSite=Lax; Max-Age=604800; Path=/`);

    return response;
  } catch (error) {
    console.error('Register error:', error);
    return new Response(JSON.stringify({ error: 'Ошибка сервера' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
