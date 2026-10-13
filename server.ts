import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import db from './lib/db';

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

    // Присоединение к чату
    socket.on('join_chat', (chatId) => {
      socket.join(`chat_${chatId}`);
      console.log(`Пользователь ${socket.id} присоединился к чату ${chatId}`);
    });

    // Покинуть чат
    socket.on('leave_chat', (chatId) => {
      socket.leave(`chat_${chatId}`);
      console.log(`Пользователь ${socket.id} покинул чат ${chatId}`);
    });

    // Новое сообщение
    socket.on('send_message', (data) => {
      const { chat_id, user_id, content, message_type = 'text', file_url, file_name, file_size } = data;

      // Сохраняем сообщение в БД
      const result = db.prepare(`
        INSERT INTO messages (chat_id, user_id, content, message_type, file_url, file_name, file_size)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(chat_id, user_id, content, message_type, file_url || null, file_name || null, file_size || null);

      const messageId = result.lastInsertRowid as number;

      // Получаем данные сообщения
      const message = db.prepare(`
        SELECT m.*, u.username, u.display_name, u.role
        FROM messages m
        JOIN users u ON m.user_id = u.id
        WHERE m.id = ?
      `).get(messageId) as any;

      // Отправляем сообщение всем в чате
      io.to(`chat_${chat_id}`).emit('new_message', message);
    });

    // Редактирование сообщения
    socket.on('edit_message', (data) => {
      const { message_id, content } = data;

      db.prepare(`
        UPDATE messages SET content = ?, is_edited = 1 WHERE id = ?
      `).run(content, message_id);

      const message = db.prepare(`
        SELECT m.*, u.username, u.display_name, u.role
        FROM messages m
        JOIN users u ON m.user_id = u.id
        WHERE m.id = ?
      `).get(message_id) as any;

      // Отправляем обновленное сообщение
      const chatId = message.chat_id;
      io.to(`chat_${chatId}`).emit('message_edited', message);
    });

    // Удаление сообщения
    socket.on('delete_message', (data) => {
      const { message_id } = data;

      const message = db.prepare(`
        SELECT chat_id FROM messages WHERE id = ?
      `).get(message_id) as any;

      db.prepare(`
        UPDATE messages SET is_deleted = 1, content = 'Сообщение удалено' WHERE id = ?
      `).run(message_id);

      if (message) {
        io.to(`chat_${message.chat_id}`).emit('message_deleted', { message_id });
      }
    });

    // Отключение
    socket.on('disconnect', () => {
      console.log('Пользователь отключен:', socket.id);
    });
  });

  server.listen(port, hostname, () => {
    console.log(`> ЁЧат готов к работе на http://${hostname}:${port}`);
  });
});
