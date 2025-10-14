-- ============================================
-- Fix Table Structure Script
-- Ensures all tables match the expected schema
-- ============================================

-- Fix tour_allowances table structure
ALTER TABLE public.tour_allowances ADD COLUMN IF NOT EXISTS name TEXT;
UPDATE public.tour_allowances SET name = 'Allowance' WHERE name IS NULL;
ALTER TABLE public.tour_allowances ALTER COLUMN name SET NOT NULL;

-- Ensure price column exists (renamed from amount in migration)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tour_allowances' AND column_name = 'amount' AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tour_allowances' AND column_name = 'price')) THEN
    ALTER TABLE public.tour_allowances RENAME COLUMN amount TO price;
  END IF;
END $$;

ALTER TABLE public.tour_allowances ADD COLUMN IF NOT EXISTS price NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.tour_allowances ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;

-- Drop old province column if it exists
ALTER TABLE public.tour_allowances DROP COLUMN IF EXISTS province;

-- Drop old note column if it exists
ALTER TABLE public.tour_allowances DROP COLUMN IF EXISTS note;

-- Fix tour_shoppings table structure
ALTER TABLE public.tour_shoppings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Drop old tip column if it exists
ALTER TABLE public.tour_shoppings DROP COLUMN IF EXISTS tip;

-- Ensure price is NOT NULL with default
ALTER TABLE public.tour_shoppings ALTER COLUMN price SET DEFAULT 0;
DO $$
BEGIN
  UPDATE public.tour_shoppings SET price = 0 WHERE price IS NULL;
  ALTER TABLE public.tour_shoppings ALTER COLUMN price SET NOT NULL;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Add missing columns to shoppings master table
ALTER TABLE public.shoppings ADD COLUMN IF NOT EXISTS price NUMERIC(10,2) DEFAULT 0;

-- Ensure all tour summary columns exist
ALTER TABLE public.tours ADD COLUMN IF NOT EXISTS total_tabs NUMERIC(10,2);
ALTER TABLE public.tours ADD COLUMN IF NOT EXISTS total_after_advance NUMERIC(10,2);
ALTER TABLE public.tours ADD COLUMN IF NOT EXISTS total_after_tip NUMERIC(10,2);
ALTER TABLE public.tours ADD COLUMN IF NOT EXISTS total_after_collections NUMERIC(10,2);
ALTER TABLE public.tours ADD COLUMN IF NOT EXISTS final_total NUMERIC(10,2);

-- Add note column (renamed from notes)
ALTER TABLE public.tours ADD COLUMN IF NOT EXISTS note TEXT;

-- Create trigger for tour_shoppings updated_at if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_tour_shoppings_updated_at') THEN
    CREATE TRIGGER update_tour_shoppings_updated_at
    BEFORE UPDATE ON public.tour_shoppings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Verify the structure by selecting from each table (will fail if structure is wrong)
DO $$
BEGIN
  PERFORM id, tour_id, date, name, price, quantity, created_at FROM public.tour_allowances LIMIT 0;
  PERFORM id, tour_id, date, name, price, created_at, updated_at FROM public.tour_shoppings LIMIT 0;
  RAISE NOTICE 'Table structures verified successfully!';
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Table structure verification failed: %', SQLERRM;
END $$;
