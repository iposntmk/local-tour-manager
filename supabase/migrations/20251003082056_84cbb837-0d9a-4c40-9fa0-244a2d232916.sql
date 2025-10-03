-- Add quantity column to tour_allowances table
ALTER TABLE public.tour_allowances
  ADD COLUMN quantity INTEGER DEFAULT 1 NOT NULL;