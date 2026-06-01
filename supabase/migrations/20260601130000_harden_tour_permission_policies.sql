-- Close remaining permission gaps around tour-owned rows and storage objects.

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = auth.uid()
      AND status = 'active'
  );
$$;

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
      OR (
        public.is_active_user()
        AND EXISTS (
          SELECT 1
          FROM public.tours t
          WHERE t.id = p_tour_id
            AND t.created_by_user_id = auth.uid()
        )
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
            (public.is_active_user() AND t.created_by_user_id = auth.uid())
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
            (public.is_active_user() AND t.created_by_user_id = auth.uid())
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

DROP POLICY IF EXISTS tours_insert ON public.tours;
CREATE POLICY tours_insert ON public.tours
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (public.is_active_user() AND created_by_user_id = auth.uid())
  );

DROP POLICY IF EXISTS tours_delete ON public.tours;
CREATE POLICY tours_delete ON public.tours
  FOR DELETE TO authenticated
  USING (
    public.is_admin()
    OR (public.is_active_user() AND created_by_user_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION public.storage_path_tour_id(p_name text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  first_segment text;
BEGIN
  first_segment := split_part(COALESCE(p_name, ''), '/', 1);
  IF first_segment = '' THEN
    RETURN NULL;
  END IF;

  RETURN first_segment::uuid;
EXCEPTION
  WHEN invalid_text_representation THEN
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_view_tour_image_object(p_name text)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
  SELECT public.can_view_tour(public.storage_path_tour_id(p_name))
    OR EXISTS (
      SELECT 1
      FROM public.tour_images ti
      WHERE ti.storage_path = p_name
        AND public.can_view_tour(ti.tour_id)
    );
$$;

CREATE OR REPLACE FUNCTION public.can_modify_tour_image_object(p_name text)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
  SELECT public.is_tour_owner(public.storage_path_tour_id(p_name))
    OR EXISTS (
      SELECT 1
      FROM public.tour_images ti
      WHERE ti.storage_path = p_name
        AND public.is_tour_owner(ti.tour_id)
    );
$$;

UPDATE storage.buckets
SET public = false
WHERE id IN ('tour-images', 'tour-line-attachments');

DROP POLICY IF EXISTS "Anyone can view tour images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload tour images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update tour images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete tour images" ON storage.objects;
DROP POLICY IF EXISTS tour_images_storage_select ON storage.objects;
DROP POLICY IF EXISTS tour_images_storage_insert ON storage.objects;
DROP POLICY IF EXISTS tour_images_storage_update ON storage.objects;
DROP POLICY IF EXISTS tour_images_storage_delete ON storage.objects;

CREATE POLICY tour_images_storage_select
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'tour-images' AND public.can_view_tour_image_object(name));

CREATE POLICY tour_images_storage_insert
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'tour-images'
    AND public.is_tour_owner(public.storage_path_tour_id(name))
  );

CREATE POLICY tour_images_storage_update
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'tour-images' AND public.can_modify_tour_image_object(name))
  WITH CHECK (bucket_id = 'tour-images' AND public.can_modify_tour_image_object(name));

CREATE POLICY tour_images_storage_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'tour-images' AND public.can_modify_tour_image_object(name));

DROP POLICY IF EXISTS tour_line_attachments_storage_select ON storage.objects;
DROP POLICY IF EXISTS tour_line_attachments_storage_insert ON storage.objects;
DROP POLICY IF EXISTS tour_line_attachments_storage_update ON storage.objects;
DROP POLICY IF EXISTS tour_line_attachments_storage_delete ON storage.objects;

CREATE POLICY tour_line_attachments_storage_select
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'tour-line-attachments'
    AND public.can_view_tour(public.storage_path_tour_id(name))
  );

CREATE POLICY tour_line_attachments_storage_insert
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'tour-line-attachments'
    AND public.is_tour_owner(public.storage_path_tour_id(name))
  );

CREATE POLICY tour_line_attachments_storage_update
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'tour-line-attachments'
    AND public.is_tour_owner(public.storage_path_tour_id(name))
  )
  WITH CHECK (
    bucket_id = 'tour-line-attachments'
    AND public.is_tour_owner(public.storage_path_tour_id(name))
  );

CREATE POLICY tour_line_attachments_storage_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'tour-line-attachments'
    AND public.is_tour_owner(public.storage_path_tour_id(name))
  );

DROP POLICY IF EXISTS "Public read access" ON public.tour_nationalities;
DROP POLICY IF EXISTS "Public insert access" ON public.tour_nationalities;
DROP POLICY IF EXISTS "Public update access" ON public.tour_nationalities;
DROP POLICY IF EXISTS "Public delete access" ON public.tour_nationalities;
DROP POLICY IF EXISTS tour_nationalities_select ON public.tour_nationalities;
DROP POLICY IF EXISTS tour_nationalities_insert ON public.tour_nationalities;
DROP POLICY IF EXISTS tour_nationalities_update ON public.tour_nationalities;
DROP POLICY IF EXISTS tour_nationalities_delete ON public.tour_nationalities;

