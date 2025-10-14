-- ============================================
-- Safe Migration Script - Only ALTER TABLE commands
-- This script is safe to run on existing tables
-- ============================================

-- Create update timestamp trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- From: 20250102000000_add_summary_to_tours.sql
ALTER TABLE public.tours ADD COLUMN IF NOT EXISTS summary JSONB DEFAULT '{"totalTabs": 0}';

-- From: 20251001062432_c2a26e81-4447-430d-912c-1f96d57bf7aa.sql
-- Add missing columns to guides
ALTER TABLE public.guides ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';
ALTER TABLE public.guides ADD COLUMN IF NOT EXISTS note TEXT DEFAULT '';

-- Add missing columns to companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS contact_name TEXT DEFAULT '';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS note TEXT DEFAULT '';

-- Add missing columns to nationalities
ALTER TABLE public.nationalities ADD COLUMN IF NOT EXISTS iso2 TEXT;
ALTER TABLE public.nationalities ADD COLUMN IF NOT EXISTS emoji TEXT;

-- Add missing columns to tourist_destinations
ALTER TABLE public.tourist_destinations ADD COLUMN IF NOT EXISTS price NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.tourist_destinations ADD COLUMN IF NOT EXISTS province_name_at_booking TEXT;

-- Add missing columns to detailed_expenses
ALTER TABLE public.detailed_expenses ADD COLUMN IF NOT EXISTS price NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.detailed_expenses ADD COLUMN IF NOT EXISTS category_name_at_booking TEXT;

-- Add missing columns to tours
ALTER TABLE public.tours ADD COLUMN IF NOT EXISTS client_name TEXT DEFAULT '';
ALTER TABLE public.tours ADD COLUMN IF NOT EXISTS adults INTEGER DEFAULT 0;
ALTER TABLE public.tours ADD COLUMN IF NOT EXISTS children INTEGER DEFAULT 0;
ALTER TABLE public.tours ADD COLUMN IF NOT EXISTS total_guests INTEGER DEFAULT 0;
ALTER TABLE public.tours ADD COLUMN IF NOT EXISTS driver_name TEXT DEFAULT '';
ALTER TABLE public.tours ADD COLUMN IF NOT EXISTS client_phone TEXT DEFAULT '';
ALTER TABLE public.tours ADD COLUMN IF NOT EXISTS total_days INTEGER DEFAULT 0;
ALTER TABLE public.tours ADD COLUMN IF NOT EXISTS company_name_at_booking TEXT;
ALTER TABLE public.tours ADD COLUMN IF NOT EXISTS guide_name_at_booking TEXT;
ALTER TABLE public.tours ADD COLUMN IF NOT EXISTS nationality_name_at_booking TEXT;

-- From: 20251001143821_e4dcf077-d2a3-4a71-a7cb-b3169573b2e9.sql
ALTER TABLE public.tours ADD COLUMN IF NOT EXISTS advance_payment NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.tours ADD COLUMN IF NOT EXISTS collections_for_company NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.tours ADD COLUMN IF NOT EXISTS company_tip NUMERIC(10,2) DEFAULT 0;

-- From: 20251003000000_rename_allowances_columns.sql
-- Rename columns if they exist (these operations are idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tour_allowances' AND column_name = 'amount') THEN
    ALTER TABLE public.tour_allowances RENAME COLUMN amount TO price;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL; -- Column already renamed or doesn't exist
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tour_allowances' AND column_name = 'notes') THEN
    ALTER TABLE public.tour_allowances RENAME COLUMN notes TO note;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL; -- Column already renamed or doesn't exist
END $$;

-- From: 20251003080000_add_quantity_to_allowances.sql
ALTER TABLE public.tour_allowances ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;

-- From: 20251003091000_add_notes_to_tours.sql
ALTER TABLE public.tours ADD COLUMN IF NOT EXISTS note TEXT DEFAULT '';

-- From: 20251004000000_add_guests_to_tour_expenses.sql
ALTER TABLE public.tour_expenses ADD COLUMN IF NOT EXISTS guests INTEGER;

-- From: 20251007000001_add_guests_to_tour_destinations.sql
ALTER TABLE public.tour_destinations ADD COLUMN IF NOT EXISTS guests INTEGER;

-- From: 20251007000002_add_guests_to_tour_expenses_and_meals.sql
ALTER TABLE public.tour_meals ADD COLUMN IF NOT EXISTS guests INTEGER;

-- From: 20251011120000_add_data_type_to_diary_types.sql
-- Create diary types table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.diary_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  data_type TEXT DEFAULT 'text' CHECK (data_type IN ('text', 'number', 'date', 'boolean')),
  status TEXT DEFAULT 'active',
  search_keywords TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.diary_types ADD COLUMN IF NOT EXISTS data_type TEXT DEFAULT 'text' CHECK (data_type IN ('text', 'number', 'date', 'boolean'));

-- From: 20251011120100_add_data_type_to_tour_diaries.sql
-- Create tour diaries table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.tour_diaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  diary_type_id UUID NOT NULL REFERENCES public.diary_types(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(tour_id, diary_type_id)
);

-- Create tour_shoppings table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.tour_shoppings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tip NUMERIC(10,2) DEFAULT 0,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create tour_images table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.tour_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.diary_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_diaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_shoppings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_images ENABLE ROW LEVEL SECURITY;

-- Create policies if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'diary_types' AND policyname = 'Public access') THEN
    CREATE POLICY "Public access" ON public.diary_types FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tour_diaries' AND policyname = 'Public access') THEN
    CREATE POLICY "Public access" ON public.tour_diaries FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tour_shoppings' AND policyname = 'Public access') THEN
    CREATE POLICY "Public access" ON public.tour_shoppings FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tour_images' AND policyname = 'Public access') THEN
    CREATE POLICY "Public access" ON public.tour_images FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_tour_diaries_tour_id ON public.tour_diaries(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_shoppings_tour_id ON public.tour_shoppings(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_images_tour_id ON public.tour_images(tour_id);

-- Create triggers if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_diary_types_updated_at') THEN
    CREATE TRIGGER update_diary_types_updated_at
    BEFORE UPDATE ON public.diary_types
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_tour_diaries_updated_at') THEN
    CREATE TRIGGER update_tour_diaries_updated_at
    BEFORE UPDATE ON public.tour_diaries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
