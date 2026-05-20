-- Add created_by to all master data tables, backfill legacy rows to admin
-- (iposntmk@gmail.com), and rewrite RLS so:
--   - SELECT is open to authenticated (everyone can pick from masters when building tours)
--   - INSERT forces created_by = auth.uid()
--   - UPDATE/DELETE only allowed by the owner OR by an admin
-- Net effect: rows created by an admin are read-only for any non-admin user;
-- rows created by user X are read-only for any other non-admin user.

-- Helper: is the given user_id currently an active admin?
CREATE OR REPLACE FUNCTION public.is_admin_user(p_user_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = p_user_id AND role = 'admin' AND status = 'active'
  );
$$;

-- Apply to each master data table
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
    -- 1. Add column
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL',
      v_table
    );

    -- 2. Backfill NULLs to admin
    EXECUTE format(
      'UPDATE public.%I SET created_by = %L WHERE created_by IS NULL',
      v_table, v_admin
    );

    -- 3. Drop old policies
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_table || '_select_authenticated', v_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_table || '_insert_authenticated', v_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_table || '_update_authenticated', v_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_table || '_delete_authenticated', v_table);
    -- Also drop any prior versions of the new names so re-running is safe
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_table || '_select', v_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_table || '_insert', v_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_table || '_update', v_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_table || '_delete', v_table);

    -- 4. SELECT: any authenticated user
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)',
      v_table || '_select', v_table
    );

    -- 5. INSERT: created_by must be current user (admin keeps the same constraint)
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid())',
      v_table || '_insert', v_table
    );

    -- 6. UPDATE: owner OR admin
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.is_admin() OR created_by = auth.uid()) WITH CHECK (public.is_admin() OR created_by = auth.uid())',
      v_table || '_update', v_table
    );

    -- 7. DELETE: owner OR admin
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.is_admin() OR created_by = auth.uid())',
      v_table || '_delete', v_table
    );

    -- 8. Index on created_by for filtering ownership queries
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I (created_by)',
      'idx_' || v_table || '_created_by', v_table
    );
  END LOOP;
END $$;
