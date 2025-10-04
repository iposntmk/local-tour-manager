-- Add guests column to tour_expenses table
ALTER TABLE public.tour_expenses
ADD COLUMN IF NOT EXISTS guests INTEGER;

-- Add comment to the column
COMMENT ON COLUMN public.tour_expenses.guests IS 'Number of guests for this expense item (optional, defaults to total tour guests)';