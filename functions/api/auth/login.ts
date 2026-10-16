import { hashPassword, verifyPassword, createToken } from '@/lib/auth';

export async function onRequestPost(context: any) {
  try {
    const { request, env } = context;
    const db = env.DB;
    const { username, password } = await request.json();

    if (!username || !password) {
      return new Response(JSON.stringify({ error: 'Все поля обязательны' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const user = await db.prepare('SELECT * FROM users WHERE username = ?').bind(username).first() as any;

    if (!user) {
      return new Response(JSON.stringify({ error: 'Неверное имя пользователя или пароль' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (user.is_banned) {
      return new Response(JSON.stringify({ error: 'Ваш аккаунт заблокирован' }), { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const isValidPassword = await verifyPassword(password, user.password_hash);

    if (!isValidPassword) {
      return new Response(JSON.stringify({ error: 'Неверное имя пользователя или пароль' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = await createToken({
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      role: user.role,
      is_banned: user.is_banned,
    });

    await db.prepare('INSERT INTO logs (user_id, action, details) VALUES (?, ?, ?)').bind(user.id, 'login', 'Вход в систему').run();

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
    console.error('Login error:', error);
    return new Response(JSON.stringify({ error: 'Ошибка сервера' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
