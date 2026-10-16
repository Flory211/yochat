import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    }

    if (user.username !== 'Leo') {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
    }

    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (type === 'users') {
      const users = await db.prepare('SELECT id, username, display_name, role, is_banned, created_at FROM users ORDER BY created_at DESC').all();
      return NextResponse.json({ users });
    }

    if (type === 'chats') {
      const chats = await db.prepare('SELECT * FROM chats ORDER BY created_at DESC').all();
      return NextResponse.json({ chats });
    }

    if (type === 'logs') {
      const logs = await db.prepare('SELECT * FROM logs ORDER BY created_at DESC LIMIT 100').all();
      return NextResponse.json({ logs });
    }

    return NextResponse.json({ error: 'Неверный тип данных' }, { status: 400 });
  } catch (error) {
    console.error('Admin get error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    }

    if (user.username !== 'Leo') {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
    }

    const db = await getDb();
    const { action, user_id, is_banned } = await request.json();

    if (action === 'ban_user') {
      await db.prepare('UPDATE users SET is_banned = ? WHERE id = ?').run(is_banned ? 1 : 0, user_id);
      await db.prepare('INSERT INTO logs (user_id, action, details) VALUES (?, ?, ?)').run(user.id, 'ban_user', `Пользователь ${is_banned ? 'забанен' : 'разбанен'} ID: ${user_id}`);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Неверное действие' }, { status: 400 });
  } catch (error) {
    console.error('Admin action error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
