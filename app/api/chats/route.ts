import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });

    const { data: chats, error } = await supabase
      .from('chats')
      .select('id, name, description, created_at, created_by')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const chatsWithMembers = await Promise.all(chats.map(async (chat) => {
      const { count } = await supabase.from('chat_members').select('*', { count: 'exact', head: true }).eq('chat_id', chat.id);
      return { ...chat, member_count: count || 0 };
    }));

    return NextResponse.json({ chats: chatsWithMembers });
  } catch (error) {
    console.error('Get chats error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });

    const { name, description, member_ids } = await request.json();
    if (!name) return NextResponse.json({ error: 'Название чата обязательно' }, { status: 400 });

    const { data: chat, error } = await supabase
      .from('chats')
      .insert([{ name, description: description || '', created_by: user.id }])
      .select('id')
      .single();

    if (error) throw error;

    await supabase.from('chat_members').insert([{ chat_id: chat.id, user_id: user.id }]);

    if (member_ids && Array.isArray(member_ids)) {
      const members = member_ids.map((userId: number) => ({ chat_id: chat.id, user_id: userId }));
      await supabase.from('chat_members').insert(members);
    }

    await supabase.from('logs').insert([{ user_id: user.id, action: 'create_chat', details: `Создан чат: ${name}` }]);

    return NextResponse.json({ success: true, chat_id: chat.id });
  } catch (error) {
    console.error('Create chat error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
