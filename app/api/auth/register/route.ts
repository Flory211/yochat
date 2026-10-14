import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { hashPassword, createToken, getCookieOptions, COOKIE_NAME } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { username, display_name, password } = await request.json();

    if (!username || !display_name || !password) {
      return NextResponse.json({ error: 'Все поля обязательны' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Пароль должен быть не менее 6 символов' }, { status: 400 });
    }

    const { data: existingUser } = await supabase.from('users').select('id').eq('username', username).single();
    
    if (existingUser) {
      return NextResponse.json({ error: 'Пользователь с таким именем уже существует' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    const { count } = await supabase.from('users').select('*', { count: 'exact', head: true });
    const role = count === 0 ? 'admin' : 'student';

    const { data: user, error } = await supabase
      .from('users')
      .insert([{ username, display_name, password_hash: passwordHash, role }])
      .select('id, username, display_name, role')
      .single();

    if (error) {
      return NextResponse.json({ error: 'Ошибка при создании пользователя' }, { status: 500 });
    }

    const token = await createToken({ id: user.id, username: user.username, display_name: user.display_name, role: user.role, is_banned: 0 });

    if (count === 0) {
      const { data: chat } = await supabase.from('chats').insert([{ name: 'Общий чат', description: 'Общий чат для всех пользователей', created_by: user.id }]).select('id').single();
      if (chat) {
        await supabase.from('chat_members').insert([{ chat_id: chat.id, user_id: user.id }]);
      }
    }

    await supabase.from('logs').insert([{ user_id: user.id, action: 'register', details: `Новый пользователь: ${username}` }]);

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
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
