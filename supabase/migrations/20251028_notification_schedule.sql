-- Migration: Create notification_schedule table
-- Date: 2025-10-28
-- Description: Stores daily notification schedule (when to send morning brief and cycle notifications)

CREATE TABLE IF NOT EXISTS public.notification_schedule (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_date DATE NOT NULL UNIQUE,

  -- Morning brief timing (fixed: 06:45 Berlin time)
  morning_brief_sent BOOLEAN DEFAULT false NOT NULL,
  morning_brief_sent_at TIMESTAMPTZ,

  -- Cycle notification timing (random: 07:00-21:00 Berlin time)
  cycle_notification_target_minutes INTEGER NOT NULL, -- Minutes from midnight Berlin time (420-1260)
  cycle_notification_sent BOOLEAN DEFAULT false NOT NULL,
  cycle_notification_sent_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create index for fast lookups by date
CREATE INDEX idx_notification_schedule_date ON public.notification_schedule(schedule_date);

-- Grant permissions (service role only, no RLS needed)
GRANT SELECT, INSERT, UPDATE ON public.notification_schedule TO service_role;

-- Function to generate random cycle notification time (7:00-21:00 Berlin = 420-1260 minutes)
CREATE OR REPLACE FUNCTION generate_random_cycle_time()
RETURNS INTEGER AS $$
BEGIN
  RETURN 420 + floor(random() * (1260 - 420 + 1))::integer; -- 420-1260 minutes
END;
$$ LANGUAGE plpgsql;

-- Function to get or create today's schedule
CREATE OR REPLACE FUNCTION get_or_create_schedule(p_date DATE)
RETURNS TABLE (
  schedule_date DATE,
  morning_brief_sent BOOLEAN,
  morning_brief_sent_at TIMESTAMPTZ,
  cycle_notification_target_minutes INTEGER,
  cycle_notification_sent BOOLEAN,
  cycle_notification_sent_at TIMESTAMPTZ
) AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  -- Check if schedule exists
  SELECT EXISTS(SELECT 1 FROM notification_schedule WHERE notification_schedule.schedule_date = p_date)
  INTO v_exists;

  -- Create if not exists
  IF NOT v_exists THEN
    INSERT INTO notification_schedule (schedule_date, cycle_notification_target_minutes)
    VALUES (p_date, generate_random_cycle_time());
  END IF;

  -- Return schedule
  RETURN QUERY
  SELECT
    ns.schedule_date,
    ns.morning_brief_sent,
    ns.morning_brief_sent_at,
    ns.cycle_notification_target_minutes,
    ns.cycle_notification_sent,
    ns.cycle_notification_sent_at
  FROM notification_schedule ns
  WHERE ns.schedule_date = p_date;
END;
$$ LANGUAGE plpgsql;

-- Function to mark morning brief as sent
CREATE OR REPLACE FUNCTION mark_morning_brief_sent(p_date DATE)
RETURNS void AS $$
BEGIN
  UPDATE notification_schedule
  SET
    morning_brief_sent = true,
    morning_brief_sent_at = now(),
    updated_at = now()
  WHERE schedule_date = p_date;
END;
$$ LANGUAGE plpgsql;

-- Function to mark cycle notification as sent
CREATE OR REPLACE FUNCTION mark_cycle_notification_sent(p_date DATE)
RETURNS void AS $$
BEGIN
  UPDATE notification_schedule
  SET
    cycle_notification_sent = true,
    cycle_notification_sent_at = now(),
    updated_at = now()
  WHERE schedule_date = p_date;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE public.notification_schedule IS 'Daily notification schedule with random timing for cycle notifications';
COMMENT ON COLUMN public.notification_schedule.morning_brief_sent IS 'Whether morning brief was sent today (06:45 Berlin)';
COMMENT ON COLUMN public.notification_schedule.cycle_notification_target_minutes IS 'Random target time in minutes from midnight Berlin (420-1260 = 07:00-21:00)';
COMMENT ON COLUMN public.notification_schedule.cycle_notification_sent IS 'Whether cycle notification was sent today';
