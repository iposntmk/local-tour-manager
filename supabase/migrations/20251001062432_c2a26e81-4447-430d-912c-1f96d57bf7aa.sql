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