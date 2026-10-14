import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');
    if (!messageId) return NextResponse.json({ error: 'ID сообщения обязателен' }, { status: 400 });

    const { content } = await request.json();
    if (!content) return NextResponse.json({ error: 'Содержимое обязательно' }, { status: 400 });

    const { data: message, error } = await supabase
      .from('messages')
      .select('user_id')
      .eq('id', messageId)
      .single();

    if (error || !message) return NextResponse.json({ error: 'Сообщение не найдено' }, { status: 404 });
    if (message.user_id !== user.id) return NextResponse.json({ error: 'Вы можете редактировать только свои сообщения' }, { status: 403 });

    const { error: updateError } = await supabase
      .from('messages')
      .update({ content, is_edited: true })
      .eq('id', messageId);

    if (updateError) throw updateError;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Edit message error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');
    if (!messageId) return NextResponse.json({ error: 'ID сообщения обязателен' }, { status: 400 });

    const { data: message, error } = await supabase
      .from('messages')
      .select('user_id')
      .eq('id', messageId)
      .single();

    if (error || !message) return NextResponse.json({ error: 'Сообщение не найдено' }, { status: 404 });
    if (message.user_id !== user.id && user.role !== 'admin') return NextResponse.json({ error: 'Вы можете удалять только свои сообщения' }, { status: 403 });

    const { error: updateError } = await supabase
      .from('messages')
      .update({ is_deleted: true, content: 'Сообщение удалено' })
      .eq('id', messageId);

    if (updateError) throw updateError;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete message error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
