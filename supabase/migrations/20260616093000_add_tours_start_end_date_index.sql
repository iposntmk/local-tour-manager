-- Composite index for year/date-range queries on tours.
-- The year filter does: WHERE end_date >= 'YYYY-01-01' AND start_date <= 'YYYY-12-31'
-- and the default sort is ORDER BY start_date DESC.
-- A single index on both columns covers the filter + the ORDER BY in one scan.
CREATE INDEX IF NOT EXISTS idx_tours_start_date_end_date
ON public.tours(start_date, end_date);
