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

    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');

    if (!chatId) {
      return NextResponse.json(
        { error: 'ID чата обязателен' },
        { status: 400 }
      );
    }

    // Проверяем, что пользователь является участником чата
    const isMember = db.prepare(`
      SELECT 1 FROM chat_members
      WHERE chat_id = ? AND user_id = ?
    `).get(chatId, user.id);

    if (!isMember) {
      return NextResponse.json(
        { error: 'Вы не являетесь участником этого чата' },
        { status: 403 }
      );
    }

    // Получаем сообщения чата
    const messages = db.prepare(`
      SELECT m.*, u.username, u.display_name, u.role
      FROM messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.chat_id = ?
      ORDER BY m.created_at ASC
      LIMIT 100
    `).all(chatId) as any[];

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Get messages error:', error);
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

    const { chat_id, content, message_type = 'text', file_url, file_name, file_size } = await request.json();

    if (!chat_id || !content) {
      return NextResponse.json(
        { error: 'ID чата и содержимое обязательны' },
        { status: 400 }
      );
    }

    // Проверяем, что пользователь является участником чата
    const isMember = db.prepare(`
      SELECT 1 FROM chat_members
      WHERE chat_id = ? AND user_id = ?
    `).get(chat_id, user.id);

    if (!isMember) {
      return NextResponse.json(
        { error: 'Вы не являетесь участником этого чата' },
        { status: 403 }
      );
    }

    // Создаем сообщение
    const result = db.prepare(`
      INSERT INTO messages (chat_id, user_id, content, message_type, file_url, file_name, file_size)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(chat_id, user.id, content, message_type, file_url || null, file_name || null, file_size || null);

    const messageId = result.lastInsertRowid as number;

    // Получаем данные сообщения
    const message = db.prepare(`
      SELECT m.*, u.username, u.display_name, u.role
      FROM messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.id = ?
    `).get(messageId) as any;

    return NextResponse.json({ 
      success: true,
      message 
    });
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
