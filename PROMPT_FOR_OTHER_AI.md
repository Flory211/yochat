# ЁЧат - Проект чата для онлайн-школы

## 📋 Описание проекта

**ЁЧат** - веб-приложение для групповых чатов онлайн-школы Ёшкола. Позволяет учителям и ученикам общаться в общем чате и личных сообщениях.

**Текущий статус:** Проект задеплоен на Cloudflare Pages, но НЕ РАБОТАЕТ (HTTP 500). Нужна помощь в завершении миграции на Cloudflare D1 и исправлении деплоя.

---

##  Технологии

### Frontend:
- **Next.js 16.4.0** (App Router)
- **React 19**
- **TypeScript**
- **Inline styles** (без Tailwind CSS в новых файлах)

### Backend:
- **Next.js API Routes** (serverless functions)
- **Cloudflare D1** (SQLite-совместимая база данных)
- **better-sqlite3** (только для локальной разработки)

### Авторизация:
- **bcryptjs** (хеширование паролей)
- **jose** (JWT токены)
- **Cookies + localStorage + Authorization header**

### Хостинг:
- **Cloudflare Pages** (бесплатно)
- **Cloudflare Workers** (runtime)
- **GitHub** (репозиторий: Flory211/yochat)

---

## 📁 Структура проекта

```
yochat/
├── app/
│   ├── api/
│   │   ├── admin/route.ts          # Админ-панель (только для Leo)
│   │   ├── auth/
│   │   │   ├── login/route.ts      # Вход
│   │   │   └── register/route.ts   # Регистрация
│   │   ├── chats/route.ts          # CRUD чатов
│   │   ├── messages/
│   │   │   ├── route.ts            # CRUD сообщений
│   │   │   └── [messageId]/route.ts # Удаление сообщений
│   │   ├── upload/route.ts         # Загрузка файлов
│   │   └── users/route.ts          # Список пользователей
│   ├── admin/page.tsx              # Админ-панель
│   ├── chats/
│   │   ├── page.tsx                # Список чатов + пользователи
│   │   └── [id]/page.tsx           # Страница чата
│   ├── login/page.tsx              # Страница входа/регистрации
│   ├── layout.tsx                  # Root layout
│   ├── page.tsx                    # Главная (редирект на /login)
│   └── globals.css                 # Глобальные стили
├── lib/
│   ├── auth.ts                     # Утилиты авторизации
│   └── db.ts                       # Универсальный DB helper (D1 + SQLite)
├── data/
│   └── yochat.db                   # Локальная SQLite база (не деплоится)
├── wrangler.jsonc                  # Конфигурация Cloudflare
├── schema.sql                      # Схема базы данных D1
└── package.json
```

---

## 🔧 Текущая проблема

### Что не работает:
1. **Деплой на Cloudflare Pages падает** с ошибкой:
   ```
   [ERROR] Missing entry-point to Worker script or to assets directory
   ```

2. **Сайт возвращает HTTP 500** по адресу: https://yochat.leogushinets.workers.dev

### Что уже сделано:
✅ D1 база данных создана (`yochat-db`, ID: `60d3018e-0f94-4b6c-a35f-b92a9eae8bc8`)
✅ SQL схема мигрирована (9 таблиц)
✅ `wrangler.jsonc` настроен с D1 binding
✅ `lib/db.ts` переписан - универсальный helper `getDb(env)`
✅ Build проходит успешно (`npm run build` exit code 0)
✅ D1 binding добавлен в Cloudflare Pages Settings → Bindings
✅ Deploy command изменён на пустой (был `npx wrangler deploy`)

### Что нужно сделать:
1. **Исправить деплой** - Cloudflare Pages должен успешно задеплоить проект
2. **Проверить работу API** - все endpoints должны работать с D1
3. **Протестировать функционал** - вход, чаты, сообщения

---

## 🗄 База данных

### Таблицы:
- **users** - пользователи (id, username, display_name, password_hash, role, is_banned)
- **chats** - чаты (id, name, description, type, created_by)
- **chat_members** - участники чатов (chat_id, user_id)
- **messages** - сообщения (id, chat_id, user_id, content, message_type, file_url, file_name, file_size, is_edited, is_deleted)
- **logs** - логи действий (id, user_id, action, details)

### Тестовые данные:
- **Leo** (admin) - id: 1
- **Leo2** (student) - id: 2, пароль: 123456
- **Misha** (student) - id: 3

---

## 🔐 Авторизация

### Flow:
1. Пользователь входит через `/login`
2. API `/api/auth/login` проверяет пароль и создаёт JWT токен
3. Токен сохраняется в:
   - **Cookie** (`yochat_token`) - для серверных запросов
   - **localStorage** (`token`) - для клиентских запросов
