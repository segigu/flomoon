-- Optimize RLS policies to avoid re-evaluation of auth.uid() for each row
-- Issue: auth.uid() is called for every row, causing performance degradation at scale
-- Solution: Wrap auth.uid() in subquery: (select auth.uid())
-- Ref: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- ====================
-- Table: users
-- ====================

DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile"
ON public.users
FOR SELECT
TO authenticated
USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
ON public.users
FOR UPDATE
TO authenticated
USING ((select auth.uid()) = id)
WITH CHECK ((select auth.uid()) = id);

-- ====================
-- Table: cycles
-- ====================

DROP POLICY IF EXISTS "Users can manage own cycles" ON public.cycles;
CREATE POLICY "Users can manage own cycles"
ON public.cycles
FOR ALL
TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- ====================
-- Table: partners
-- ====================

DROP POLICY IF EXISTS "Users can manage own partners" ON public.partners;
CREATE POLICY "Users can manage own partners"
ON public.partners
FOR ALL
TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- ====================
-- Table: horoscope_memory
-- ====================

DROP POLICY IF EXISTS "Users can manage own horoscope memory" ON public.horoscope_memory;
CREATE POLICY "Users can manage own horoscope memory"
ON public.horoscope_memory
FOR ALL
TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- ====================
-- Table: psychological_profiles
-- ====================

DROP POLICY IF EXISTS "Users can manage own psych profile" ON public.psychological_profiles;
CREATE POLICY "Users can manage own psych profile"
ON public.psychological_profiles
FOR ALL
TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- ====================
-- Table: push_subscriptions
-- ====================

DROP POLICY IF EXISTS "Users can view own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can view own push subscriptions"
ON public.push_subscriptions
FOR SELECT
TO authenticated
USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can create own push subscriptions"
ON public.push_subscriptions
FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can update own push subscriptions"
ON public.push_subscriptions
FOR UPDATE
TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can delete own push subscriptions"
ON public.push_subscriptions
FOR DELETE
TO authenticated
USING ((select auth.uid()) = user_id);

COMMENT ON TABLE public.users IS 
'User profiles with optimized RLS policies (auth.uid subquery pattern).';

COMMENT ON TABLE public.cycles IS 
'Menstrual cycles with optimized RLS policies (auth.uid subquery pattern).';

COMMENT ON TABLE public.partners IS 
'Partner profiles with optimized RLS policies (auth.uid subquery pattern).';

COMMENT ON TABLE public.horoscope_memory IS 
'Horoscope memory with optimized RLS policies (auth.uid subquery pattern).';

COMMENT ON TABLE public.psychological_profiles IS 
'Psychological profiles with optimized RLS policies (auth.uid subquery pattern).';

COMMENT ON TABLE public.push_subscriptions IS 
'Push subscriptions with optimized RLS policies (auth.uid subquery pattern).';
