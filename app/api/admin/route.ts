import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    if (user.username !== 'Leo') {
      return NextResponse.json(
        { error: 'Недостаточно прав' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (type === 'users') {
      const users = db.prepare(`
        SELECT id, username, display_name, role, is_banned, created_at
        FROM users
        ORDER BY created_at DESC
      `).all();
      return NextResponse.json({ users });
    }

    if (type === 'chats') {
      const chats = db.prepare(`
        SELECT c.*, 
          COUNT(DISTINCT cm.user_id) as member_count,
          u.display_name as created_by_name
        FROM chats c
        LEFT JOIN chat_members cm ON c.id = cm.chat_id
        LEFT JOIN users u ON c.created_by = u.id
        GROUP BY c.id
        ORDER BY c.created_at DESC
      `).all();
      return NextResponse.json({ chats });
    }

    if (type === 'logs') {
      const logs = db.prepare(`
        SELECT l.*, u.username, u.display_name
        FROM logs l
        LEFT JOIN users u ON l.user_id = u.id
        ORDER BY l.created_at DESC
        LIMIT 100
      `).all();
      return NextResponse.json({ logs });
    }

    return NextResponse.json(
      { error: 'Неверный тип данных' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Admin get error:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    if (user.username !== 'Leo') {
      return NextResponse.json(
        { error: 'Недостаточно прав' },
        { status: 403 }
      );
    }

    const { action, user_id, chat_id, role, is_banned } = await request.json();

    if (action === 'ban_user') {
      db.prepare(`
        UPDATE users SET is_banned = ? WHERE id = ?
      `).run(is_banned ? 1 : 0, user_id);

      db.prepare(`
        INSERT INTO logs (user_id, action, details)
        VALUES (?, ?, ?)
      `).run(user.id, 'ban_user', `Пользователь ${is_banned ? 'забанен' : 'разбанен'} ID: ${user_id}`);

      return NextResponse.json({ success: true });
    }

    if (action === 'change_role') {
      db.prepare(`
        UPDATE users SET role = ? WHERE id = ?
      `).run(role, user_id);

      db.prepare(`
        INSERT INTO logs (user_id, action, details)
        VALUES (?, ?, ?)
      `).run(user.id, 'change_role', `Роль изменена для пользователя ID: ${user_id}, новая роль: ${role}`);

      return NextResponse.json({ success: true });
    }

    if (action === 'add_to_chat') {
      db.prepare(`
        INSERT OR IGNORE INTO chat_members (chat_id, user_id)
        VALUES (?, ?)
      `).run(chat_id, user_id);

      db.prepare(`
        INSERT INTO logs (user_id, action, details)
        VALUES (?, ?, ?)
      `).run(user.id, 'add_to_chat', `Пользователь ID: ${user_id} добавлен в чат ID: ${chat_id}`);

      return NextResponse.json({ success: true });
    }

    if (action === 'remove_from_chat') {
      db.prepare(`
        DELETE FROM chat_members WHERE chat_id = ? AND user_id = ?
      `).run(chat_id, user_id);

      db.prepare(`
        INSERT INTO logs (user_id, action, details)
        VALUES (?, ?, ?)
      `).run(user.id, 'remove_from_chat', `Пользователь ID: ${user_id} удален из чата ID: ${chat_id}`);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Неверное действие' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Admin action error:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
