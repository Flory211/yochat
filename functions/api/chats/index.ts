export async function onRequestGet(context: any) {
  try {
    const { request, env } = context;
    const db = env.DB;
    
    // Получаем токен из cookie или header
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

    const chats = await db.prepare(`
      SELECT c.*,
        CASE
          WHEN c.type = 'general' THEN 'Общий чат'
          ELSE 'Личный чат'
        END as type_name
      FROM chats c
      JOIN chat_members cm ON c.id = cm.chat_id
      WHERE cm.user_id = ?
      ORDER BY c.created_at DESC
    `).bind(user.id).all();

    return new Response(JSON.stringify({ chats: chats.results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Get chats error:', error);
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

    const { name, description, type, member_ids } = await request.json();

    if (type === 'private' && member_ids && member_ids.length === 1) {
      const otherUserId = member_ids[0];

      const existingChat = await db.prepare(`
        SELECT c.id FROM chats c
        JOIN chat_members cm1 ON c.id = cm1.chat_id
        JOIN chat_members cm2 ON c.id = cm2.chat_id
        WHERE c.type = 'private'
        AND cm1.user_id = ?
        AND cm2.user_id = ?
      `).bind(user.id, otherUserId).first() as any;

      if (existingChat) {
        return new Response(JSON.stringify({ success: true, chat_id: existingChat.id, exists: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const result = await db.prepare(
        'INSERT INTO chats (name, description, type, created_by) VALUES (?, ?, ?, ?)'
      ).bind('Личный чат', '', 'private', user.id).run();

      const chatId = result.meta.last_row_id;

      await db.prepare('INSERT INTO chat_members (chat_id, user_id) VALUES (?, ?)').bind(chatId, user.id).run();
      await db.prepare('INSERT INTO chat_members (chat_id, user_id) VALUES (?, ?)').bind(chatId, otherUserId).run();

      return new Response(JSON.stringify({ success: true, chat_id: chatId }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!name) {
      return new Response(JSON.stringify({ error: 'Название чата обязательно' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await db.prepare(
      'INSERT INTO chats (name, description, type, created_by) VALUES (?, ?, ?, ?)'
    ).bind(name, description || '', type || 'general', user.id).run();

    const chatId = result.meta.last_row_id;

    await db.prepare('INSERT INTO chat_members (chat_id, user_id) VALUES (?, ?)').bind(chatId, user.id).run();

    if (member_ids && Array.isArray(member_ids)) {
      for (const memberId of member_ids) {
        await db.prepare('INSERT INTO chat_members (chat_id, user_id) VALUES (?, ?)').bind(chatId, memberId).run();
      }
    }

    return new Response(JSON.stringify({ success: true, chat_id: chatId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Create chat error:', error);
    return new Response(JSON.stringify({ error: 'Ошибка сервера' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
