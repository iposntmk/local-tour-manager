-- Keep database permission checks aligned with the app's role defaults.
-- NULL user_profiles.permissions means "derive from role + settlement_role".

CREATE OR REPLACE FUNCTION public.default_permissions_for_role(p_role TEXT)
RETURNS TEXT[]
LANGUAGE sql
IMMUTABLE
SET search_path = 'public', 'pg_temp'
AS $$
  SELECT CASE p_role
    WHEN 'admin' THEN ARRAY[
      'view_tours','create_tours','edit_tours','delete_tours','export_tours','import_tours',
      'duplicate_tours','backup_data','download_all_tour_images','view_tour_all_tabs',
      'view_tour_info','view_tour_destinations','view_tour_expenses','view_tour_meals',
      'view_tour_combined','view_tour_allowances','view_tour_shoppings','view_tour_images',
      'view_tour_summary','edit_tour_info','edit_tour_destinations','edit_tour_expenses',
      'edit_tour_meals','edit_tour_allowances','edit_tour_shoppings','edit_tour_summary',
      'view_tour_info_all_fields','edit_tour_info_all_fields','view_tour_info_tour_code',
      'edit_tour_info_tour_code','view_tour_info_companies','edit_tour_info_companies',
      'view_tour_info_guide','edit_tour_info_guide','view_tour_info_client',
      'edit_tour_info_client','view_tour_info_pax','edit_tour_info_pax',
      'view_tour_info_dates','edit_tour_info_dates','view_tour_info_driver',
      'edit_tour_info_driver','view_tour_info_notes','edit_tour_info_notes',
      'view_tour_line_all_fields','edit_tour_line_all_fields','view_tour_line_name',
      'edit_tour_line_name','view_tour_line_price','edit_tour_line_price',
      'view_tour_line_date','edit_tour_line_date','view_tour_line_quantity',
      'edit_tour_line_quantity','view_tour_line_evidence','edit_tour_line_evidence',
      'upload_tour_images','delete_tour_images','view_master_data','edit_master_data',
      'delete_master_data','view_guides','create_guides','edit_guides','delete_guides',
      'import_guides','export_guides','view_languages','create_languages','edit_languages',
      'delete_languages','import_languages','export_languages','view_companies',
      'create_companies','edit_companies','delete_companies','import_companies',
      'export_companies','view_nationalities','create_nationalities','edit_nationalities',
      'delete_nationalities','import_nationalities','export_nationalities','view_provinces',
      'create_provinces','edit_provinces','delete_provinces','import_provinces',
      'export_provinces','view_tourist_destinations','create_tourist_destinations',
      'edit_tourist_destinations','delete_tourist_destinations',
      'import_tourist_destinations','export_tourist_destinations','view_shopping',
      'create_shopping','edit_shopping','delete_shopping','import_shopping','export_shopping',
      'view_expense_categories','create_expense_categories','edit_expense_categories',
      'delete_expense_categories','import_expense_categories','export_expense_categories',
      'view_detailed_expenses','create_detailed_expenses','edit_detailed_expenses',
      'delete_detailed_expenses','import_detailed_expenses','export_detailed_expenses',
      'view_statistics','manage_users','view_all_users','create_users','edit_users',
      'delete_users','change_user_roles','submit_settlement','review_settlement_line',
      'approve_settlement','reopen_settlement','mark_tour_paid'
    ]::TEXT[]
    WHEN 'editor' THEN ARRAY[
      'view_tours','create_tours','edit_tours','export_tours','import_tours',
      'duplicate_tours','download_all_tour_images','view_tour_all_tabs','view_tour_info',
      'view_tour_destinations','view_tour_expenses','view_tour_meals','view_tour_combined',
      'view_tour_allowances','view_tour_shoppings','view_tour_images','view_tour_summary',
      'view_tour_info_all_fields','view_tour_info_tour_code','view_tour_info_companies',
      'view_tour_info_guide','view_tour_info_client','view_tour_info_pax',
      'view_tour_info_dates','view_tour_info_driver','view_tour_info_notes',
      'view_tour_line_all_fields','view_tour_line_name','view_tour_line_price',
      'view_tour_line_date','view_tour_line_quantity','view_tour_line_evidence',
      'edit_tour_info','edit_tour_destinations','edit_tour_expenses','edit_tour_meals',
      'edit_tour_allowances','edit_tour_shoppings','edit_tour_summary',
      'edit_tour_info_all_fields','edit_tour_info_tour_code','edit_tour_info_companies',
      'edit_tour_info_guide','edit_tour_info_client','edit_tour_info_pax',
      'edit_tour_info_dates','edit_tour_info_driver','edit_tour_info_notes',
      'edit_tour_line_all_fields','edit_tour_line_name','edit_tour_line_price',
      'edit_tour_line_date','edit_tour_line_quantity','edit_tour_line_evidence',
      'upload_tour_images','view_statistics','view_master_data','edit_master_data',
      'view_guides','create_guides','edit_guides','import_guides','export_guides',
      'view_languages','create_languages','edit_languages','import_languages',
      'export_languages','view_companies','create_companies','edit_companies',
      'import_companies','export_companies','view_nationalities','create_nationalities',
      'edit_nationalities','import_nationalities','export_nationalities','view_provinces',
      'create_provinces','edit_provinces','import_provinces','export_provinces',
      'view_tourist_destinations','create_tourist_destinations','edit_tourist_destinations',
      'import_tourist_destinations','export_tourist_destinations','view_shopping',
      'create_shopping','edit_shopping','import_shopping','export_shopping',
      'view_expense_categories','create_expense_categories','edit_expense_categories',
      'import_expense_categories','export_expense_categories','view_detailed_expenses',
      'create_detailed_expenses','edit_detailed_expenses','import_detailed_expenses',
      'export_detailed_expenses'
    ]::TEXT[]
    WHEN 'viewer' THEN ARRAY[
      'view_tours','view_tour_all_tabs','view_tour_info','view_tour_destinations',
      'view_tour_expenses','view_tour_meals','view_tour_combined','view_tour_allowances',
      'view_tour_shoppings','view_tour_images','view_tour_summary',
      'view_tour_info_all_fields','view_tour_info_tour_code','view_tour_info_companies',
      'view_tour_info_guide','view_tour_info_client','view_tour_info_pax',
      'view_tour_info_dates','view_tour_info_driver','view_tour_info_notes',
      'view_tour_line_all_fields','view_tour_line_name','view_tour_line_price',
      'view_tour_line_date','view_tour_line_quantity','view_tour_line_evidence',
      'view_statistics','view_master_data','view_guides','view_languages','view_companies',
      'view_nationalities','view_provinces','view_tourist_destinations','view_shopping',
      'view_expense_categories','view_detailed_expenses'
    ]::TEXT[]
    ELSE ARRAY[]::TEXT[]
  END;
