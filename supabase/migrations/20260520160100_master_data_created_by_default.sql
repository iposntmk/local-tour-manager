-- Make created_by default to auth.uid() on insert so clients don't have to set it.
-- Combined with the WITH CHECK (created_by = auth.uid()) policy, this guarantees
-- correct ownership without touching the client.

DO $$
DECLARE
  v_table text;
  v_tables text[] := ARRAY[
    'companies', 'guides', 'nationalities', 'provinces',
    'tourist_destinations', 'shoppings', 'expense_categories', 'detailed_expenses'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN created_by SET DEFAULT auth.uid()',
      v_table
    );
  END LOOP;
END $$;
