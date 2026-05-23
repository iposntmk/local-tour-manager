-- Backfill land_operator_id for tours where it is currently NULL.
-- Sets the default land operator to the company with the specified ID.

DO $$
DECLARE
  v_company_name TEXT;
BEGIN
  -- Look up the company name for denormalization
  SELECT name INTO v_company_name
  FROM public.companies
  WHERE id = '39c48c1c-9ec4-4db3-9fb9-d5e32176cbd2';

  IF v_company_name IS NULL THEN
    RAISE EXCEPTION 'Company with id 39c48c1c-9ec4-4db3-9fb9-d5e32176cbd2 not found';
  END IF;

  UPDATE public.tours
  SET
    land_operator_id = '39c48c1c-9ec4-4db3-9fb9-d5e32176cbd2',
    land_operator_name_at_booking = v_company_name
  WHERE land_operator_id IS NULL;
END $$;
