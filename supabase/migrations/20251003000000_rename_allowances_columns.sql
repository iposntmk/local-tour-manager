-- Rename columns in tour_allowances table
-- Change 'province' to 'name' and 'amount' to 'price'

ALTER TABLE public.tour_allowances
  RENAME COLUMN province TO name;

ALTER TABLE public.tour_allowances
  RENAME COLUMN amount TO price;
