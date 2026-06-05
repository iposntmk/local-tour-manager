ALTER TABLE public.tourist_destinations
ADD COLUMN IF NOT EXISTS raw_name TEXT;

COMMENT ON COLUMN public.tourist_destinations.raw_name IS
  'Optional unstandardized/original name for the tourist destination.';
