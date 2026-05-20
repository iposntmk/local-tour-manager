-- Update RLS on tours + sub-tables so accountants can see/work on tours that
-- have been submitted (settlement_status <> 'draft'), while guides only see
-- their own tours.

-- Helper functions ----------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_tour_owner(p_tour_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tours t
    WHERE t.id = p_tour_id
      AND t.created_by_user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_tour(p_tour_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tours t
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
  );
$$;

CREATE OR REPLACE FUNCTION public.can_modify_tour(p_tour_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tours t
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
  );
$$;

-- tours ---------------------------------------------------------------------

DROP POLICY IF EXISTS tours_select_own ON public.tours;
DROP POLICY IF EXISTS tours_insert_own ON public.tours;
DROP POLICY IF EXISTS tours_update_own ON public.tours;
DROP POLICY IF EXISTS tours_delete_own ON public.tours;

CREATE POLICY tours_select ON public.tours
  FOR SELECT TO authenticated
  USING (
    created_by_user_id = auth.uid()
    OR (
      settlement_status <> 'draft'
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
  );

CREATE POLICY tours_insert ON public.tours
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by_user_id = auth.uid()
    OR created_by_user_id IS NULL
  );

CREATE POLICY tours_update ON public.tours
  FOR UPDATE TO authenticated
  USING (
    created_by_user_id = auth.uid()
    OR public.check_user_permission(
      auth.uid(),
      ARRAY[
        'approve_settlement',
        'review_settlement_line',
        'reopen_settlement'
      ]
    )
  )
  WITH CHECK (
    created_by_user_id = auth.uid()
    OR public.check_user_permission(
      auth.uid(),
      ARRAY[
        'approve_settlement',
        'review_settlement_line',
        'reopen_settlement'
      ]
    )
  );

CREATE POLICY tours_delete ON public.tours
  FOR DELETE TO authenticated
  USING (created_by_user_id = auth.uid());

-- Generic helper macro via inline policies on each sub-table ----------------

-- tour_destinations
DROP POLICY IF EXISTS tour_destinations_select ON public.tour_destinations;
DROP POLICY IF EXISTS tour_destinations_insert ON public.tour_destinations;
DROP POLICY IF EXISTS tour_destinations_update ON public.tour_destinations;
DROP POLICY IF EXISTS tour_destinations_delete ON public.tour_destinations;

CREATE POLICY tour_destinations_select ON public.tour_destinations
  FOR SELECT TO authenticated
  USING (public.can_view_tour(tour_id));

CREATE POLICY tour_destinations_insert ON public.tour_destinations
  FOR INSERT TO authenticated
  WITH CHECK (public.is_tour_owner(tour_id));

CREATE POLICY tour_destinations_update ON public.tour_destinations
  FOR UPDATE TO authenticated
  USING (public.can_modify_tour(tour_id))
  WITH CHECK (public.can_modify_tour(tour_id));

CREATE POLICY tour_destinations_delete ON public.tour_destinations
  FOR DELETE TO authenticated
  USING (public.is_tour_owner(tour_id));

-- tour_expenses
DROP POLICY IF EXISTS tour_expenses_select ON public.tour_expenses;
DROP POLICY IF EXISTS tour_expenses_insert ON public.tour_expenses;
DROP POLICY IF EXISTS tour_expenses_update ON public.tour_expenses;
DROP POLICY IF EXISTS tour_expenses_delete ON public.tour_expenses;

CREATE POLICY tour_expenses_select ON public.tour_expenses
  FOR SELECT TO authenticated
  USING (public.can_view_tour(tour_id));

CREATE POLICY tour_expenses_insert ON public.tour_expenses
  FOR INSERT TO authenticated
  WITH CHECK (public.is_tour_owner(tour_id));

CREATE POLICY tour_expenses_update ON public.tour_expenses
  FOR UPDATE TO authenticated
  USING (public.can_modify_tour(tour_id))
  WITH CHECK (public.can_modify_tour(tour_id));

CREATE POLICY tour_expenses_delete ON public.tour_expenses
  FOR DELETE TO authenticated
  USING (public.is_tour_owner(tour_id));

-- tour_meals
DROP POLICY IF EXISTS tour_meals_select ON public.tour_meals;
DROP POLICY IF EXISTS tour_meals_insert ON public.tour_meals;
DROP POLICY IF EXISTS tour_meals_update ON public.tour_meals;
DROP POLICY IF EXISTS tour_meals_delete ON public.tour_meals;

CREATE POLICY tour_meals_select ON public.tour_meals
  FOR SELECT TO authenticated
  USING (public.can_view_tour(tour_id));

CREATE POLICY tour_meals_insert ON public.tour_meals
  FOR INSERT TO authenticated
  WITH CHECK (public.is_tour_owner(tour_id));

CREATE POLICY tour_meals_update ON public.tour_meals
  FOR UPDATE TO authenticated
  USING (public.can_modify_tour(tour_id))
  WITH CHECK (public.can_modify_tour(tour_id));

CREATE POLICY tour_meals_delete ON public.tour_meals
  FOR DELETE TO authenticated
  USING (public.is_tour_owner(tour_id));

-- tour_allowances
DROP POLICY IF EXISTS tour_allowances_select ON public.tour_allowances;
DROP POLICY IF EXISTS tour_allowances_insert ON public.tour_allowances;
DROP POLICY IF EXISTS tour_allowances_update ON public.tour_allowances;
DROP POLICY IF EXISTS tour_allowances_delete ON public.tour_allowances;

CREATE POLICY tour_allowances_select ON public.tour_allowances
  FOR SELECT TO authenticated
  USING (public.can_view_tour(tour_id));

CREATE POLICY tour_allowances_insert ON public.tour_allowances
  FOR INSERT TO authenticated
  WITH CHECK (public.is_tour_owner(tour_id));

CREATE POLICY tour_allowances_update ON public.tour_allowances
  FOR UPDATE TO authenticated
  USING (public.can_modify_tour(tour_id))
  WITH CHECK (public.can_modify_tour(tour_id));

CREATE POLICY tour_allowances_delete ON public.tour_allowances
  FOR DELETE TO authenticated
  USING (public.is_tour_owner(tour_id));

-- tour_shoppings
DROP POLICY IF EXISTS tour_shoppings_select ON public.tour_shoppings;
DROP POLICY IF EXISTS tour_shoppings_insert ON public.tour_shoppings;
DROP POLICY IF EXISTS tour_shoppings_update ON public.tour_shoppings;
DROP POLICY IF EXISTS tour_shoppings_delete ON public.tour_shoppings;

CREATE POLICY tour_shoppings_select ON public.tour_shoppings
  FOR SELECT TO authenticated
  USING (public.can_view_tour(tour_id));

CREATE POLICY tour_shoppings_insert ON public.tour_shoppings
  FOR INSERT TO authenticated
  WITH CHECK (public.is_tour_owner(tour_id));

CREATE POLICY tour_shoppings_update ON public.tour_shoppings
  FOR UPDATE TO authenticated
  USING (public.can_modify_tour(tour_id))
  WITH CHECK (public.can_modify_tour(tour_id));

CREATE POLICY tour_shoppings_delete ON public.tour_shoppings
  FOR DELETE TO authenticated
  USING (public.is_tour_owner(tour_id));

-- tour_images: accountants view only; owner can full CRUD
DROP POLICY IF EXISTS tour_images_select ON public.tour_images;
DROP POLICY IF EXISTS tour_images_insert ON public.tour_images;
DROP POLICY IF EXISTS tour_images_update ON public.tour_images;
DROP POLICY IF EXISTS tour_images_delete ON public.tour_images;

CREATE POLICY tour_images_select ON public.tour_images
  FOR SELECT TO authenticated
  USING (public.can_view_tour(tour_id));

CREATE POLICY tour_images_insert ON public.tour_images
  FOR INSERT TO authenticated
  WITH CHECK (public.is_tour_owner(tour_id));

CREATE POLICY tour_images_update ON public.tour_images
  FOR UPDATE TO authenticated
  USING (public.is_tour_owner(tour_id))
  WITH CHECK (public.is_tour_owner(tour_id));

CREATE POLICY tour_images_delete ON public.tour_images
  FOR DELETE TO authenticated
  USING (public.is_tour_owner(tour_id));
