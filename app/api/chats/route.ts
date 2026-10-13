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

    // Получаем все чаты, где пользователь является участником
    const chats = db.prepare(`
      SELECT c.*, 
        GROUP_CONCAT(u.display_name, ', ') as members,
        COUNT(DISTINCT cm.user_id) as member_count
      FROM chats c
      JOIN chat_members cm ON c.id = cm.chat_id
      LEFT JOIN chat_members cm2 ON c.id = cm2.chat_id
      LEFT JOIN users u ON cm2.user_id = u.id
      WHERE cm.user_id = ?
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `).all(user.id) as any[];

    return NextResponse.json({ chats });
  } catch (error) {
    console.error('Get chats error:', error);
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

    // Только админ и учитель могут создавать чаты
    if (user.role !== 'admin' && user.role !== 'teacher') {
      return NextResponse.json(
        { error: 'Недостаточно прав' },
        { status: 403 }
      );
    }

    const { name, description, member_ids } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Название чата обязательно' },
        { status: 400 }
      );
    }

    // Создаем чат
    const result = db.prepare(`
      INSERT INTO chats (name, description, created_by)
      VALUES (?, ?, ?)
    `).run(name, description || '', user.id);

    const chatId = result.lastInsertRowid as number;

    // Добавляем создателя в чат
    db.prepare(`
      INSERT INTO chat_members (chat_id, user_id)
      VALUES (?, ?)
    `).run(chatId, user.id);

    // Добавляем участников, если указаны
    if (member_ids && Array.isArray(member_ids)) {
      const stmt = db.prepare(`
        INSERT OR IGNORE INTO chat_members (chat_id, user_id)
        VALUES (?, ?)
      `);
      
      for (const memberId of member_ids) {
        stmt.run(chatId, memberId);
      }
    }

    // Логируем действие
    db.prepare(`
      INSERT INTO logs (user_id, action, details)
      VALUES (?, ?, ?)
    `).run(user.id, 'create_chat', `Создан чат: ${name}`);

    return NextResponse.json({ 
      success: true,
      chat_id: chatId 
    });
  } catch (error) {
    console.error('Create chat error:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
