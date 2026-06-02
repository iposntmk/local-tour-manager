-- INSERT ... RETURNING on tours also checks the SELECT policy.
-- Avoid self-querying tours from its own SELECT policy so new rows can return.

CREATE OR REPLACE FUNCTION public.is_guide_user(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = p_user_id
      AND status = 'active'
      AND settlement_role = 'guide'
  );
$$;

DROP POLICY IF EXISTS tours_select ON public.tours;
CREATE POLICY tours_select ON public.tours
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR (
      public.is_active_user()
      AND (
        (public.is_guide_user(auth.uid()) AND guide_id = auth.uid())
        OR (
          NOT public.is_guide_user(auth.uid())
          AND public.check_user_permission(auth.uid(), ARRAY['edit_tours'])
        )
        OR (
          settlement_status <> 'draft'
          AND public.check_user_permission(
            auth.uid(),
            ARRAY['approve_settlement','review_settlement_line','reopen_settlement','mark_tour_paid']
          )
        )
      )
    )
  );
