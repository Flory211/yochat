import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { hashPassword, createToken, getCookieOptions, COOKIE_NAME } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { username, display_name, password } = await request.json();

    // Валидация
    if (!username || !display_name || !password) {
      return NextResponse.json(
        { error: 'Все поля обязательны' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Пароль должен быть не менее 6 символов' },
        { status: 400 }
      );
    }

    // Проверяем, существует ли пользователь
    const existingUser = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'Пользователь с таким именем уже существует' },
        { status: 400 }
      );
    }

    // Хэшируем пароль
    const passwordHash = await hashPassword(password);

    // Определяем роль (первый пользователь - админ)
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    const role = userCount.count === 0 ? 'admin' : 'student';

    // Создаем пользователя
    const result = db.prepare(`
      INSERT INTO users (username, display_name, password_hash, role)
      VALUES (?, ?, ?, ?)
    `).run(username, display_name, passwordHash, role);

    const userId = result.lastInsertRowid as number;

    // Получаем данные пользователя
    const user = db.prepare(`
      SELECT id, username, display_name, role, is_banned
      FROM users WHERE id = ?
    `).get(userId) as any;

    // Создаем токен
    const token = await createToken(user);

    // Если это первый пользователь, создаем общий чат
    if (userCount.count === 0) {
      const chatResult = db.prepare(`
        INSERT INTO chats (name, description, created_by)
        VALUES (?, ?, ?)
      `).run('Общий чат', 'Общий чат для всех пользователей', userId);

      const chatId = chatResult.lastInsertRowid as number;

      // Добавляем админа в общий чат
      db.prepare(`
        INSERT INTO chat_members (chat_id, user_id)
        VALUES (?, ?)
      `).run(chatId, userId);
    }

    // Логируем действие
    db.prepare(`
      INSERT INTO logs (user_id, action, details)
      VALUES (?, ?, ?)
    `).run(userId, 'register', `Новый пользователь: ${username}`);

    // Устанавливаем cookie
    const response = NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        role: user.role,
      }
    });

    response.cookies.set(COOKIE_NAME, token, getCookieOptions());

    return response;
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
