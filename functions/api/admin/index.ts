export async function onRequestGet(context: any) {
  try {
    const { request, env } = context;
    const db = env.DB;
    
    const cookieHeader = request.headers.get('cookie');
    const authHeader = request.headers.get('authorization');
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (cookieHeader) {
      const match = cookieHeader.match(/yochat_token=([^;]+)/);
      if (match) token = match[1];
    }

    if (!token) {
      return new Response(JSON.stringify({ error: 'Необходима авторизация' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { verifyToken } = await import('@/lib/auth');
    const user = await verifyToken(token);

    if (!user) {
      return new Response(JSON.stringify({ error: 'Необходима авторизация' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (user.username !== 'Leo') {
      return new Response(JSON.stringify({ error: 'Недостаточно прав' }), { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(request.url);
    const type = url.searchParams.get('type');

    if (type === 'users') {
      const users = await db.prepare('SELECT id, username, display_name, role, is_banned, created_at FROM users ORDER BY created_at DESC').all();
      return new Response(JSON.stringify({ users: users.results }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (type === 'chats') {
      const chats = await db.prepare('SELECT * FROM chats ORDER BY created_at DESC').all();
      return new Response(JSON.stringify({ chats: chats.results }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (type === 'logs') {
      const logs = await db.prepare('SELECT * FROM logs ORDER BY created_at DESC LIMIT 100').all();
      return new Response(JSON.stringify({ logs: logs.results }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Неверный тип данных' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Admin get error:', error);
    return new Response(JSON.stringify({ error: 'Ошибка сервера' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequestPost(context: any) {
  try {
    const { request, env } = context;
    const db = env.DB;
    
    const cookieHeader = request.headers.get('cookie');
    const authHeader = request.headers.get('authorization');
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (cookieHeader) {
      const match = cookieHeader.match(/yochat_token=([^;]+)/);
      if (match) token = match[1];
    }

    if (!token) {
      return new Response(JSON.stringify({ error: 'Необходима авторизация' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { verifyToken } = await import('@/lib/auth');
    const user = await verifyToken(token);

    if (!user) {
      return new Response(JSON.stringify({ error: 'Необходима авторизация' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (user.username !== 'Leo') {
      return new Response(JSON.stringify({ error: 'Недостаточно прав' }), { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { action, user_id, is_banned } = await request.json();

    if (action === 'ban_user') {
      await db.prepare('UPDATE users SET is_banned = ? WHERE id = ?').bind(is_banned ? 1 : 0, user_id).run();
      await db.prepare('INSERT INTO logs (user_id, action, details) VALUES (?, ?, ?)').bind(user.id, 'ban_user', `Пользователь ${is_banned ? 'забанен' : 'разбанен'} ID: ${user_id}`).run();
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Неверное действие' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Admin action error:', error);
    return new Response(JSON.stringify({ error: 'Ошибка сервера' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
