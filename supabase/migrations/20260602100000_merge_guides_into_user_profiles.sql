-- Make guide users canonical for tour ownership.
-- Legacy guide rows are matched to existing user profiles by id/name when possible.
-- Unmatched tour guide ids are cleared after preserving guide_name_at_booking.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS note TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_default_guide BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS guide_search_keywords TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS legacy_guide_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_legacy_guide_id
  ON public.user_profiles(legacy_guide_id)
  WHERE legacy_guide_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_profiles_default_guide
  ON public.user_profiles(is_default_guide)
  WHERE settlement_role = 'guide';

CREATE TABLE IF NOT EXISTS public.user_languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  language_id UUID NOT NULL REFERENCES public.languages(id) ON DELETE RESTRICT,
  proficiency TEXT NOT NULL DEFAULT 'working',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_languages_user_language_unique UNIQUE (user_id, language_id),
  CONSTRAINT user_languages_proficiency_check CHECK (proficiency IN ('basic','working','fluent','native'))
);

CREATE INDEX IF NOT EXISTS idx_user_languages_user_id
  ON public.user_languages(user_id);
CREATE INDEX IF NOT EXISTS idx_user_languages_language_id
  ON public.user_languages(language_id);

ALTER TABLE public.user_languages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_languages_select ON public.user_languages;
DROP POLICY IF EXISTS user_languages_insert ON public.user_languages;
DROP POLICY IF EXISTS user_languages_update ON public.user_languages;
DROP POLICY IF EXISTS user_languages_delete ON public.user_languages;

CREATE POLICY user_languages_select
  ON public.user_languages
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.check_user_permission(auth.uid(), ARRAY['manage_users','view_all_users'])
    OR (
      public.is_active_user()
      AND EXISTS (
        SELECT 1
        FROM public.user_profiles up
        WHERE up.id = user_languages.user_id
          AND up.status = 'active'
          AND up.settlement_role = 'guide'
      )
    )
  );

CREATE POLICY user_languages_insert
  ON public.user_languages
  FOR INSERT TO authenticated
  WITH CHECK (public.check_user_permission(auth.uid(), ARRAY['manage_users','edit_users','change_user_roles']));

CREATE POLICY user_languages_update
  ON public.user_languages
  FOR UPDATE TO authenticated
  USING (public.check_user_permission(auth.uid(), ARRAY['manage_users','edit_users','change_user_roles']))
  WITH CHECK (public.check_user_permission(auth.uid(), ARRAY['manage_users','edit_users','change_user_roles']));

CREATE POLICY user_languages_delete
  ON public.user_languages
  FOR DELETE TO authenticated
  USING (public.check_user_permission(auth.uid(), ARRAY['manage_users','edit_users','change_user_roles']));

DROP TRIGGER IF EXISTS update_user_languages_updated_at ON public.user_languages;
CREATE TRIGGER update_user_languages_updated_at
  BEFORE UPDATE ON public.user_languages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TABLE IF EXISTS guide_user_profile_map;
CREATE TEMP TABLE guide_user_profile_map AS
SELECT DISTINCT ON (g.id)
  g.id AS old_guide_id,
  up.id AS user_profile_id
FROM public.guides g
JOIN public.user_profiles up
  ON up.id = g.id
  OR lower(trim(COALESCE(up.full_name, ''))) = lower(trim(g.name))
  OR lower(trim(up.email)) = lower(trim(g.name))
ORDER BY
  g.id,
  (up.id = g.id) DESC,
  (lower(trim(COALESCE(up.full_name, ''))) = lower(trim(g.name))) DESC,
  up.created_at ASC;

UPDATE public.user_profiles up
SET
  phone = COALESCE(NULLIF(up.phone, ''), g.phone, ''),
  note = COALESCE(NULLIF(up.note, ''), g.note, ''),
  is_default_guide = COALESCE(up.is_default_guide, false) OR COALESCE(g.is_default, false),
  guide_search_keywords = CASE
    WHEN COALESCE(array_length(up.guide_search_keywords, 1), 0) = 0
      THEN COALESCE(g.search_keywords, ARRAY[]::TEXT[])
    ELSE up.guide_search_keywords
  END,
  legacy_guide_id = COALESCE(up.legacy_guide_id, g.id),
  settlement_role = 'guide',
  updated_at = NOW()
