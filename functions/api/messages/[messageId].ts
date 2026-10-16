export async function onRequestDelete(context: any) {
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

    const url = new URL(request.url);
    const messageId = url.searchParams.get('messageId');

    if (!messageId) {
      return new Response(JSON.stringify({ error: 'ID сообщения обязателен' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const message = await db.prepare('SELECT * FROM messages WHERE id = ?').bind(messageId).first() as any;

    if (!message) {
      return new Response(JSON.stringify({ error: 'Сообщение не найдено' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (message.user_id !== user.id && user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Вы можете удалять только свои сообщения' }), { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await db.prepare('UPDATE messages SET is_deleted = 1, content = ? WHERE id = ?').bind('Сообщение удалено', messageId).run();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Delete message error:', error);
    return new Response(JSON.stringify({ error: 'Ошибка сервера' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
