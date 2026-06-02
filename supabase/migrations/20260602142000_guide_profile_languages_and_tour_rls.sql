-- Let guide users maintain their own public guide profile fields and language links.
-- Keep legacy guide tables out of runtime access while preserving their data.

DROP FUNCTION IF EXISTS public.update_own_profile(TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.update_own_profile(
  p_full_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL,
  p_language_ids UUID[] DEFAULT NULL
)
RETURNS public.user_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
DECLARE
  v_profile public.user_profiles;
  v_language_ids UUID[];
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.user_profiles
  SET
    full_name = CASE
      WHEN p_full_name IS NULL THEN full_name
      ELSE NULLIF(BTRIM(p_full_name), '')
    END,
    phone = CASE
      WHEN p_phone IS NULL THEN phone
      ELSE COALESCE(NULLIF(BTRIM(p_phone), ''), '')
    END,
    note = CASE
      WHEN p_note IS NULL THEN note
      ELSE COALESCE(NULLIF(BTRIM(p_note), ''), '')
    END,
    updated_at = NOW()
  WHERE id = auth.uid()
    AND status = 'active'
  RETURNING * INTO v_profile;

  IF v_profile.id IS NULL THEN
    RAISE EXCEPTION 'Profile not found or inactive';
  END IF;

  IF p_language_ids IS NOT NULL AND v_profile.settlement_role = 'guide' THEN
    SELECT ARRAY(
      SELECT DISTINCT lang.id
      FROM unnest(p_language_ids) AS requested(language_id)
      JOIN public.languages AS lang ON lang.id = requested.language_id
      WHERE lang.status = 'active'
      ORDER BY lang.id
    )
    INTO v_language_ids;

    DELETE FROM public.user_languages
    WHERE user_id = v_profile.id;

    INSERT INTO public.user_languages (user_id, language_id, proficiency)
    SELECT v_profile.id, selected.language_id, 'working'
    FROM unnest(COALESCE(v_language_ids, ARRAY[]::UUID[])) AS selected(language_id)
    ON CONFLICT (user_id, language_id) DO UPDATE SET
      proficiency = EXCLUDED.proficiency,
      updated_at = NOW();
  END IF;

  RETURN v_profile;
END;
$$;

REVOKE ALL ON FUNCTION public.update_own_profile(TEXT, TEXT, TEXT, UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_own_profile(TEXT, TEXT, TEXT, UUID[]) TO authenticated;

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

CREATE OR REPLACE FUNCTION public.can_view_tour(p_tour_id UUID)
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
        FROM public.tours AS tour
        WHERE tour.id = p_tour_id
          AND public.is_active_user()
          AND (
            (public.is_guide_user(auth.uid()) AND tour.guide_id = auth.uid())
            OR (
              NOT public.is_guide_user(auth.uid())
              AND public.check_user_permission(auth.uid(), ARRAY['edit_tours'])
            )
            OR (
              tour.settlement_status <> 'draft'
              AND public.check_user_permission(
                auth.uid(),
                ARRAY['approve_settlement','review_settlement_line','reopen_settlement','mark_tour_paid']
              )
            )
          )
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.can_modify_tour(p_tour_id UUID)
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
        FROM public.tours AS tour
        WHERE tour.id = p_tour_id
          AND public.is_active_user()
          AND (
            (
              public.is_guide_user(auth.uid())
              AND tour.guide_id = auth.uid()
              AND public.check_user_permission(auth.uid(), ARRAY['edit_tours','submit_settlement'])
            )
            OR (
              NOT public.is_guide_user(auth.uid())
              AND public.check_user_permission(
                auth.uid(),
                ARRAY['edit_tours','approve_settlement','review_settlement_line','reopen_settlement','mark_tour_paid']
              )
            )
          )
      )
    );
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
        FROM public.tours AS tour
        WHERE tour.id = p_tour_id
          AND public.is_active_user()
          AND (
            (
              public.is_guide_user(auth.uid())
              AND tour.guide_id = auth.uid()
              AND public.check_user_permission(auth.uid(), ARRAY['edit_tours','submit_settlement'])
            )
            OR (
              NOT public.is_guide_user(auth.uid())
              AND public.check_user_permission(auth.uid(), ARRAY['edit_tours'])
            )
          )
      )
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

DROP POLICY IF EXISTS tours_insert ON public.tours;
CREATE POLICY tours_insert ON public.tours
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (
      public.is_active_user()
      AND public.check_user_permission(auth.uid(), ARRAY['create_tours'])
      AND (
        (public.is_guide_user(auth.uid()) AND guide_id = auth.uid())
        OR (
          NOT public.is_guide_user(auth.uid())
          AND public.check_user_permission(auth.uid(), ARRAY['edit_tours'])
        )
      )
    )
  );

DROP POLICY IF EXISTS tours_update ON public.tours;
CREATE POLICY tours_update ON public.tours
  FOR UPDATE TO authenticated
  USING (public.can_modify_tour(id))
  WITH CHECK (public.can_modify_tour(id));

DO $$
BEGIN
  IF to_regclass('public.guides') IS NOT NULL THEN
    ALTER TABLE public.guides ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Public read access" ON public.guides;
    DROP POLICY IF EXISTS "Public insert access" ON public.guides;
    DROP POLICY IF EXISTS "Public update access" ON public.guides;
    DROP POLICY IF EXISTS "Public delete access" ON public.guides;
    DROP POLICY IF EXISTS guides_legacy_admin_select ON public.guides;

    CREATE POLICY guides_legacy_admin_select
      ON public.guides FOR SELECT TO authenticated
      USING (public.is_admin());

    REVOKE INSERT, UPDATE, DELETE ON public.guides FROM anon, authenticated;
  END IF;

  IF to_regclass('public.guide_languages') IS NOT NULL THEN
    ALTER TABLE public.guide_languages ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Public read access" ON public.guide_languages;
    DROP POLICY IF EXISTS "Public insert access" ON public.guide_languages;
    DROP POLICY IF EXISTS "Public update access" ON public.guide_languages;
    DROP POLICY IF EXISTS "Public delete access" ON public.guide_languages;
    DROP POLICY IF EXISTS guide_languages_legacy_admin_select ON public.guide_languages;

    CREATE POLICY guide_languages_legacy_admin_select
      ON public.guide_languages FOR SELECT TO authenticated
      USING (public.is_admin());

    REVOKE INSERT, UPDATE, DELETE ON public.guide_languages FROM anon, authenticated;
  END IF;
END $$;
