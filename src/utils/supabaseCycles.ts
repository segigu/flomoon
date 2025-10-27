/**
 * API утилиты для работы с циклами через Supabase
 */

import { supabase } from '../lib/supabaseClient';

/**
 * Интерфейс цикла в Supabase БД
 */
export interface Cycle {
  id: string;
  user_id: string;
  start_date: string; // ISO date string (YYYY-MM-DD)
  end_date: string | null; // ISO date string or null
  cycle_length: number | null;
  period_length: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * Интерфейс для создания нового цикла
 */
export interface CycleInsert {
  start_date: string; // ISO date string (YYYY-MM-DD)
  end_date?: string | null;
  cycle_length?: number | null;
  period_length?: number | null;
}

/**
 * Интерфейс для обновления цикла
 */
export interface CycleUpdate {
  start_date?: string;
  end_date?: string | null;
  cycle_length?: number | null;
  period_length?: number | null;
}

/**
 * Получить все циклы текущего пользователя
 * @returns Массив циклов, отсортированных по start_date (DESC)
 */
export async function fetchCycles(): Promise<Cycle[]> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Пользователь не авторизован');
  }

  const { data, error } = await supabase
    .from('cycles')
    .select('*')
    .eq('user_id', user.id)
    .order('start_date', { ascending: false });

  if (error) {
    console.error('Error fetching cycles:', error);
    throw new Error(`Ошибка загрузки циклов: ${error.message}`);
  }

  return data || [];
}

/**
 * Создать новый цикл
 * @param cycleData - данные нового цикла
 * @returns Созданный цикл
 */
export async function createCycle(cycleData: CycleInsert): Promise<Cycle> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Пользователь не авторизован');
  }

  const { data, error } = await supabase
    .from('cycles')
    .insert({
      user_id: user.id,
      ...cycleData,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating cycle:', error);
    throw new Error(`Ошибка создания цикла: ${error.message}`);
  }

  if (!data) {
    throw new Error('Не удалось создать цикл');
  }

  return data;
}

/**
 * Обновить существующий цикл
 * @param cycleId - ID цикла
 * @param updates - обновляемые поля
 * @returns Обновлённый цикл
 */
export async function updateCycle(cycleId: string, updates: CycleUpdate): Promise<Cycle> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Пользователь не авторизован');
  }

  const { data, error } = await supabase
    .from('cycles')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', cycleId)
    .eq('user_id', user.id) // RLS: только владелец может обновлять
    .select()
    .single();

  if (error) {
    console.error('Error updating cycle:', error);
    throw new Error(`Ошибка обновления цикла: ${error.message}`);
  }

  if (!data) {
    throw new Error('Цикл не найден или недостаточно прав');
  }

  return data;
}

/**
 * Удалить цикл
 * @param cycleId - ID цикла
 * @returns true если удалён успешно
 */
export async function deleteCycle(cycleId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Пользователь не авторизован');
  }

  const { error } = await supabase
    .from('cycles')
    .delete()
    .eq('id', cycleId)
    .eq('user_id', user.id); // RLS: только владелец может удалять

  if (error) {
    console.error('Error deleting cycle:', error);
    throw new Error(`Ошибка удаления цикла: ${error.message}`);
  }

  return true;
}

/**
 * Получить один цикл по ID
 * @param cycleId - ID цикла
 * @returns Цикл или null
 */
export async function fetchCycleById(cycleId: string): Promise<Cycle | null> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Пользователь не авторизован');
  }

  const { data, error } = await supabase
    .from('cycles')
    .select('*')
    .eq('id', cycleId)
    .eq('user_id', user.id)
    .single();

  if (error) {
    console.error('Error fetching cycle:', error);
    return null;
  }

  return data;
}

/**
 * Вспомогательная функция: конвертировать Date в ISO date string (YYYY-MM-DD)
 * @param date - Date объект
 * @returns ISO date string
 */
export function dateToISOString(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Вспомогательная функция: конвертировать ISO date string в Date
 * @param isoString - ISO date string (YYYY-MM-DD)
 * @returns Date объект (в локальном timezone, без смещения UTC)
 */
export function isoStringToDate(isoString: string): Date {
  // Парсим как ЛОКАЛЬНУЮ дату, чтобы избежать проблем с timezone
  const [year, month, day] = isoString.split('-').map(Number);
  return new Date(year, month - 1, day);
}
