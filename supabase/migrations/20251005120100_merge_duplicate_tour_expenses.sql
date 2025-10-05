-- Merge duplicate rows in tour_expenses table with the same detailed_expense_id
-- Keep only one row per tour_id + detailed_expense_id combination, summing up quantities/prices if needed

-- For rows with detailed_expense_id = '4a17d85e-7072-4863-839e-2377618095fe'
-- Delete duplicates, keeping only the first occurrence per tour

DELETE FROM tour_expenses
WHERE ctid NOT IN (
  SELECT MIN(ctid)
  FROM tour_expenses
  WHERE detailed_expense_id = '4a17d85e-7072-4863-839e-2377618095fe'
  GROUP BY tour_id, detailed_expense_id
)
AND detailed_expense_id = '4a17d85e-7072-4863-839e-2377618095fe';

-- Verify the result
DO $$
DECLARE
  tour_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT tour_id) INTO tour_count
  FROM tour_expenses
  WHERE detailed_expense_id = '4a17d85e-7072-4863-839e-2377618095fe';

  RAISE NOTICE 'Tours with expense 4a17d85e-7072-4863-839e-2377618095fe: %', tour_count;
END $$;
