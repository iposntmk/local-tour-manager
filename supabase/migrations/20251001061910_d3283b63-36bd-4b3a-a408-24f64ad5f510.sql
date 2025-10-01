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