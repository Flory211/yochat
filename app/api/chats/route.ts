import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    }

    const chats = db.prepare(`
      SELECT c.*, 
        CASE 
          WHEN c.type = 'general' THEN 'Общий чат'
          ELSE 'Личный чат'
        END as type_name
      FROM chats c
      JOIN chat_members cm ON c.id = cm.chat_id
      WHERE cm.user_id = ?
      ORDER BY c.created_at DESC
    `).all(user.id);

    return NextResponse.json({ chats });
  } catch (error) {
    console.error('Get chats error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    }

    const { name, description, type, member_ids } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Название чата обязательно' }, { status: 400 });
    }

    const result = db.prepare(
      'INSERT INTO chats (name, description, type, created_by) VALUES (?, ?, ?, ?)'
    ).run(name, description || '', type || 'general', user.id);

    const chatId = result.lastInsertRowid as number;

    db.prepare('INSERT INTO chat_members (chat_id, user_id) VALUES (?, ?)').run(chatId, user.id);

    if (member_ids && Array.isArray(member_ids)) {
      const stmt = db.prepare('INSERT INTO chat_members (chat_id, user_id) VALUES (?, ?)');
      for (const memberId of member_ids) {
        stmt.run(chatId, memberId);
      }
    }

    return NextResponse.json({ success: true, chat_id: chatId });
  } catch (error) {
    console.error('Create chat error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
