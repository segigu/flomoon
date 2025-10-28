-- Fix function search_path vulnerability (CVE-style attack prevention)
-- Issue: Functions without explicit search_path can be exploited by creating malicious tables
-- Solution: Set search_path = public, pg_temp for all functions
-- Ref: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

-- ====================
-- 1. update_updated_at_column
-- ====================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ====================
-- 2. handle_new_user
-- ====================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.users (id, email, created_at, updated_at)
  VALUES (NEW.id, NEW.email, now(), now());
  RETURN NEW;
END;
$$;

-- ====================
-- 3. update_partners_updated_at
-- ====================
CREATE OR REPLACE FUNCTION public.update_partners_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ====================
-- 4. update_push_subscriptions_updated_at
-- ====================
CREATE OR REPLACE FUNCTION public.update_push_subscriptions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ====================
-- 5. generate_random_cycle_time
-- ====================
CREATE OR REPLACE FUNCTION public.generate_random_cycle_time()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Generate random time between 7:00 and 21:00 Berlin (420-1260 minutes from midnight)
  RETURN 420 + floor(random() * 840)::INTEGER;
END;
$$;

-- ====================
-- 6. get_or_create_schedule
-- ====================
CREATE OR REPLACE FUNCTION public.get_or_create_schedule(p_date DATE)
RETURNS TABLE (
  schedule_date DATE,
  morning_brief_sent BOOLEAN,
  morning_brief_sent_at TIMESTAMPTZ,
  cycle_notification_target_minutes INTEGER,
  cycle_notification_sent BOOLEAN,
  cycle_notification_sent_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO public.notification_schedule (schedule_date, cycle_notification_target_minutes)
  VALUES (p_date, public.generate_random_cycle_time())
  ON CONFLICT (schedule_date) DO UPDATE
    SET schedule_date = EXCLUDED.schedule_date
  RETURNING 
    notification_schedule.schedule_date,
    notification_schedule.morning_brief_sent,
    notification_schedule.morning_brief_sent_at,
    notification_schedule.cycle_notification_target_minutes,
    notification_schedule.cycle_notification_sent,
    notification_schedule.cycle_notification_sent_at;
END;
$$;

-- ====================
-- 7. mark_morning_brief_sent
-- ====================
CREATE OR REPLACE FUNCTION public.mark_morning_brief_sent(p_date DATE)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.notification_schedule
  SET 
    morning_brief_sent = true,
    morning_brief_sent_at = now(),
    updated_at = now()
  WHERE schedule_date = p_date;
END;
$$;

-- ====================
-- 8. mark_cycle_notification_sent
-- ====================
CREATE OR REPLACE FUNCTION public.mark_cycle_notification_sent(p_date DATE)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.notification_schedule
  SET 
    cycle_notification_sent = true,
    cycle_notification_sent_at = now(),
    updated_at = now()
  WHERE schedule_date = p_date;
END;
$$;

COMMENT ON FUNCTION public.update_updated_at_column IS 
'Trigger function: Auto-update updated_at column. SECURITY: search_path set to prevent hijacking.';

COMMENT ON FUNCTION public.handle_new_user IS 
'Trigger function: Create user profile on auth.users insert. SECURITY: search_path set to prevent hijacking.';

COMMENT ON FUNCTION public.update_partners_updated_at IS 
'Trigger function: Auto-update partners.updated_at. SECURITY: search_path set to prevent hijacking.';

COMMENT ON FUNCTION public.update_push_subscriptions_updated_at IS 
'Trigger function: Auto-update push_subscriptions.updated_at. SECURITY: search_path set to prevent hijacking.';

COMMENT ON FUNCTION public.generate_random_cycle_time IS 
'Utility function: Generate random notification time (7:00-21:00 Berlin). SECURITY: search_path set.';

COMMENT ON FUNCTION public.get_or_create_schedule IS 
'Database function: Get or create daily notification schedule. SECURITY: search_path set to prevent hijacking.';

COMMENT ON FUNCTION public.mark_morning_brief_sent IS 
'Database function: Mark morning brief as sent. SECURITY: search_path set to prevent hijacking.';

COMMENT ON FUNCTION public.mark_cycle_notification_sent IS 
'Database function: Mark cycle notification as sent. SECURITY: search_path set to prevent hijacking.';
