-- Admins must have full access to every tour and every tour-owned child row.
CREATE OR REPLACE FUNCTION public.is_tour_owner(p_tour_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
  SELECT p_tour_id IS NOT NULL
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1
        FROM public.tours t
        WHERE t.id = p_tour_id
          AND t.created_by_user_id = auth.uid()
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.can_view_tour(p_tour_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
  SELECT p_tour_id IS NOT NULL
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1
        FROM public.tours t
        WHERE t.id = p_tour_id
          AND (
            t.created_by_user_id = auth.uid()
            OR (
              t.settlement_status <> 'draft'
              AND public.check_user_permission(
                auth.uid(),
                ARRAY[
                  'approve_settlement',
                  'review_settlement_line',
                  'reopen_settlement',
                  'mark_tour_paid'
                ]
              )
            )
          )
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.can_modify_tour(p_tour_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
  SELECT p_tour_id IS NOT NULL
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1
        FROM public.tours t
        WHERE t.id = p_tour_id
          AND (
            t.created_by_user_id = auth.uid()
            OR public.check_user_permission(
              auth.uid(),
              ARRAY[
                'approve_settlement',
                'review_settlement_line',
                'reopen_settlement'
              ]
            )
          )
      )
    );
$$;

DROP POLICY IF EXISTS tours_select ON public.tours;
CREATE POLICY tours_select ON public.tours
  FOR SELECT TO authenticated
  USING (public.can_view_tour(id));

DROP POLICY IF EXISTS tours_update ON public.tours;
CREATE POLICY tours_update ON public.tours
  FOR UPDATE TO authenticated
  USING (public.can_modify_tour(id))
  WITH CHECK (public.can_modify_tour(id));

DROP POLICY IF EXISTS tours_delete ON public.tours;
CREATE POLICY tours_delete ON public.tours
  FOR DELETE TO authenticated
  USING (public.is_admin() OR created_by_user_id = auth.uid());
