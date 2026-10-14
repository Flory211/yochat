import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    if (user.username !== 'Leo') return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (type === 'users') {
      const { data: users, error } = await supabase.from('users').select('id, username, display_name, role, is_banned, created_at').order('created_at', { ascending: false });
      if (error) throw error;
      return NextResponse.json({ users });
    }

    if (type === 'chats') {
      const { data: chats, error } = await supabase.from('chats').select('id, name, description, created_at, created_by').order('created_at', { ascending: false });
      if (error) throw error;
      return NextResponse.json({ chats });
    }

    if (type === 'logs') {
      const { data: logs, error } = await supabase.from('logs').select('id, user_id, action, details, created_at').order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      return NextResponse.json({ logs });
    }

    return NextResponse.json({ error: 'Неверный тип данных' }, { status: 400 });
  } catch (error) {
    console.error('Admin get error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    if (user.username !== 'Leo') return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });

    const { action, user_id, chat_id, role, is_banned } = await request.json();

    if (action === 'ban_user') {
      await supabase.from('users').update({ is_banned }).eq('id', user_id);
      await supabase.from('logs').insert([{ user_id: user.id, action: 'ban_user', details: `Пользователь ${is_banned ? 'забанен' : 'разбанен'} ID: ${user_id}` }]);
      return NextResponse.json({ success: true });
    }

    if (action === 'change_role') {
      await supabase.from('users').update({ role }).eq('id', user_id);
      await supabase.from('logs').insert([{ user_id: user.id, action: 'change_role', details: `Роль изменена для пользователя ID: ${user_id}, новая роль: ${role}` }]);
      return NextResponse.json({ success: true });
    }

    if (action === 'add_to_chat') {
      await supabase.from('chat_members').insert([{ chat_id, user_id }]);
      await supabase.from('logs').insert([{ user_id: user.id, action: 'add_to_chat', details: `Пользователь ID: ${user_id} добавлен в чат ID: ${chat_id}` }]);
      return NextResponse.json({ success: true });
    }

    if (action === 'remove_from_chat') {
      await supabase.from('chat_members').delete().eq('chat_id', chat_id).eq('user_id', user_id);
      await supabase.from('logs').insert([{ user_id: user.id, action: 'remove_from_chat', details: `Пользователь ID: ${user_id} удален из чата ID: ${chat_id}` }]);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Неверное действие' }, { status: 400 });
  } catch (error) {
    console.error('Admin action error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
