import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { hashPassword, createToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { username, display_name, password } = await request.json();

    if (!username || !display_name || !password) {
      return NextResponse.json({ error: 'Все поля обязательны' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Пароль должен быть не менее 6 символов' }, { status: 400 });
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);

    if (existingUser) {
      return NextResponse.json({ error: 'Пользователь с таким именем уже существует' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    const role = userCount.count === 0 ? 'admin' : 'student';

    const result = db.prepare(
      'INSERT INTO users (username, display_name, password_hash, role) VALUES (?, ?, ?, ?)'
    ).run(username, display_name, passwordHash, role);

    const userId = result.lastInsertRowid as number;

    const user = db.prepare('SELECT id, username, display_name, role, is_banned FROM users WHERE id = ?').get(userId) as any;

    const token = await createToken({
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      role: user.role,
      is_banned: user.is_banned,
    });

    if (userCount.count === 0) {
      const chatResult = db.prepare(
        'INSERT INTO chats (name, description, created_by) VALUES (?, ?, ?)'
      ).run('Общий чат', 'Общий чат для всех пользователей', userId);

      const chatId = chatResult.lastInsertRowid as number;

      db.prepare('INSERT INTO chat_members (chat_id, user_id) VALUES (?, ?)').run(chatId, userId);
    }

    db.prepare('INSERT INTO logs (user_id, action, details) VALUES (?, ?, ?)').run(userId, 'register', `Новый пользователь: ${username}`);

    const response = NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        role: user.role,
      },
      token,
    });

    response.cookies.set('yochat_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
