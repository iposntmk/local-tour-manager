-- Creates default_created_by() function that falls back to admin UUID when auth.uid() is NULL.
-- Backfills NULL created_by to admin for all 9 master tables.
-- Fixes languages table: adds is_shared column, applies same RLS as other 8 master tables.

-- 1. Helper function: returns auth.uid() or admin's UUID as fallback
CREATE OR REPLACE FUNCTION public.default_created_by()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin uuid;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    RETURN auth.uid();
  END IF;
  SELECT id INTO v_admin FROM public.user_profiles WHERE email = 'iposntmk@gmail.com' LIMIT 1;
  RETURN v_admin;
END;
$$;

-- 2. Apply default_created_by() as column default for all 9 master tables
ALTER TABLE public.companies       ALTER COLUMN created_by SET DEFAULT public.default_created_by();
ALTER TABLE public.guides          ALTER COLUMN created_by SET DEFAULT public.default_created_by();
ALTER TABLE public.nationalities   ALTER COLUMN created_by SET DEFAULT public.default_created_by();
ALTER TABLE public.provinces       ALTER COLUMN created_by SET DEFAULT public.default_created_by();
ALTER TABLE public.tourist_destinations ALTER COLUMN created_by SET DEFAULT public.default_created_by();
ALTER TABLE public.shoppings       ALTER COLUMN created_by SET DEFAULT public.default_created_by();
ALTER TABLE public.expense_categories ALTER COLUMN created_by SET DEFAULT public.default_created_by();
ALTER TABLE public.detailed_expenses  ALTER COLUMN created_by SET DEFAULT public.default_created_by();
ALTER TABLE public.languages       ALTER COLUMN created_by SET DEFAULT public.default_created_by();

-- 3. Backfill NULL created_by to admin for all 9 tables
DO $$
DECLARE
  v_admin uuid;
BEGIN
  SELECT id INTO v_admin FROM public.user_profiles WHERE email = 'iposntmk@gmail.com' LIMIT 1;
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'Admin user not found';
  END IF;

  UPDATE public.companies             SET created_by = v_admin WHERE created_by IS NULL;
  UPDATE public.guides                SET created_by = v_admin WHERE created_by IS NULL;
  UPDATE public.nationalities         SET created_by = v_admin WHERE created_by IS NULL;
  UPDATE public.provinces             SET created_by = v_admin WHERE created_by IS NULL;
  UPDATE public.tourist_destinations  SET created_by = v_admin WHERE created_by IS NULL;
  UPDATE public.shoppings             SET created_by = v_admin WHERE created_by IS NULL;
  UPDATE public.expense_categories    SET created_by = v_admin WHERE created_by IS NULL;
  UPDATE public.detailed_expenses     SET created_by = v_admin WHERE created_by IS NULL;
  UPDATE public.languages             SET created_by = v_admin WHERE created_by IS NULL;
END $$;

-- 4. Add is_shared to languages (if not already present)
ALTER TABLE public.languages ADD COLUMN IF NOT EXISTS is_shared BOOLEAN NOT NULL DEFAULT false;

-- 5. Drop existing wide-open languages RLS policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.languages;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.languages;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.languages;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON public.languages;
-- Also drop any policies from previous migrations
DROP POLICY IF EXISTS "languages_select" ON public.languages;
DROP POLICY IF EXISTS "languages_insert" ON public.languages;
DROP POLICY IF EXISTS "languages_update" ON public.languages;
DROP POLICY IF EXISTS "languages_delete" ON public.languages;

-- 6. Create proper ownership-based RLS for languages (same pattern as other 8 tables)
CREATE POLICY "languages_select" ON public.languages
  FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR is_shared = true OR public.is_admin());

CREATE POLICY "languages_insert" ON public.languages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "languages_update" ON public.languages
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin())
  WITH CHECK (created_by = auth.uid() OR public.is_admin());

CREATE POLICY "languages_delete" ON public.languages
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin());
