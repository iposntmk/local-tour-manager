-- Admin must see, edit, and delete ALL tours regardless of creator or status.
-- Rewrite all 4 tour policies to add OR public.is_admin() as the first condition.

-- SELECT
DROP POLICY IF EXISTS tours_select ON public.tours;
CREATE POLICY tours_select ON public.tours
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR created_by_user_id = auth.uid()
    OR (
      settlement_status <> 'draft'
      AND check_user_permission(auth.uid(), ARRAY[
        'approve_settlement', 'review_settlement_line',
        'reopen_settlement', 'mark_tour_paid'
      ])
    )
  );

-- INSERT
DROP POLICY IF EXISTS tours_insert ON public.tours;
CREATE POLICY tours_insert ON public.tours
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR created_by_user_id = auth.uid()
    OR created_by_user_id IS NULL
  );

-- UPDATE
DROP POLICY IF EXISTS tours_update ON public.tours;
CREATE POLICY tours_update ON public.tours
  FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR created_by_user_id = auth.uid()
    OR check_user_permission(auth.uid(), ARRAY[
      'approve_settlement', 'review_settlement_line', 'reopen_settlement'
    ])
  )
  WITH CHECK (
    public.is_admin()
    OR created_by_user_id = auth.uid()
    OR check_user_permission(auth.uid(), ARRAY[
      'approve_settlement', 'review_settlement_line', 'reopen_settlement'
    ])
  );

-- DELETE
DROP POLICY IF EXISTS tours_delete ON public.tours;
CREATE POLICY tours_delete ON public.tours
  FOR DELETE TO authenticated
  USING (
    public.is_admin()
    OR created_by_user_id = auth.uid()
  );