4. При запросах к API токен передаётся через:
   - Cookie (автоматически)
   - Header `Authorization: Bearer <token>` (для клиентских fetch)

### Проверка авторизации:
```typescript
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  // ...
}
```

---

## 📊 API Endpoints

### Auth:
- `POST /api/auth/login` - вход (username, password) → { user, token }
- `POST /api/auth/register` - регистрация (username, display_name, password) → { user, token }

### Chats:
- `GET /api/chats` - список чатов пользователя
- `POST /api/chats` - создать чат (name, description, type, member_ids)

### Messages:
- `GET /api/messages?chatId=<id>` - сообщения чата
- `POST /api/messages` - отправить сообщение (chat_id, content, message_type, file_url, file_name, file_size)
- `DELETE /api/messages/[messageId]` - удалить сообщение

### Users:
- `GET /api/users` - список всех пользователей

### Admin:
- `GET /api/admin?type=users|chats|logs` - данные для админ-панели
- `POST /api/admin` - действия (ban_user, change_role, add_to_chat, remove_from_chat)

### Upload:
- `POST /api/upload` - загрузка файла (multipart/form-data) → { file_url, file_name, file_size }

---

## 🎯 Функционал

### Общий чат:
- Создаётся автоматически при регистрации первого пользователя
- Все новые пользователи автоматически добавляются в общий чат
- Вид всем пользователям

### Личные сообщения:
- Любой пользователь может написать любому другому
- При нажатии "Написать" создаётся личный чат (если ещё не существует)
- Личный чат виден только участникам

### Админ-панель (только для Leo):
- Просмотр всех пользователей
- Бан/разбан пользователей
- Удаление пользователей (кроме Leo)
- Просмотр логов

### Загрузка файлов:
- Изображения и файлы до 10 МБ
- Файлы сохраняются в `/public/uploads/`
- В сообщениях отображаются как ссылки или изображения

---

## 🚀 Деплой

### Cloudflare Pages настройки:
- **Build command:** `npm run build`
- **Deploy command:** (пусто)
- **Root directory:** `/`
- **Build output directory:** `.next`

### Environment variables:
- `JWT_SECRET` - секретный ключ для JWT (любая строка)
- `NODE_ENV` - `production`

### D1 binding:
- **Variable name:** `DB`
- **D1 database:** `yochat-db`

---

##  Известные проблемы

1. **better-sqlite3 не работает на Cloudflare Workers** - только для локальной разработки
2. **Файловая система временная** - файлы из `/public/uploads/` сбрасываются при каждом деплое
3. **WebSocket не поддерживается** - сообщения обновляются через polling (каждые 2 секунды)

---

## 📝 Что нужно сделать для завершения миграции на D1

1. **Проверить, что все API routes используют `getDb(env)`** вместо прямого импорта `db`
2. **Убедиться, что D1 binding правильно передаётся** в API routes
3. **Протестировать все endpoints** локально с D1
4. **Задеплоить на Cloudflare Pages** и проверить работу

---

##  Ссылки

- **GitHub репозиторий:** https://github.com/Flory211/yochat
- **Cloudflare Pages:** https://pages.cloudflare.com
- **Сайт (не работает):** https://yochat.leogushinets.workers.dev
- **Supabase (старая БД, не используется):** https://supabase.com/dashboard/project/qgquowdgnrkclfnuekzv

---

##  Важно для другой нейросети

1. **Пользователь - новичок** в Git, GitHub, облачных платформах. Нужны пошаговые инструкции без технического жаргона.

2. **Пользователь не любит долгие объяснения** - даёт чёткие команды ("делай", "продолжай"). Отвечай кратко и по делу.

3. **Проект уже работает локально** - проблема только с деплоем на Cloudflare.

4. **D1 binding уже добавлен** в Cloudflare Pages Settings → Bindings.

5. **Deploy command уже пустой** - Cloudflare Pages должен сам деплоить после build.

6. **Build проходит успешно** - проблема в deploy этапе.

7. **Нужно проверить:**
   - Правильно ли настроен OpenNext adapter для Cloudflare Pages
   - Передаётся ли D1 binding в runtime
   - Работают ли API routes с D1

8. **Альтернативное решение:** Если не получится с Cloudflare D1, можно перейти на Render (бесплатно, поддерживает Node.js + SQLite без миграции).

---

## 🎯 Конечная цель

Сделать так, чтобы сайт **https://yochat.leogushinets.workers.dev** работал:
- Пользователи могут регистрироваться и входить
- Видят общий чат и список пользователей
- Могут писать в общий чат и создавать личные сообщения
- Админ (Leo) может банить пользователей
- Все данные сохраняются в Cloudflare D1
