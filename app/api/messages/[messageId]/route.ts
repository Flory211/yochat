import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json({ error: 'ID сообщения обязателен' }, { status: 400 });
    }

    const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(messageId) as any;

    if (!message) {
      return NextResponse.json({ error: 'Сообщение не найдено' }, { status: 404 });
    }

    if (message.user_id !== user.id && user.role !== 'admin') {
      return NextResponse.json({ error: 'Вы можете удалять только свои сообщения' }, { status: 403 });
    }

    db.prepare('UPDATE messages SET is_deleted = 1, content = \'Сообщение удалено\' WHERE id = ?').run(messageId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete message error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
