import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json(
        { error: 'ID сообщения обязателен' },
        { status: 400 }
      );
    }

    const { content } = await request.json();

    if (!content) {
      return NextResponse.json(
        { error: 'Содержимое обязательно' },
        { status: 400 }
      );
    }

    // Получаем сообщение
    const message = db.prepare(`
      SELECT * FROM messages WHERE id = ?
    `).get(messageId) as any;

    if (!message) {
      return NextResponse.json(
        { error: 'Сообщение не найдено' },
        { status: 404 }
      );
    }

    // Проверка, что пользователь является автором сообщения
    if (message.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Вы можете редактировать только свои сообщения' },
        { status: 403 }
      );
    }

    // Обновляем сообщение
    db.prepare(`
      UPDATE messages
      SET content = ?, is_edited = 1
      WHERE id = ?
    `).run(content, messageId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Edit message error:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json(
        { error: 'ID сообщения обязателен' },
        { status: 400 }
      );
    }

    // Получаем сообщение
    const message = db.prepare(`
      SELECT * FROM messages WHERE id = ?
    `).get(messageId) as any;

    if (!message) {
      return NextResponse.json(
        { error: 'Сообщение не найдено' },
        { status: 404 }
      );
    }

    // Проверка, что пользователь является автором или админом
    if (message.user_id !== user.id && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Вы можете удалять только свои сообщения' },
        { status: 403 }
      );
    }

    // Помечаем сообщение как удаленное
    db.prepare(`
      UPDATE messages
      SET is_deleted = 1, content = 'Сообщение удалено'
      WHERE id = ?
    `).run(messageId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete message error:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
