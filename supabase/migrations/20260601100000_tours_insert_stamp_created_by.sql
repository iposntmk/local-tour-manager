-- Fix: inserting a tour intermittently failed with
--   "new row violates row-level security policy for table \"tours\""
--
-- Root cause: the client stamped created_by_user_id from a (possibly stale)
-- cached Supabase session. When that value did not equal the DB-side
-- auth.uid() at insert time, the INSERT policy WITH CHECK failed. The previous
-- policy also allowed created_by_user_id IS NULL, which let rows be created
-- with no owner (an ownership/security hole).
--
-- Fix:
--   1. A BEFORE INSERT trigger stamps created_by_user_id = auth.uid()
--      server-side for authenticated end users, so the client can never send a
--      mismatching (or null) value. Service-role / admin scripts run with
--      auth.uid() = NULL and bypass RLS, so they keep whatever they set.
--   2. Tighten the INSERT policy to require ownership (or admin) and drop the
--      NULL escape hatch. Because the trigger runs BEFORE the WITH CHECK is
--      evaluated, an authenticated insert always satisfies the policy.

-- 1. Trigger function ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_tour_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
BEGIN
  -- Only override for real authenticated end users. Service-role/admin scripts
  -- (auth.uid() IS NULL, RLS bypassed) keep their explicit created_by_user_id.
  IF auth.uid() IS NOT NULL THEN
    NEW.created_by_user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_tour_created_by ON public.tours;
CREATE TRIGGER trg_set_tour_created_by
  BEFORE INSERT ON public.tours
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tour_created_by();

-- 2. Tighten the INSERT policy (no more NULL-owner escape hatch) ---------------
DROP POLICY IF EXISTS tours_insert ON public.tours;
CREATE POLICY tours_insert ON public.tours
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR created_by_user_id = auth.uid()
  );
