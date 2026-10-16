import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { hashPassword, verifyPassword, createToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Все поля обязательны' }, { status: 400 });
    }

    const user = await db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;

    if (!user) {
      return NextResponse.json({ error: 'Неверное имя пользователя или пароль' }, { status: 401 });
    }

    if (user.is_banned) {
      return NextResponse.json({ error: 'Ваш аккаунт заблокирован' }, { status: 403 });
    }

    const isValidPassword = await verifyPassword(password, user.password_hash);

    if (!isValidPassword) {
      return NextResponse.json({ error: 'Неверное имя пользователя или пароль' }, { status: 401 });
    }

    const token = await createToken({
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      role: user.role,
      is_banned: user.is_banned,
    });

    await db.prepare('INSERT INTO logs (user_id, action, details) VALUES (?, ?, ?)').run(user.id, 'login', 'Вход в систему');

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
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
