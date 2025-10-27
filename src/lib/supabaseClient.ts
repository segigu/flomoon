/**
 * Supabase Client Configuration
 *
 * Инициализирует клиент Supabase для взаимодействия с БД.
 * Использует anon key для клиентских запросов (безопасно для браузера).
 *
 * RLS (Row Level Security) policies гарантируют, что пользователи видят только свои данные.
 */

import { createClient } from '@supabase/supabase-js';

// Проверяем наличие обязательных переменных окружения
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check .env.local file:\n' +
    '- REACT_APP_SUPABASE_URL\n' +
    '- REACT_APP_SUPABASE_ANON_KEY'
  );
}

/**
 * Supabase клиент (singleton)
 *
 * Auth: Email + Password (Email confirmation отключено для MVP)
 * RLS: Включен для всех таблиц (users, cycles, partners, horoscope_memory, psychological_profiles)
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Автоматически сохранять сессию в localStorage
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

/**
 * Хелпер для проверки состояния авторизации
 */
export const isAuthenticated = async (): Promise<boolean> => {
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
};

/**
 * Хелпер для получения текущего пользователя
 */
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

/**
 * Хелпер для выхода из аккаунта
 */
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};
