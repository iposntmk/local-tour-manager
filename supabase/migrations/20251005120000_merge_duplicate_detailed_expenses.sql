-- Merge duplicate rows with id '4a17d85e-7072-4863-839e-2377618095fe' in detailed_expenses table
-- This migration removes duplicate rows, keeping only the first occurrence

-- First, let's see what we're working with (for safety)
-- Note: This is informational only, the actual deletion happens below

-- Delete duplicate rows, keeping only the row with the lowest created_at or ctid
DELETE FROM detailed_expenses
WHERE id = '4a17d85e-7072-4863-839e-2377618095fe'
AND ctid NOT IN (
  SELECT MIN(ctid)
  FROM detailed_expenses
  WHERE id = '4a17d85e-7072-4863-839e-2377618095fe'
);

-- Verify the result (this will show how many rows remain)
-- There should be exactly 1 row with this ID after the migration
DO $$
DECLARE
  row_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO row_count
  FROM detailed_expenses
  WHERE id = '4a17d85e-7072-4863-839e-2377618095fe';

  RAISE NOTICE 'Rows remaining with id 4a17d85e-7072-4863-839e-2377618095fe: %', row_count;

  IF row_count > 1 THEN
    RAISE EXCEPTION 'Still have duplicate rows! Expected 1, found %', row_count;
  END IF;
END $$;