CREATE POLICY tour_nationalities_select
  ON public.tour_nationalities FOR SELECT TO authenticated
  USING (public.can_view_tour(tour_id));

CREATE POLICY tour_nationalities_insert
  ON public.tour_nationalities FOR INSERT TO authenticated
  WITH CHECK (public.is_tour_owner(tour_id));

CREATE POLICY tour_nationalities_update
  ON public.tour_nationalities FOR UPDATE TO authenticated
  USING (public.can_modify_tour(tour_id))
  WITH CHECK (public.can_modify_tour(tour_id));

CREATE POLICY tour_nationalities_delete
  ON public.tour_nationalities FOR DELETE TO authenticated
  USING (public.is_tour_owner(tour_id));

DROP POLICY IF EXISTS "Authenticated can read submission history" ON public.tour_submission_history;
DROP POLICY IF EXISTS "Authenticated can insert submission history" ON public.tour_submission_history;
DROP POLICY IF EXISTS tour_submission_history_select ON public.tour_submission_history;
DROP POLICY IF EXISTS tour_submission_history_insert ON public.tour_submission_history;

CREATE POLICY tour_submission_history_select
  ON public.tour_submission_history FOR SELECT TO authenticated
  USING (public.can_view_tour(tour_id));

CREATE POLICY tour_submission_history_insert
  ON public.tour_submission_history FOR INSERT TO authenticated
  WITH CHECK (public.can_modify_tour(tour_id));

DROP POLICY IF EXISTS "tour_payments select" ON public.tour_payments;
DROP POLICY IF EXISTS "tour_payments insert" ON public.tour_payments;
DROP POLICY IF EXISTS "tour_payments update" ON public.tour_payments;
DROP POLICY IF EXISTS "tour_payments delete" ON public.tour_payments;

CREATE POLICY "tour_payments select"
  ON public.tour_payments FOR SELECT TO authenticated
  USING (public.can_view_tour(tour_id));

CREATE POLICY "tour_payments insert"
  ON public.tour_payments FOR INSERT TO authenticated
  WITH CHECK (
    public.can_view_tour(tour_id)
    AND public.check_user_permission(auth.uid(), ARRAY['mark_tour_paid'])
  );

CREATE POLICY "tour_payments update"
  ON public.tour_payments FOR UPDATE TO authenticated
  USING (
    public.can_view_tour(tour_id)
    AND public.check_user_permission(auth.uid(), ARRAY['mark_tour_paid'])
  )
  WITH CHECK (
    public.can_view_tour(tour_id)
    AND public.check_user_permission(auth.uid(), ARRAY['mark_tour_paid'])
  );

CREATE POLICY "tour_payments delete"
  ON public.tour_payments FOR DELETE TO authenticated
  USING (
    public.can_view_tour(tour_id)
    AND public.check_user_permission(auth.uid(), ARRAY['mark_tour_paid'])
  );

CREATE OR REPLACE FUNCTION public.can_view_tour_shopping(p_tour_shopping_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tour_shoppings ts
    WHERE ts.id = p_tour_shopping_id
      AND public.can_view_tour(ts.tour_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.can_modify_tour_shopping(p_tour_shopping_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tour_shoppings ts
    WHERE ts.id = p_tour_shopping_id
      AND public.is_tour_owner(ts.tour_id)
  );
$$;

DROP POLICY IF EXISTS "shopping_commission_payments select" ON public.shopping_commission_payments;
DROP POLICY IF EXISTS "shopping_commission_payments insert" ON public.shopping_commission_payments;
DROP POLICY IF EXISTS "shopping_commission_payments update" ON public.shopping_commission_payments;
DROP POLICY IF EXISTS "shopping_commission_payments delete" ON public.shopping_commission_payments;

CREATE POLICY "shopping_commission_payments select"
  ON public.shopping_commission_payments FOR SELECT TO authenticated
  USING (public.can_view_tour_shopping(tour_shopping_id));

CREATE POLICY "shopping_commission_payments insert"
  ON public.shopping_commission_payments FOR INSERT TO authenticated
  WITH CHECK (public.can_modify_tour_shopping(tour_shopping_id));

CREATE POLICY "shopping_commission_payments update"
  ON public.shopping_commission_payments FOR UPDATE TO authenticated
  USING (public.can_modify_tour_shopping(tour_shopping_id))
  WITH CHECK (public.can_modify_tour_shopping(tour_shopping_id));

CREATE POLICY "shopping_commission_payments delete"
  ON public.shopping_commission_payments FOR DELETE TO authenticated
  USING (public.can_modify_tour_shopping(tour_shopping_id));
