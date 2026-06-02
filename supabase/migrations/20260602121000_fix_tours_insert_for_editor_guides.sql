-- Fix tour creation for editor + guide users.
-- The insert policy must use app permissions, not only implicit ownership.

CREATE OR REPLACE FUNCTION public.set_tour_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
BEGIN
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

DROP POLICY IF EXISTS tours_insert ON public.tours;
CREATE POLICY tours_insert ON public.tours
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (
      public.is_active_user()
      AND public.check_user_permission(auth.uid(), ARRAY['create_tours'])
      AND (
        guide_id = auth.uid()
        OR public.check_user_permission(auth.uid(), ARRAY['edit_tours'])
      )
    )
  );
