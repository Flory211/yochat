import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qgquowdgnrkclfnuekzv.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Создаем клиент Supabase
export const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
