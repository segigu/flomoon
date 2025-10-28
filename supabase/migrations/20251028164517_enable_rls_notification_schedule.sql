-- Enable Row Level Security for notification_schedule table
-- This table stores global notification schedule (used by Edge Functions only)

ALTER TABLE public.notification_schedule ENABLE ROW LEVEL SECURITY;

-- Policy: Only service_role can access this table
-- Edge Functions use service_role, so they can read/write
-- Regular authenticated users and anon cannot access
CREATE POLICY "service_role_only"
ON public.notification_schedule
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Explicitly deny access for authenticated and anon roles
-- (RLS default is deny, but explicit policy makes intent clear)
CREATE POLICY "deny_authenticated_anon"
ON public.notification_schedule
FOR ALL
TO authenticated, anon
USING (false)
WITH CHECK (false);

COMMENT ON TABLE public.notification_schedule IS 
'Global notification schedule table. Access restricted to service_role (Edge Functions only).';
