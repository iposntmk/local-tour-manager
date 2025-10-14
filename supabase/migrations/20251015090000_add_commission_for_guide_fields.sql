-- Add commission_for_guide columns to restaurants and shop_places
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS commission_for_guide NUMERIC DEFAULT 0;

ALTER TABLE public.shop_places
  ADD COLUMN IF NOT EXISTS commission_for_guide NUMERIC DEFAULT 0;

-- Backfill existing rows with the default value in case the column was nullable
UPDATE public.restaurants
SET commission_for_guide = COALESCE(commission_for_guide, 0);

UPDATE public.shop_places
SET commission_for_guide = COALESCE(commission_for_guide, 0);

-- Ensure future inserts default to zero when a value is not provided
ALTER TABLE public.restaurants
  ALTER COLUMN commission_for_guide SET DEFAULT 0;

ALTER TABLE public.shop_places
  ALTER COLUMN commission_for_guide SET DEFAULT 0;
