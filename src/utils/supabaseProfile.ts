/**
 * Supabase Profile API - утилиты для работы с профилями пользователей и партнёрами
 *
 * Этот модуль предоставляет функции для:
 * - Получения и обновления профиля текущего пользователя
 * - Управления данными партнёра
 *
 * ВАЖНО: Все функции используют JWT токен для авторизации и RLS policies.
 */

import { supabase } from '../lib/supabaseClient';

/**
 * Интерфейс профиля пользователя
 */
export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  birth_date: string | null; // ISO date string
  birth_time: string | null; // HH:mm format
  birth_place: string | null;
  birth_latitude: number | null; // Широта места рождения (-90 до 90)
  birth_longitude: number | null; // Долгота места рождения (-180 до 180)
  current_latitude: number | null; // Текущая широта
  current_longitude: number | null; // Текущая долгота
  timezone: string | null;
  language_code: string | null; // User interface language (ru, en, de) - renamed from locale
  location_access_enabled: boolean; // Разрешение на использование местоположения (DEFAULT FALSE)
  cycle_tracking_enabled: boolean; // Включён ли функционал циклов (DEFAULT TRUE)
  created_at: string;
  updated_at: string;
}

/**
 * Интерфейс данных партнёра
 */
export interface Partner {
  id: string;
  user_id: string;
  name: string;
  birth_date: string | null; // ISO date string
  birth_time: string | null; // HH:mm format
  birth_place: string | null;
  birth_latitude: number | null; // Широта места рождения (-90 до 90)
  birth_longitude: number | null; // Долгота места рождения (-180 до 180)
  created_at: string;
  updated_at: string;
}

/**
 * Интерфейс для создания/обновления профиля
 */
export interface UserProfileUpdate {
  display_name: string;
  birth_date?: string | null;
  birth_time?: string | null;
  birth_place?: string | null;
  birth_latitude?: number | null;
  birth_longitude?: number | null;
  current_latitude?: number | null;
  current_longitude?: number | null;
  timezone?: string | null;
  language_code?: string | null; // User interface language (ru, en, de) - renamed from locale
  location_access_enabled?: boolean;
  cycle_tracking_enabled?: boolean;
}

/**
 * Интерфейс для создания/обновления партнёра
 */
export interface PartnerUpdate {
  name: string;
  birth_date?: string | null;
  birth_time?: string | null;
  birth_place?: string | null;
  birth_latitude?: number | null;
  birth_longitude?: number | null;
}

/**
 * Получить профиль текущего пользователя
 * @returns Профиль пользователя или null, если не найден
 */
export async function fetchUserProfile(): Promise<UserProfile | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('fetchUserProfile error:', error);
    return null;
  }
}

/**
 * Обновить профиль текущего пользователя
 * @param updates - Поля для обновления
 * @returns Обновлённый профиль или null в случае ошибки
 */
export async function updateUserProfile(updates: UserProfileUpdate): Promise<UserProfile | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('updateUserProfile error:', error);
    return null;
  }
}

/**
 * Обновить язык интерфейса пользователя
 * @param languageCode - Код языка (ru, en, de)
 * @returns true при успехе, false при ошибке
 */
export async function updateUserLanguage(languageCode: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    // Validate language code
    if (!['ru', 'en', 'de'].includes(languageCode)) {
      throw new Error(`Invalid language code: ${languageCode}`);
    }

    const { error } = await supabase
      .from('users')
      .update({
        language_code: languageCode,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      console.error('Error updating user language:', error);
      throw error;
    }

    console.log(`✅ Language updated to: ${languageCode}`);
    return true;
  } catch (error) {
    console.error('updateUserLanguage error:', error);
    return false;
  }
}

/**
 * Обновить разрешение на использование местоположения
 * @param enabled - true = разрешить доступ к местоположению, false = запретить
 * @returns true при успехе, false при ошибке
 */
export async function updateLocationAccess(enabled: boolean): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('users')
      .update({
        location_access_enabled: enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      console.error('Error updating location access:', error);
      throw error;
    }

    console.log(`✅ Location access updated to: ${enabled}`);
    return true;
  } catch (error) {
    console.error('updateLocationAccess error:', error);
    return false;
  }
}

/**
 * Обновить настройку отслеживания менструальных циклов
 * @param enabled - true = функционал циклов включён, false = выключен
 * @returns true при успехе, false при ошибке
 */
export async function updateCycleTracking(enabled: boolean): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('users')
      .update({
        cycle_tracking_enabled: enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      console.error('Error updating cycle tracking:', error);
      throw error;
    }

    console.log(`✅ Cycle tracking updated to: ${enabled}`);
    return true;
  } catch (error) {
    console.error('updateCycleTracking error:', error);
    return false;
  }
}

/**
 * Получить партнёра текущего пользователя
 * @returns Партнёр или null, если не найден
 */
export async function fetchPartner(): Promise<Partner | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('partners')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      // Если партнёр не найден - это нормально
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching partner:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('fetchPartner error:', error);
    return null;
  }
}

/**
 * Создать или обновить партнёра
 * @param partnerData - Данные партнёра
 * @returns Созданный/обновлённый партнёр или null в случае ошибки
 */
export async function upsertPartner(partnerData: PartnerUpdate): Promise<Partner | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    // Проверяем, есть ли уже партнёр
    const existingPartner = await fetchPartner();

    if (existingPartner) {
      // Обновляем существующего
      const { data, error } = await supabase
        .from('partners')
        .update({
          ...partnerData,
          partner_name: partnerData.name, // Заполняем старую колонку для совместимости
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingPartner.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating partner:', error);
        throw error;
      }

      return data;
    } else {
      // Создаём нового
      const { data, error } = await supabase
        .from('partners')
        .insert({
          user_id: user.id,
          ...partnerData,
          partner_name: partnerData.name, // Заполняем старую колонку для совместимости
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating partner:', error);
        throw error;
      }

      return data;
    }
  } catch (error) {
    console.error('upsertPartner error:', error);
    return null;
  }
}

/**
 * Удалить партнёра текущего пользователя
 * @returns true при успехе, false при ошибке
 */
export async function deletePartner(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('partners')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting partner:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('deletePartner error:', error);
    return false;
  }
}
