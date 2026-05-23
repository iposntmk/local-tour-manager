-- Admin's records default to NOT shared (is_shared = false).
-- Undo the earlier backfill that set all admin records to is_shared = true.
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
    RAISE EXCEPTION 'Admin user not found';
  END IF;

  FOREACH v_table IN ARRAY v_tables LOOP
    EXECUTE format(
      'UPDATE public.%I SET is_shared = false WHERE created_by = %L',
      v_table, v_admin
    );
  END LOOP;
END $$;