FROM guide_user_profile_map m
JOIN public.guides g ON g.id = m.old_guide_id
WHERE up.id = m.user_profile_id;

INSERT INTO public.user_languages (user_id, language_id, proficiency)
SELECT DISTINCT
  m.user_profile_id,
  gl.language_id,
  COALESCE(NULLIF(gl.proficiency, ''), 'working')
FROM public.guide_languages gl
JOIN guide_user_profile_map m ON m.old_guide_id = gl.guide_id
ON CONFLICT (user_id, language_id) DO UPDATE SET
  proficiency = EXCLUDED.proficiency,
  updated_at = NOW();

ALTER TABLE public.tours
  DROP CONSTRAINT IF EXISTS tours_guide_id_fkey;

UPDATE public.tours t
SET guide_name_at_booking = COALESCE(NULLIF(t.guide_name_at_booking, ''), g.name)
FROM public.guides g
WHERE t.guide_id = g.id;

UPDATE public.tours t
SET guide_id = m.user_profile_id
FROM guide_user_profile_map m
WHERE t.guide_id = m.old_guide_id;

UPDATE public.tours t
SET guide_id = NULL
WHERE t.guide_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.id = t.guide_id
  );

ALTER TABLE public.tours
  ADD CONSTRAINT tours_guide_id_fkey
  FOREIGN KEY (guide_id)
  REFERENCES public.user_profiles(id)
  ON DELETE SET NULL;

DROP POLICY IF EXISTS "Users can view profiles with permission" ON public.user_profiles;
DROP POLICY IF EXISTS user_profiles_select ON public.user_profiles;

CREATE POLICY user_profiles_select
  ON public.user_profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.check_user_permission(auth.uid(), ARRAY['manage_users','view_all_users'])
    OR (
      public.is_active_user()
      AND settlement_role = 'guide'
      AND status = 'active'
    )
  );

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
            AND t.guide_id = auth.uid()
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
            (public.is_active_user() AND t.guide_id = auth.uid())
            OR public.check_user_permission(auth.uid(), ARRAY['edit_tours'])
            OR (
              t.settlement_status <> 'draft'
              AND public.check_user_permission(
                auth.uid(),
                ARRAY['approve_settlement','review_settlement_line','reopen_settlement','mark_tour_paid']
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
            (
              public.is_active_user()
              AND t.guide_id = auth.uid()
              AND public.check_user_permission(auth.uid(), ARRAY['edit_tours','submit_settlement'])
            )
            OR public.check_user_permission(
              auth.uid(),
              ARRAY['edit_tours','approve_settlement','review_settlement_line','reopen_settlement','mark_tour_paid']
            )
          )
      )
    );
$$;

DROP POLICY IF EXISTS tours_select ON public.tours;
CREATE POLICY tours_select ON public.tours
  FOR SELECT TO authenticated
  USING (public.can_view_tour(id));

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

DROP POLICY IF EXISTS tours_update ON public.tours;
CREATE POLICY tours_update ON public.tours
  FOR UPDATE TO authenticated
  USING (public.can_modify_tour(id))
  WITH CHECK (
    public.is_admin()
    OR (
      public.is_active_user()
      AND guide_id = auth.uid()
      AND public.check_user_permission(auth.uid(), ARRAY['edit_tours','submit_settlement'])
    )
    OR public.check_user_permission(
      auth.uid(),
      ARRAY['edit_tours','approve_settlement','review_settlement_line','reopen_settlement','mark_tour_paid']
    )
  );

DROP POLICY IF EXISTS tours_delete ON public.tours;
CREATE POLICY tours_delete ON public.tours
  FOR DELETE TO authenticated
  USING (
    public.is_admin()
    OR (
      public.is_active_user()
      AND guide_id = auth.uid()
      AND public.check_user_permission(auth.uid(), ARRAY['delete_tours'])
    )
  );
