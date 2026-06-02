-- Master data rows created by admin users should be shared by default.
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
    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN is_shared SET DEFAULT public.is_admin()',
      v_table
    );

    EXECUTE format(
      'UPDATE public.%I AS master
       SET is_shared = true
       WHERE is_shared = false
         AND EXISTS (
           SELECT 1
           FROM public.user_profiles AS profile
           WHERE profile.id = master.created_by
             AND profile.role = ''admin''
         )',
      v_table
    );
  END LOOP;
END $$;
