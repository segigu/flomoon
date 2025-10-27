-- ============================================================================
-- Migration: Add language support to all relevant tables
-- Date: 2025-10-27
-- Phase: 2.5 (Internationalization)
-- ============================================================================
-- This migration adds language_code field to enable i18n support across
-- the application. Users can choose their preferred interface language
-- (ru, en, de), and AI-generated content will be generated in that language.
--
-- Changes:
-- 1. Rename users.locale → users.language_code (better naming convention)
-- 2. Add language to horoscope_memory (track language of generated content)
-- 3. Add language to psychological_profiles (track language of AI analysis)
-- ============================================================================

-- Step 1: Rename users.locale to users.language_code
-- This provides clearer semantics for interface language selection
ALTER TABLE public.users
  RENAME COLUMN locale TO language_code;

-- Update default value for new users
ALTER TABLE public.users
  ALTER COLUMN language_code SET DEFAULT 'ru';

-- Add CHECK constraint to ensure only supported languages
ALTER TABLE public.users
  ADD CONSTRAINT users_language_code_check
  CHECK (language_code IN ('ru', 'en', 'de'));

-- Add comment
COMMENT ON COLUMN public.users.language_code IS 'User interface language code (ru, en, de)';

-- ============================================================================

-- Step 2: Add language to horoscope_memory
-- This tracks which language the horoscope was generated in
ALTER TABLE public.horoscope_memory
  ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT 'ru' NOT NULL;

-- Add CHECK constraint
ALTER TABLE public.horoscope_memory
  ADD CONSTRAINT horoscope_memory_language_check
  CHECK (language IN ('ru', 'en', 'de'));

-- Add index for filtering by language
CREATE INDEX IF NOT EXISTS idx_horoscope_memory_language
  ON public.horoscope_memory(language);

-- Add comment
COMMENT ON COLUMN public.horoscope_memory.language IS 'Language of generated horoscope content (ru, en, de)';

-- ============================================================================

-- Step 3: Add language to psychological_profiles
-- This tracks which language the psychological analysis was done in
ALTER TABLE public.psychological_profiles
  ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT 'ru' NOT NULL;

-- Add CHECK constraint
ALTER TABLE public.psychological_profiles
  ADD CONSTRAINT psychological_profiles_language_check
  CHECK (language IN ('ru', 'en', 'de'));

-- Add index for filtering by language
CREATE INDEX IF NOT EXISTS idx_psychological_profiles_language
  ON public.psychological_profiles(language);

-- Add comment
COMMENT ON COLUMN public.psychological_profiles.language IS 'Language of psychological profile analysis (ru, en, de)';

-- ============================================================================

-- Verification queries (run manually after migration):
-- SELECT language_code, COUNT(*) FROM public.users GROUP BY language_code;
-- SELECT language, COUNT(*) FROM public.horoscope_memory GROUP BY language;
-- SELECT language, COUNT(*) FROM public.psychological_profiles GROUP BY language;

-- ============================================================================
-- Rollback (if needed):
-- ============================================================================
-- ALTER TABLE public.users RENAME COLUMN language_code TO locale;
-- ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_language_code_check;
-- ALTER TABLE public.horoscope_memory DROP COLUMN IF EXISTS language;
-- ALTER TABLE public.horoscope_memory DROP CONSTRAINT IF EXISTS horoscope_memory_language_check;
-- DROP INDEX IF EXISTS idx_horoscope_memory_language;
-- ALTER TABLE public.psychological_profiles DROP COLUMN IF EXISTS language;
-- ALTER TABLE public.psychological_profiles DROP CONSTRAINT IF EXISTS psychological_profiles_language_check;
-- DROP INDEX IF EXISTS idx_psychological_profiles_language;
-- ============================================================================
