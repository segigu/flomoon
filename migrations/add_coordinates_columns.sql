-- Миграция: Добавление полей для координат в таблицы users и partners
-- Дата: 2025-01-27
-- Назначение: Хранение географических координат для астрологических расчётов

-- ========================================
-- 1. Добавляем координаты места рождения в таблицу users
-- ========================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS birth_latitude DECIMAL(9, 6),
  ADD COLUMN IF NOT EXISTS birth_longitude DECIMAL(9, 6);

COMMENT ON COLUMN users.birth_latitude IS 'Широта места рождения (-90 до 90)';
COMMENT ON COLUMN users.birth_longitude IS 'Долгота места рождения (-180 до 180)';

-- ========================================
-- 2. Добавляем текущие координаты в таблицу users
-- ========================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS current_latitude DECIMAL(9, 6),
  ADD COLUMN IF NOT EXISTS current_longitude DECIMAL(9, 6);

COMMENT ON COLUMN users.current_latitude IS 'Текущая широта (для расчётов "здесь и сейчас")';
COMMENT ON COLUMN users.current_longitude IS 'Текущая долгота (для расчётов "здесь и сейчас")';

-- ========================================
-- 3. Добавляем координаты места рождения в таблицу partners
-- ========================================

ALTER TABLE partners
  ADD COLUMN IF NOT EXISTS birth_latitude DECIMAL(9, 6),
  ADD COLUMN IF NOT EXISTS birth_longitude DECIMAL(9, 6);

COMMENT ON COLUMN partners.birth_latitude IS 'Широта места рождения партнёра (-90 до 90)';
COMMENT ON COLUMN partners.birth_longitude IS 'Долгота места рождения партнёра (-180 до 180)';

-- ========================================
-- 4. Проверка результата
-- ========================================

-- Проверить структуру таблицы users
SELECT column_name, data_type, numeric_precision, numeric_scale
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('birth_latitude', 'birth_longitude', 'current_latitude', 'current_longitude');

-- Проверить структуру таблицы partners
SELECT column_name, data_type, numeric_precision, numeric_scale
FROM information_schema.columns
WHERE table_name = 'partners'
  AND column_name IN ('birth_latitude', 'birth_longitude');

-- ========================================
-- ПРИМЕЧАНИЯ
-- ========================================

-- DECIMAL(9, 6) означает:
--   - Всего 9 цифр
--   - 6 цифр после запятой
--   - Примеры: 55.755800, -123.456789
--
-- Диапазоны:
--   - Широта (latitude):  от -90 до 90
--   - Долгота (longitude): от -180 до 180
--
-- Точность 6 знаков после запятой ≈ 0.11 метра (достаточно для астрологии)
--
-- Координаты опциональны (NULL разрешён) - не все пользователи укажут место рождения

-- ========================================
-- ОТКАТ МИГРАЦИИ (если нужно)
-- ========================================

-- ALTER TABLE users DROP COLUMN IF EXISTS birth_latitude;
-- ALTER TABLE users DROP COLUMN IF EXISTS birth_longitude;
-- ALTER TABLE users DROP COLUMN IF EXISTS current_latitude;
-- ALTER TABLE users DROP COLUMN IF EXISTS current_longitude;
-- ALTER TABLE partners DROP COLUMN IF EXISTS birth_latitude;
-- ALTER TABLE partners DROP COLUMN IF EXISTS birth_longitude;
