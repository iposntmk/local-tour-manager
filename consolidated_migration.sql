-- ============================================
-- Consolidated Migration Script for Tour Manager
-- ============================================
-- This file contains all migrations in chronological order
-- Run this entire file in Supabase SQL Editor
-- ============================================

-- ============================================
-- Migration: 20250102000000_add_summary_to_tours.sql
-- ============================================

-- Add summary column to tours table
ALTER TABLE public.tours ADD COLUMN IF NOT EXISTS summary JSONB DEFAULT '{"totalTabs": 0}';

-- ============================================
-- Migration: 20251001061910_d3283b63-36bd-4b3a-a408-24f64ad5f510.sql
-- ============================================

-- Create guides table
CREATE TABLE public.guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  search_keywords TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create companies table
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  search_keywords TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create nationalities table
CREATE TABLE public.nationalities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  search_keywords TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create provinces table
CREATE TABLE public.provinces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  search_keywords TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create tourist_destinations table
CREATE TABLE public.tourist_destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  province_id UUID REFERENCES public.provinces(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active',
  search_keywords TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create shoppings table
CREATE TABLE public.shoppings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  search_keywords TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create expense_categories table
CREATE TABLE public.expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  search_keywords TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create detailed_expenses table
CREATE TABLE public.detailed_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active',
  search_keywords TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create tours table
CREATE TABLE public.tours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_code TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  guide_id UUID REFERENCES public.guides(id) ON DELETE SET NULL,
  number_of_guests INTEGER DEFAULT 0,
  nationality_id UUID REFERENCES public.nationalities(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create tour_destinations table
CREATE TABLE public.tour_destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  destination_id UUID REFERENCES public.tourist_destinations(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create tour_expenses table
CREATE TABLE public.tour_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  expense_id UUID REFERENCES public.detailed_expenses(id) ON DELETE SET NULL,
  amount NUMERIC(10, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create tour_meals table
CREATE TABLE public.tour_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal_type TEXT NOT NULL,
  shopping_id UUID REFERENCES public.shoppings(id) ON DELETE SET NULL,
  price NUMERIC(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create tour_allowances table
CREATE TABLE public.tour_allowances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  amount NUMERIC(10, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables (but allow public access)
ALTER TABLE public.guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nationalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provinces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tourist_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shoppings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detailed_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_allowances ENABLE ROW LEVEL SECURITY;

-- Create public access policies (no authentication required)
CREATE POLICY "Public read access" ON public.guides FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.guides FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.guides FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON public.guides FOR DELETE USING (true);

CREATE POLICY "Public read access" ON public.companies FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.companies FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.companies FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON public.companies FOR DELETE USING (true);

CREATE POLICY "Public read access" ON public.nationalities FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.nationalities FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.nationalities FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON public.nationalities FOR DELETE USING (true);

CREATE POLICY "Public read access" ON public.provinces FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.provinces FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.provinces FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON public.provinces FOR DELETE USING (true);

CREATE POLICY "Public read access" ON public.tourist_destinations FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.tourist_destinations FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.tourist_destinations FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON public.tourist_destinations FOR DELETE USING (true);

CREATE POLICY "Public read access" ON public.shoppings FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.shoppings FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.shoppings FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON public.shoppings FOR DELETE USING (true);

CREATE POLICY "Public read access" ON public.expense_categories FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.expense_categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.expense_categories FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON public.expense_categories FOR DELETE USING (true);

CREATE POLICY "Public read access" ON public.detailed_expenses FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.detailed_expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.detailed_expenses FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON public.detailed_expenses FOR DELETE USING (true);

CREATE POLICY "Public read access" ON public.tours FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.tours FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.tours FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON public.tours FOR DELETE USING (true);

CREATE POLICY "Public read access" ON public.tour_destinations FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.tour_destinations FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.tour_destinations FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON public.tour_destinations FOR DELETE USING (true);

CREATE POLICY "Public read access" ON public.tour_expenses FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.tour_expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.tour_expenses FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON public.tour_expenses FOR DELETE USING (true);

CREATE POLICY "Public read access" ON public.tour_meals FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.tour_meals FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.tour_meals FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON public.tour_meals FOR DELETE USING (true);

CREATE POLICY "Public read access" ON public.tour_allowances FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.tour_allowances FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.tour_allowances FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON public.tour_allowances FOR DELETE USING (true);

-- Create indexes for better performance
CREATE INDEX idx_tourist_destinations_province_id ON public.tourist_destinations(province_id);
CREATE INDEX idx_detailed_expenses_category_id ON public.detailed_expenses(category_id);
CREATE INDEX idx_tours_company_id ON public.tours(company_id);
CREATE INDEX idx_tours_guide_id ON public.tours(guide_id);
CREATE INDEX idx_tours_nationality_id ON public.tours(nationality_id);
CREATE INDEX idx_tour_destinations_tour_id ON public.tour_destinations(tour_id);
CREATE INDEX idx_tour_expenses_tour_id ON public.tour_expenses(tour_id);
CREATE INDEX idx_tour_meals_tour_id ON public.tour_meals(tour_id);
CREATE INDEX idx_tour_allowances_tour_id ON public.tour_allowances(tour_id);

-- Create update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers to all tables with updated_at
CREATE TRIGGER update_guides_updated_at BEFORE UPDATE ON public.guides FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_nationalities_updated_at BEFORE UPDATE ON public.nationalities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_provinces_updated_at BEFORE UPDATE ON public.provinces FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tourist_destinations_updated_at BEFORE UPDATE ON public.tourist_destinations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shoppings_updated_at BEFORE UPDATE ON public.shoppings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expense_categories_updated_at BEFORE UPDATE ON public.expense_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_detailed_expenses_updated_at BEFORE UPDATE ON public.detailed_expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tours_updated_at BEFORE UPDATE ON public.tours FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Migration: 20251001062432_c2a26e81-4447-430d-912c-1f96d57bf7aa.sql
-- ============================================

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

-- Recreate tours table with correct structure
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

-- Drop old tour subcollections and recreate with correct structure
DROP TABLE IF EXISTS public.tour_destinations CASCADE;
DROP TABLE IF EXISTS public.tour_expenses CASCADE;
DROP TABLE IF EXISTS public.tour_meals CASCADE;
DROP TABLE IF EXISTS public.tour_allowances CASCADE;

-- Recreate with simplified structure matching app types
CREATE TABLE public.tour_destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(10,2) DEFAULT 0,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.tour_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(10,2) DEFAULT 0,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.tour_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(10,2) DEFAULT 0,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.tour_allowances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  province TEXT NOT NULL,
  amount NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies for new tables
ALTER TABLE public.tour_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_allowances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public access" ON public.tour_destinations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON public.tour_expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON public.tour_meals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON public.tour_allowances FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- Migration: 20251001143821_e4dcf077-d2a3-4a71-a7cb-b3169573b2e9.sql
-- ============================================

-- Add unique constraint on tour_code
ALTER TABLE tours ADD CONSTRAINT tours_tour_code_unique UNIQUE (tour_code);

-- ============================================
-- Migration: 20251002024048_98806945-ac96-423d-af77-30e491e41870.sql
-- ============================================

-- Add summary columns to tours table
ALTER TABLE tours 
ADD COLUMN IF NOT EXISTS total_tabs numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS advance_payment numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_after_advance numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS company_tip numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_after_tip numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS collections_for_company numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_after_collections numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS final_total numeric DEFAULT 0;

-- ============================================
-- Migration: 20251002024127_6a99c71f-3df1-4171-8822-8871d79132f1.sql
-- ============================================

-- Fix function search path security issue
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SET search_path = public;

-- Add price column to shoppings table
ALTER TABLE shoppings 
ADD COLUMN IF NOT EXISTS price numeric DEFAULT 0;

-- ============================================
-- Migration: 20251003000000_rename_allowances_columns.sql
-- ============================================

-- Rename columns in tour_allowances table
-- Change 'province' to 'name' and 'amount' to 'price'

ALTER TABLE public.tour_allowances
  RENAME COLUMN province TO name;

ALTER TABLE public.tour_allowances
  RENAME COLUMN amount TO price;


-- ============================================
-- Migration: 20251003072103_9b6a608e-7d2b-4595-b4cb-a341e7a25007.sql
-- ============================================

-- Rename tour_allowances columns to match Allowance interface
ALTER TABLE public.tour_allowances RENAME COLUMN province TO name;
ALTER TABLE public.tour_allowances RENAME COLUMN amount TO price;

-- ============================================
-- Migration: 20251003080000_add_quantity_to_allowances.sql
-- ============================================

-- Add quantity column to tour_allowances table
ALTER TABLE public.tour_allowances
  ADD COLUMN quantity INTEGER DEFAULT 1 NOT NULL;


-- ============================================
-- Migration: 20251003082056_84cbb837-0d9a-4c40-9fa0-244a2d232916.sql
-- ============================================

-- Add quantity column to tour_allowances table
ALTER TABLE public.tour_allowances
  ADD COLUMN quantity INTEGER DEFAULT 1 NOT NULL;

-- ============================================
-- Migration: 20251003090000_add_tour_shoppings_table.sql
-- ============================================

-- Create tour_shoppings table
CREATE TABLE IF NOT EXISTS tour_shoppings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_tour_shoppings_tour_id ON tour_shoppings(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_shoppings_date ON tour_shoppings(date);

-- Enable RLS
ALTER TABLE tour_shoppings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users" ON tour_shoppings
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON tour_shoppings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON tour_shoppings
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete for all users" ON tour_shoppings
  FOR DELETE USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_tour_shoppings_updated_at
  BEFORE UPDATE ON tour_shoppings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ============================================
-- Migration: 20251003091000_add_notes_to_tours.sql
-- ============================================

-- Add notes column to tours table
ALTER TABLE tours ADD COLUMN IF NOT EXISTS notes TEXT;


-- ============================================
-- Migration: 20251003092000_add_tip_to_tour_shoppings.sql
-- ============================================

-- Add tip column to tour_shoppings table
ALTER TABLE tour_shoppings ADD COLUMN IF NOT EXISTS tip NUMERIC(10, 2) NOT NULL DEFAULT 0;


-- ============================================
-- Migration: 20251003154131_69dc1e3e-72fc-46ef-8eff-d872364dba02.sql
-- ============================================

-- Create tour_shoppings table
CREATE TABLE IF NOT EXISTS tour_shoppings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tour_shoppings_tour_id ON tour_shoppings(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_shoppings_date ON tour_shoppings(date);

ALTER TABLE tour_shoppings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON tour_shoppings FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON tour_shoppings FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON tour_shoppings FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON tour_shoppings FOR DELETE USING (true);

CREATE TRIGGER update_tour_shoppings_updated_at
  BEFORE UPDATE ON tour_shoppings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Migration: 20251004000000_add_guests_to_tour_expenses.sql
-- ============================================

-- Add guests column to tour_expenses table
ALTER TABLE public.tour_expenses
ADD COLUMN IF NOT EXISTS guests INTEGER;

-- Add comment to the column
COMMENT ON COLUMN public.tour_expenses.guests IS 'Number of guests for this expense item (optional, defaults to total tour guests)';


-- ============================================
-- Migration: 20251004163858_3971d2c0-2424-432e-9986-cd9f6e869bbf.sql
-- ============================================

-- Add guests column to tour_expenses table
ALTER TABLE public.tour_expenses
ADD COLUMN IF NOT EXISTS guests INTEGER;

-- Add comment to the column
COMMENT ON COLUMN public.tour_expenses.guests IS 'Number of guests for this expense item (optional, defaults to total tour guests)';

-- ============================================
-- Migration: 20251005081143_632bfd37-4014-4325-bd73-32364b61c67d.sql
-- ============================================

-- Create storage bucket for tour images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tour-images',
  'tour-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);

-- Create RLS policies for tour images bucket
CREATE POLICY "Anyone can view tour images"
ON storage.objects FOR SELECT
USING (bucket_id = 'tour-images');

CREATE POLICY "Anyone can upload tour images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'tour-images');

CREATE POLICY "Anyone can update tour images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'tour-images');

CREATE POLICY "Anyone can delete tour images"
ON storage.objects FOR DELETE
USING (bucket_id = 'tour-images');

-- Create tour_images table to track images
CREATE TABLE public.tour_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tour_id UUID NOT NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_tour FOREIGN KEY (tour_id) REFERENCES public.tours(id) ON DELETE CASCADE
);

-- Enable RLS on tour_images
ALTER TABLE public.tour_images ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tour_images
CREATE POLICY "Anyone can view tour images"
ON public.tour_images FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert tour images"
ON public.tour_images FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can delete tour images"
ON public.tour_images FOR DELETE
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_tour_images_tour_id ON public.tour_images(tour_id);

-- ============================================
-- Migration: 20251005120000_merge_duplicate_detailed_expenses.sql
-- ============================================

-- Merge duplicate rows with id '4a17d85e-7072-4863-839e-2377618095fe' in detailed_expenses table
-- This migration removes duplicate rows, keeping only the first occurrence

-- First, let's see what we're working with (for safety)
-- Note: This is informational only, the actual deletion happens below

-- Delete duplicate rows, keeping only the row with the lowest created_at or ctid
DELETE FROM detailed_expenses
WHERE id = '4a17d85e-7072-4863-839e-2377618095fe'
AND ctid NOT IN (
  SELECT MIN(ctid)
  FROM detailed_expenses
  WHERE id = '4a17d85e-7072-4863-839e-2377618095fe'
);

-- Verify the result (this will show how many rows remain)
-- There should be exactly 1 row with this ID after the migration
DO $$
DECLARE
  row_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO row_count
  FROM detailed_expenses
  WHERE id = '4a17d85e-7072-4863-839e-2377618095fe';

  RAISE NOTICE 'Rows remaining with id 4a17d85e-7072-4863-839e-2377618095fe: %', row_count;

  IF row_count > 1 THEN
    RAISE EXCEPTION 'Still have duplicate rows! Expected 1, found %', row_count;
  END IF;
END $$;


-- ============================================
-- Migration: 20251005120100_merge_duplicate_tour_expenses.sql
-- ============================================

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


-- ============================================
-- Migration: 20251006060335_507c34f3-d31d-49a5-bb61-b0372495e568.sql
-- ============================================

-- Enable pg_trgm extension for full-text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add composite index for filtering tours by company and date range
CREATE INDEX IF NOT EXISTS idx_tours_company_start_date 
ON tours(company_id, start_date);

-- Add GIN index for full-text search on tour_code
CREATE INDEX IF NOT EXISTS idx_tours_tour_code_trgm 
ON tours USING gin(tour_code gin_trgm_ops);

-- Add index on end_date for date range queries
CREATE INDEX IF NOT EXISTS idx_tours_end_date 
ON tours(end_date);

-- Ensure all child tables have proper CASCADE foreign keys
-- Drop existing foreign keys if they exist and recreate with CASCADE

-- tour_allowances
ALTER TABLE tour_allowances 
DROP CONSTRAINT IF EXISTS tour_allowances_tour_id_fkey;

ALTER TABLE tour_allowances 
ADD CONSTRAINT tour_allowances_tour_id_fkey 
FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE;

-- tour_destinations
ALTER TABLE tour_destinations 
DROP CONSTRAINT IF EXISTS tour_destinations_tour_id_fkey;

ALTER TABLE tour_destinations 
ADD CONSTRAINT tour_destinations_tour_id_fkey 
FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE;

-- tour_expenses
ALTER TABLE tour_expenses 
DROP CONSTRAINT IF EXISTS tour_expenses_tour_id_fkey;

ALTER TABLE tour_expenses 
ADD CONSTRAINT tour_expenses_tour_id_fkey 
FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE;

-- tour_images
ALTER TABLE tour_images 
DROP CONSTRAINT IF EXISTS tour_images_tour_id_fkey;

ALTER TABLE tour_images 
ADD CONSTRAINT tour_images_tour_id_fkey 
FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE;

-- tour_meals
ALTER TABLE tour_meals 
DROP CONSTRAINT IF EXISTS tour_meals_tour_id_fkey;

ALTER TABLE tour_meals 
ADD CONSTRAINT tour_meals_tour_id_fkey 
FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE;

-- tour_shoppings
ALTER TABLE tour_shoppings 
DROP CONSTRAINT IF EXISTS tour_shoppings_tour_id_fkey;

ALTER TABLE tour_shoppings 
ADD CONSTRAINT tour_shoppings_tour_id_fkey 
FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE;

-- ============================================
-- Migration: 20251006060418_a9198be1-6cee-4e31-8715-ba765da49f39.sql
-- ============================================

-- Enable pg_trgm extension for full-text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add composite index for filtering tours by company and date range
CREATE INDEX IF NOT EXISTS idx_tours_company_start_date 
ON tours(company_id, start_date);

-- Add GIN index for full-text search on tour_code
CREATE INDEX IF NOT EXISTS idx_tours_tour_code_trgm 
ON tours USING gin(tour_code gin_trgm_ops);

-- Add index on end_date for date range queries
CREATE INDEX IF NOT EXISTS idx_tours_end_date 
ON tours(end_date);

-- Ensure all child tables have proper CASCADE foreign keys
-- Drop existing foreign keys if they exist and recreate with CASCADE

-- tour_allowances
ALTER TABLE tour_allowances 
DROP CONSTRAINT IF EXISTS tour_allowances_tour_id_fkey;

ALTER TABLE tour_allowances 
ADD CONSTRAINT tour_allowances_tour_id_fkey 
FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE;

-- tour_destinations
ALTER TABLE tour_destinations 
DROP CONSTRAINT IF EXISTS tour_destinations_tour_id_fkey;

ALTER TABLE tour_destinations 
ADD CONSTRAINT tour_destinations_tour_id_fkey 
FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE;

-- tour_expenses
ALTER TABLE tour_expenses 
DROP CONSTRAINT IF EXISTS tour_expenses_tour_id_fkey;

ALTER TABLE tour_expenses 
ADD CONSTRAINT tour_expenses_tour_id_fkey 
FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE;

-- tour_images
ALTER TABLE tour_images 
DROP CONSTRAINT IF EXISTS tour_images_tour_id_fkey;

ALTER TABLE tour_images 
ADD CONSTRAINT tour_images_tour_id_fkey 
FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE;

-- tour_meals
ALTER TABLE tour_meals 
DROP CONSTRAINT IF EXISTS tour_meals_tour_id_fkey;

ALTER TABLE tour_meals 
ADD CONSTRAINT tour_meals_tour_id_fkey 
FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE;

-- tour_shoppings
ALTER TABLE tour_shoppings 
DROP CONSTRAINT IF EXISTS tour_shoppings_tour_id_fkey;

ALTER TABLE tour_shoppings 
ADD CONSTRAINT tour_shoppings_tour_id_fkey 
FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE;

-- ============================================
-- Migration: 20251006060454_4f3edcac-1636-4f8a-bb35-cef4c981e61f.sql
-- ============================================

-- Move pg_trgm extension to the extensions schema to resolve security warning
-- This prevents the extension's functions from being exposed through the public API

-- First ensure the extensions schema exists
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move the extension to the extensions schema
ALTER EXTENSION pg_trgm SET SCHEMA extensions;

-- ============================================
-- Migration: 20251007000001_add_guests_to_tour_destinations.sql
-- ============================================

-- Add optional guests column to tour_destinations to allow per-row guest counts
alter table if exists public.tour_destinations
  add column if not exists guests integer null;



-- ============================================
-- Migration: 20251007000002_add_guests_to_tour_expenses_and_meals.sql
-- ============================================

-- Add optional guests column to tour_expenses and tour_meals
alter table if exists public.tour_expenses
  add column if not exists guests integer null;

alter table if exists public.tour_meals
  add column if not exists guests integer null;



-- ============================================
-- Migration: 20251007071739_3aa31c73-4dbf-4db9-bb28-450fbb13d8a3.sql
-- ============================================

-- Add optional guests column to tour_expenses and tour_meals
alter table if exists public.tour_expenses
  add column if not exists guests integer null;

alter table if exists public.tour_meals
  add column if not exists guests integer null;

-- Add optional guests column to tour_destinations to allow per-row guest counts
alter table if exists public.tour_destinations
  add column if not exists guests integer null;

-- ============================================
-- Migration: 20251011112147_e04dd470-dbd4-4591-8560-de2aff3862a4.sql
-- ============================================

-- Create diary_types table
CREATE TABLE public.diary_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  search_keywords TEXT[] DEFAULT '{}'::text[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for diary_types
ALTER TABLE public.diary_types ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for diary_types
CREATE POLICY "Public read access" ON public.diary_types FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.diary_types FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.diary_types FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON public.diary_types FOR DELETE USING (true);

-- Create tour_diaries table
CREATE TABLE public.tour_diaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tour_id UUID REFERENCES public.tours(id) ON DELETE CASCADE,
  tour_code_at_booking TEXT,
  diary_type_id UUID REFERENCES public.diary_types(id) ON DELETE SET NULL,
  diary_type_name_at_booking TEXT,
  content_type TEXT NOT NULL,
  content_text TEXT,
  content_urls TEXT[] DEFAULT '{}'::text[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for tour_diaries
ALTER TABLE public.tour_diaries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tour_diaries
CREATE POLICY "Public read access" ON public.tour_diaries FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.tour_diaries FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.tour_diaries FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON public.tour_diaries FOR DELETE USING (true);

-- Create triggers for updated_at
CREATE TRIGGER update_diary_types_updated_at
  BEFORE UPDATE ON public.diary_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tour_diaries_updated_at
  BEFORE UPDATE ON public.tour_diaries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default diary types
INSERT INTO public.diary_types (name) VALUES
  ('Text'),
  ('Image'),
  ('Video');

-- ============================================
-- Migration: 20251011120000_add_data_type_to_diary_types.sql
-- ============================================

-- Add data_type column to diary_types table
ALTER TABLE diary_types ADD COLUMN IF NOT EXISTS data_type TEXT NOT NULL DEFAULT 'text';

-- Add a comment to describe the column
COMMENT ON COLUMN diary_types.data_type IS 'The data type for this diary entry: text, date, time, datetime, number, boolean, image, video, audio, location';


-- ============================================
-- Migration: 20251011120100_add_data_type_to_tour_diaries.sql
-- ============================================

-- Add diary_type_data_type column to tour_diaries table to store the data type at booking time
ALTER TABLE tour_diaries ADD COLUMN IF NOT EXISTS diary_type_data_type TEXT NOT NULL DEFAULT 'text';

-- Add a comment to describe the column
COMMENT ON COLUMN tour_diaries.diary_type_data_type IS 'The data type of the diary type at booking time (denormalized for historical accuracy)';


-- ============================================
-- Migration: 20251012085626_8238fa82-698a-474a-9b3e-91b5d4600d3e.sql
-- ============================================

-- Add data_type column to diary_types table
ALTER TABLE diary_types ADD COLUMN IF NOT EXISTS data_type TEXT NOT NULL DEFAULT 'text';

-- Add a comment to describe the column
COMMENT ON COLUMN diary_types.data_type IS 'The data type for this diary entry: text, date, time, datetime, number, boolean, image, video, audio, location';

-- Add diary_type_data_type column to tour_diaries table to store the data type at booking time
ALTER TABLE tour_diaries ADD COLUMN IF NOT EXISTS diary_type_data_type TEXT NOT NULL DEFAULT 'text';

-- Add a comment to describe the column
COMMENT ON COLUMN tour_diaries.diary_type_data_type IS 'The data type of the diary type at booking time (denormalized for historical accuracy)';

