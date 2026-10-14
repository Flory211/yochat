import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { verifyPassword, createToken, getCookieOptions, COOKIE_NAME } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    // Валидация
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Все поля обязательны' },
        { status: 400 }
      );
    }

    // Ищем пользователя в Supabase
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, display_name, password_hash, role, is_banned')
      .eq('username', username)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: 'Неверное имя пользователя или пароль' },
        { status: 401 }
      );
    }

    // Проверяем бан
    if (user.is_banned) {
      return NextResponse.json(
        { error: 'Ваш аккаунт заблокирован' },
        { status: 403 }
      );
    }

    // Проверяем пароль
    const isValidPassword = await verifyPassword(password, user.password_hash);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Неверное имя пользователя или пароль' },
        { status: 401 }
      );
    }

    // Создаем токен
    const token = await createToken({
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      role: user.role,
      is_banned: user.is_banned ? 1 : 0,
    });

    // Логируем действие
    await supabase
      .from('logs')
      .insert([{ user_id: user.id, action: 'login', details: 'Вход в систему' }]);

    // Устанавливаем cookie
    const response = NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        role: user.role,
      },
      token: token, // Возвращаем токен для localStorage
    });

    response.cookies.set(COOKIE_NAME, token, getCookieOptions());

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
