-- Master-data RLS must also reject inactive authenticated sessions.
DO $$
DECLARE
  v_table text;
  v_tables text[] := ARRAY[
    'companies',
    'guides',
    'nationalities',
    'provinces',
    'tourist_destinations',
    'shoppings',
    'expense_categories',
    'detailed_expenses',
    'languages'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_table || '_select', v_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_table || '_insert', v_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_table || '_update', v_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_table || '_delete', v_table);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (
        public.is_admin()
        OR (
          public.is_active_user()
          AND (created_by = auth.uid() OR is_shared = true)
        )
      )',
      v_table || '_select',
      v_table
    );

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (
        public.is_active_user()
        AND created_by = auth.uid()
      )',
      v_table || '_insert',
      v_table
    );

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (
        public.is_admin()
        OR (public.is_active_user() AND created_by = auth.uid())
      ) WITH CHECK (
        public.is_admin()
        OR (public.is_active_user() AND created_by = auth.uid())
      )',
      v_table || '_update',
      v_table
    );

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (
        public.is_admin()
        OR (public.is_active_user() AND created_by = auth.uid())
      )',
      v_table || '_delete',
      v_table
    );
  END LOOP;
END $$;