$$;

CREATE OR REPLACE FUNCTION public.default_permissions_for_settlement_role(p_settlement_role TEXT)
RETURNS TEXT[]
LANGUAGE sql
IMMUTABLE
SET search_path = 'public', 'pg_temp'
AS $$
  SELECT CASE p_settlement_role
    WHEN 'guide' THEN ARRAY[
      'submit_settlement','view_tour_all_tabs','view_tour_info','view_tour_destinations',
      'view_tour_expenses','view_tour_meals','view_tour_combined','view_tour_allowances',
      'view_tour_shoppings','view_tour_images','view_tour_summary',
      'view_tour_info_all_fields','view_tour_info_tour_code','view_tour_info_companies',
      'view_tour_info_guide','view_tour_info_client','view_tour_info_pax',
      'view_tour_info_dates','view_tour_info_driver','view_tour_info_notes',
      'view_tour_line_all_fields','view_tour_line_name','view_tour_line_price',
      'view_tour_line_date','view_tour_line_quantity','view_tour_line_evidence',
      'edit_tour_destinations','edit_tour_expenses','edit_tour_meals',
      'edit_tour_allowances','edit_tour_shoppings','edit_tour_summary',
      'edit_tour_line_all_fields','edit_tour_info_all_fields','edit_tour_info_tour_code',
      'edit_tour_info_companies','edit_tour_info_guide','edit_tour_info_client',
      'edit_tour_info_pax','edit_tour_info_dates','edit_tour_info_driver',
      'edit_tour_info_notes','edit_tour_line_name','edit_tour_line_price',
      'edit_tour_line_date','edit_tour_line_quantity','edit_tour_line_evidence',
      'upload_tour_images'
    ]::TEXT[]
    WHEN 'accountant' THEN ARRAY[
      'review_settlement_line','approve_settlement','view_tour_info','view_tour_summary',
      'view_tour_info_all_fields','view_tour_line_all_fields'
    ]::TEXT[]
    ELSE ARRAY[]::TEXT[]
  END;
