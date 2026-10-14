import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const databaseUrl = process.env.DATABASE_URL || '';

// Клиент для браузера (с анонимным ключом)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Клиент для сервера (с полным доступом)
export const supabaseAdmin = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Экспорт URL базы данных для прямого подключения
export { databaseUrl };
