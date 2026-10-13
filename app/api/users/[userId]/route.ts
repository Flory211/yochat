import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
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

    const { userId } = await params;

    if (!userId) {
      return NextResponse.json(
        { error: 'ID пользователя обязателен' },
        { status: 400 }
      );
    }

    // Нельзя удалить самого Leo
    const userToDelete = db.prepare('SELECT username FROM users WHERE id = ?').get(userId) as any;
    
    if (!userToDelete) {
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    if (userToDelete.username === 'Leo') {
      return NextResponse.json(
        { error: 'Невозможно удалить основного администратора' },
        { status: 403 }
      );
    }

    // Сначала удаляем все связанные записи
    // Удаляем сообщения пользователя
    db.prepare('DELETE FROM messages WHERE user_id = ?').run(userId);
    
    // Удаляем пользователя из всех чатов
    db.prepare('DELETE FROM chat_members WHERE user_id = ?').run(userId);
    
    // Удаляем логи пользователя
    db.prepare('DELETE FROM logs WHERE user_id = ?').run(userId);
    
    // Обновляем чаты, созданные пользователем (передаем Leo)
    const leoUser = db.prepare('SELECT id FROM users WHERE username = ?').get('Leo') as any;
    if (leoUser) {
      db.prepare('UPDATE chats SET created_by = ? WHERE created_by = ?').run(leoUser.id, userId);
    }
    
    // Теперь удаляем самого пользователя
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);

    // Логируем действие
    db.prepare(`
      INSERT INTO logs (user_id, action, details)
      VALUES (?, ?, ?)
    `).run(user.id, 'delete_user', `Удален пользователь: ${userToDelete.username}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
