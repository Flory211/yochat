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

    // Если это личный чат, проверяем существует ли он уже
    if (type === 'private' && member_ids && member_ids.length === 1) {
      const otherUserId = member_ids[0];
      
      const existingChat = db.prepare(`
        SELECT c.id FROM chats c
        JOIN chat_members cm1 ON c.id = cm1.chat_id
        JOIN chat_members cm2 ON c.id = cm2.chat_id
        WHERE c.type = 'private'
        AND cm1.user_id = ?
        AND cm2.user_id = ?
      `).get(user.id, otherUserId) as any;

      if (existingChat) {
        return NextResponse.json({ success: true, chat_id: existingChat.id, exists: true });
      }

      const result = db.prepare(
        'INSERT INTO chats (name, description, type, created_by) VALUES (?, ?, ?, ?)'
      ).run(`Личный чат`, '', 'private', user.id);

      const chatId = result.lastInsertRowid as number;

      db.prepare('INSERT INTO chat_members (chat_id, user_id) VALUES (?, ?)').run(chatId, user.id);
      db.prepare('INSERT INTO chat_members (chat_id, user_id) VALUES (?, ?)').run(chatId, otherUserId);

      return NextResponse.json({ success: true, chat_id: chatId });
    }

    // Создание общего чата
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
