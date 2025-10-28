-- Add missing indexes on foreign key columns for better query performance
-- Issue: Foreign keys without covering indexes can cause slow queries
-- Ref: https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys

-- Index for horoscope_memory.user_id (foreign key to users.id)
CREATE INDEX IF NOT EXISTS idx_horoscope_memory_user_id 
ON public.horoscope_memory(user_id);

-- Index for partners.user_id (foreign key to users.id)
CREATE INDEX IF NOT EXISTS idx_partners_user_id 
ON public.partners(user_id);

COMMENT ON INDEX idx_horoscope_memory_user_id IS 
'Performance: Foreign key index for horoscope_memory.user_id -> users.id';

COMMENT ON INDEX idx_partners_user_id IS 
'Performance: Foreign key index for partners.user_id -> users.id';

-- Note: Other "unused" indexes reported by Supabase Advisor are kept intentionally:
-- - idx_users_astro_profile: Will be used when querying by astro_profile_id
-- - idx_cycles_start_date: Will be used for date range queries
-- - idx_horoscope_memory_language: Will be used for language filtering
-- - idx_psychological_profiles_language: Will be used for language filtering
-- - idx_push_subscriptions_user_id: Already exists, will be used by RLS policies at scale
-- These indexes are not used yet because the database is new with minimal data.
-- They will become useful as the dataset grows.
