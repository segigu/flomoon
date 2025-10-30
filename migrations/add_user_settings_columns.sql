-- Миграция: Добавление полей для настроек приватности пользователя
-- Дата: 2025-10-31
-- Назначение: Privacy-first подход - пользователь контролирует доступ к местоположению и функционалу циклов
-- Связано: TASK-013 (Adaptive Horoscope Prompts)

-- ========================================
-- 1. Добавляем настройки приватности в таблицу users
-- ========================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS location_access_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cycle_tracking_enabled BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN users.location_access_enabled IS 'Разрешение на использование местоположения для погоды/гороскопов (DEFAULT FALSE - privacy-first)';
COMMENT ON COLUMN users.cycle_tracking_enabled IS 'Включен ли функционал отслеживания менструальных циклов (DEFAULT TRUE - основная фича приложения)';

-- ========================================
-- 2. Проверка результата
-- ========================================

-- Проверить структуру таблицы users
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('location_access_enabled', 'cycle_tracking_enabled');

-- ========================================
-- ПРИМЕЧАНИЯ
-- ========================================

-- location_access_enabled (DEFAULT FALSE):
--   - Пользователь ДОЛЖЕН явно разрешить доступ к местоположению
--   - Если FALSE: погода НЕ запрашивается, координаты НЕ используются в гороскопах
--   - Если TRUE: используется current_latitude/current_longitude для запроса погоды
--   - Privacy-first: по умолчанию ВЫКЛЮЧЕНО
--
-- cycle_tracking_enabled (DEFAULT TRUE):
--   - Пользователь может отключить функционал отслеживания циклов
--   - Если FALSE: вкладка "Циклы" скрыта, фазы цикла НЕ упоминаются в гороскопах
--   - Если TRUE: стандартный функционал приложения работает
--   - DEFAULT TRUE для обратной совместимости (основная фича приложения)
--
-- Использование в коде:
--   - hasLocationAccess(userProfile) - проверка доступа к местоположению
--   - getUserCoordinates(userProfile) - получение координат (null если доступ запрещён)
--   - isCycleTrackingEnabled(userProfile) - проверка функционала циклов
--
-- Хелперы: src/utils/userContext.ts (TASK-015)

-- ========================================
-- ОТКАТ МИГРАЦИИ (если нужно)
-- ========================================

-- ALTER TABLE users DROP COLUMN IF EXISTS location_access_enabled;
-- ALTER TABLE users DROP COLUMN IF EXISTS cycle_tracking_enabled;
