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

    const users = await db.prepare('SELECT id, username, display_name, role FROM users ORDER BY display_name').all();

    return new Response(JSON.stringify({ users: users.results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Get users error:', error);
    return new Response(JSON.stringify({ error: 'Ошибка сервера' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
