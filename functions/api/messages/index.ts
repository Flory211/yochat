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

    const url = new URL(request.url);
    const chatId = url.searchParams.get('chatId');

    if (!chatId) {
      return new Response(JSON.stringify({ error: 'ID чата обязателен' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const isMember = await db.prepare(
      'SELECT 1 FROM chat_members WHERE chat_id = ? AND user_id = ?'
    ).bind(chatId, user.id).first();

    if (!isMember) {
      return new Response(JSON.stringify({ error: 'Вы не являетесь участником этого чата' }), { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const messages = await db.prepare(`
      SELECT m.*, u.username, u.display_name, u.role
      FROM messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.chat_id = ?
      ORDER BY m.created_at ASC
      LIMIT 100
    `).bind(chatId).all();

    return new Response(JSON.stringify({ messages: messages.results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Get messages error:', error);
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

    const { chat_id, content, message_type = 'text', file_url, file_name, file_size } = await request.json();

    if (!chat_id || !content) {
      return new Response(JSON.stringify({ error: 'ID чата и содержимое обязательны' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const isMember = await db.prepare(
      'SELECT 1 FROM chat_members WHERE chat_id = ? AND user_id = ?'
    ).bind(chat_id, user.id).first();

    if (!isMember) {
      return new Response(JSON.stringify({ error: 'Вы не являетесь участником этого чата' }), { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await db.prepare(`
      INSERT INTO messages (chat_id, user_id, content, message_type, file_url, file_name, file_size)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(chat_id, user.id, content, message_type, file_url || null, file_name || null, file_size || null).run();

    const messageId = result.meta.last_row_id;

    const message = await db.prepare(`
      SELECT m.*, u.username, u.display_name, u.role
      FROM messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.id = ?
    `).bind(messageId).first();

    return new Response(JSON.stringify({ success: true, message }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Send message error:', error);
    return new Response(JSON.stringify({ error: 'Ошибка сервера' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