$$;

CREATE OR REPLACE FUNCTION public.default_permissions_for_profile(p_role TEXT, p_settlement_role TEXT)
RETURNS TEXT[]
LANGUAGE sql
IMMUTABLE
SET search_path = 'public', 'pg_temp'
AS $$
  SELECT ARRAY(
    SELECT DISTINCT permission_name
    FROM unnest(
      public.default_permissions_for_role(p_role)
      || public.default_permissions_for_settlement_role(COALESCE(p_settlement_role, 'none'))
    ) AS default_permission(permission_name)
  );
$$;

CREATE OR REPLACE FUNCTION public.check_user_permission(user_id UUID, required_permissions TEXT[])
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
DECLARE
  v_role TEXT;
  v_status TEXT;
  v_settlement_role TEXT;
  v_permissions TEXT[];
BEGIN
  SELECT role, status, settlement_role, permissions
  INTO v_role, v_status, v_settlement_role, v_permissions
  FROM public.user_profiles
  WHERE id = user_id;

  IF v_status IS DISTINCT FROM 'active' THEN
    RETURN false;
  END IF;
  IF v_role = 'admin' THEN
    RETURN true;
  END IF;

  RETURN COALESCE(
    COALESCE(v_permissions, public.default_permissions_for_profile(v_role, v_settlement_role))
    && required_permissions,
    false
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.can_edit_tour_content(p_tour_id UUID)
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
          AND public.is_active_user()
          AND (
            (
              t.guide_id = auth.uid()
              AND public.check_user_permission(auth.uid(), ARRAY['edit_tours','submit_settlement'])
            )
            OR public.check_user_permission(auth.uid(), ARRAY['edit_tours'])
          )
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.can_modify_tour_image_object(p_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
  SELECT public.can_edit_tour_content(public.storage_path_tour_id(p_name))
    OR EXISTS (
      SELECT 1
      FROM public.tour_images ti
      WHERE ti.storage_path = p_name
        AND public.can_edit_tour_content(ti.tour_id)
    );
$$;

DROP POLICY IF EXISTS tour_nationalities_insert ON public.tour_nationalities;
DROP POLICY IF EXISTS tour_nationalities_update ON public.tour_nationalities;
DROP POLICY IF EXISTS tour_nationalities_delete ON public.tour_nationalities;

CREATE POLICY tour_nationalities_insert
  ON public.tour_nationalities FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_tour_content(tour_id));

CREATE POLICY tour_nationalities_update
  ON public.tour_nationalities FOR UPDATE TO authenticated
  USING (public.can_edit_tour_content(tour_id))
  WITH CHECK (public.can_edit_tour_content(tour_id));

CREATE POLICY tour_nationalities_delete
  ON public.tour_nationalities FOR DELETE TO authenticated
  USING (public.can_edit_tour_content(tour_id));

DROP POLICY IF EXISTS tour_images_insert ON public.tour_images;
DROP POLICY IF EXISTS tour_images_update ON public.tour_images;
DROP POLICY IF EXISTS tour_images_delete ON public.tour_images;

CREATE POLICY tour_images_insert
  ON public.tour_images FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_tour_content(tour_id));

CREATE POLICY tour_images_update
  ON public.tour_images FOR UPDATE TO authenticated
  USING (public.can_edit_tour_content(tour_id))
  WITH CHECK (public.can_edit_tour_content(tour_id));

CREATE POLICY tour_images_delete
  ON public.tour_images FOR DELETE TO authenticated
  USING (public.can_edit_tour_content(tour_id));

DROP POLICY IF EXISTS tour_images_storage_insert ON storage.objects;
CREATE POLICY tour_images_storage_insert
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'tour-images'
    AND public.can_edit_tour_content(public.storage_path_tour_id(name))
  );

CREATE OR REPLACE FUNCTION public.can_modify_tour_shopping(p_tour_shopping_id UUID)
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
      AND public.can_edit_tour_content(ts.tour_id)
  );
$$;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'tour_destinations',
    'tour_expenses',
    'tour_meals',
    'tour_allowances',
    'tour_shoppings'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_insert', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.can_edit_tour_content(tour_id))',
      table_name || '_insert',
      table_name
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_delete', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.can_edit_tour_content(tour_id))',
      table_name || '_delete',
      table_name
    );
  END LOOP;
END $$;
