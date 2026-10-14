import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import { supabase } from './lib/db';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('Пользователь подключен:', socket.id);

    socket.on('join_chat', (chatId) => {
      socket.join(`chat_${chatId}`);
      console.log(`Пользователь ${socket.id} присоединился к чату ${chatId}`);
    });

    socket.on('leave_chat', (chatId) => {
      socket.leave(`chat_${chatId}`);
      console.log(`Пользователь ${socket.id} покинул чат ${chatId}`);
    });

    socket.on('send_message', async (data) => {
      const { chat_id, user_id, content, message_type = 'text', file_url, file_name, file_size } = data;

      const { data: message, error } = await supabase
        .from('messages')
        .insert([{ chat_id, user_id, content, message_type, file_url, file_name, file_size }])
        .select('*, users!inner(username, display_name, role)')
        .single();

      if (error) {
        console.error('Send message error:', error);
        return;
      }

      io.to(`chat_${chat_id}`).emit('new_message', message);
    });

    socket.on('edit_message', async (data) => {
      const { message_id, content } = data;

      const { error } = await supabase
        .from('messages')
        .update({ content, is_edited: true })
        .eq('id', message_id);

      if (error) {
        console.error('Edit message error:', error);
        return;
      }

      const { data: message } = await supabase
        .from('messages')
        .select('*, users!inner(username, display_name, role)')
        .eq('id', message_id)
        .single();

      if (message) {
        io.to(`chat_${message.chat_id}`).emit('message_edited', message);
      }
    });

    socket.on('delete_message', async (data) => {
      const { message_id } = data;

      const { data: message } = await supabase
        .from('messages')
        .select('chat_id')
        .eq('id', message_id)
        .single();

      const { error } = await supabase
        .from('messages')
        .update({ is_deleted: true, content: 'Сообщение удалено' })
        .eq('id', message_id);

      if (error) {
        console.error('Delete message error:', error);
        return;
      }

      if (message) {
        io.to(`chat_${message.chat_id}`).emit('message_deleted', { message_id });
      }
    });

    socket.on('disconnect', () => {
      console.log('Пользователь отключен:', socket.id);
    });
  });

  server.listen(port, hostname, () => {
    console.log(`> ЁЧат готов к работе на http://${hostname}:${port}`);
  });
});
