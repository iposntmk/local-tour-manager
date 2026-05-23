-- Add is_shared to all master data tables.
-- Backfill: admin's records → is_shared = true (preserves current visibility for all users).
-- Update SELECT policy: non-admin users see their own records + shared records.
-- Admin still sees everything (via is_admin() check).

DO $$
DECLARE
  v_admin uuid;
  v_table text;
  v_tables text[] := ARRAY[
    'companies', 'guides', 'nationalities', 'provinces',
    'tourist_destinations', 'shoppings', 'expense_categories', 'detailed_expenses'
  ];
BEGIN
  SELECT id INTO v_admin FROM public.user_profiles WHERE email = 'iposntmk@gmail.com' LIMIT 1;
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'Admin user iposntmk@gmail.com not found; aborting';
  END IF;

  FOREACH v_table IN ARRAY v_tables LOOP
    -- 1. Add is_shared column (non-nullable, default false)
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS is_shared BOOLEAN NOT NULL DEFAULT false',
      v_table
    );

    -- 2. Backfill: admin's existing records become shared so all users can still see them.
    --    Records created by other users remain private (is_shared = false).
    EXECUTE format(
      'UPDATE public.%I SET is_shared = true WHERE created_by = %L',
      v_table, v_admin
    );

    -- 3. Drop existing SELECT policy (was: open to all authenticated users)
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_table || '_select', v_table);

    -- 4. New SELECT: own records OR shared records OR admin sees all
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (
        created_by = auth.uid()
        OR is_shared = true
        OR public.is_admin()
      )',
      v_table || '_select', v_table
    );

    -- 5. Update/Delete policy: only owner or admin may set is_shared
    --    (existing update/delete policies already allow owner OR admin — no change needed)
  END LOOP;
END $$;
