import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');
    if (!chatId) return NextResponse.json({ error: 'ID чата обязателен' }, { status: 400 });

    const { data: messages, error } = await supabase
      .from('messages')
      .select('*, users!inner(username, display_name, role)')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) throw error;
    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });

    const { chat_id, content, message_type = 'text', file_url, file_name, file_size } = await request.json();
    if (!chat_id || !content) return NextResponse.json({ error: 'ID чата и содержимое обязательны' }, { status: 400 });

    const { data: message, error } = await supabase
      .from('messages')
      .insert([{ chat_id, user_id: user.id, content, message_type, file_url, file_name, file_size }])
      .select('*, users!inner(username, display_name, role)')
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
