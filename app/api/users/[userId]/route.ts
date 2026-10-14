import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    if (user.username !== 'Leo') return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'ID пользователя обязателен' }, { status: 400 });

    const { data: userToDelete, error } = await supabase.from('users').select('username').eq('id', userId).single();
    if (error || !userToDelete) return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    if (userToDelete.username === 'Leo') return NextResponse.json({ error: 'Невозможно удалить основного администратора' }, { status: 403 });

    await supabase.from('messages').delete().eq('user_id', userId);
    await supabase.from('chat_members').delete().eq('user_id', userId);
    await supabase.from('logs').delete().eq('user_id', userId);

    const { data: leoUser } = await supabase.from('users').select('id').eq('username', 'Leo').single();
    if (leoUser) {
      await supabase.from('chats').update({ created_by: leoUser.id }).eq('created_by', userId);
    }

    await supabase.from('users').delete().eq('id', userId);
    await supabase.from('logs').insert([{ user_id: user.id, action: 'delete_user', details: `Удален пользователь: ${userToDelete.username}` }]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
