-- Rename tour_allowances columns to match Allowance interface
ALTER TABLE public.tour_allowances RENAME COLUMN province TO name;
ALTER TABLE public.tour_allowances RENAME COLUMN amount TO price;