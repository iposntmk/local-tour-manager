-- Create restaurants table
CREATE TABLE IF NOT EXISTS public.restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  restaurant_type TEXT NOT NULL CHECK (restaurant_type IN ('asian', 'indian', 'western', 'local', 'other')),
  phone TEXT,
  address TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  search_keywords TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique index on restaurant name (case insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS restaurants_name_unique_idx ON public.restaurants (LOWER(name));

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS restaurants_status_idx ON public.restaurants (status);

-- Create GIN index for search keywords
CREATE INDEX IF NOT EXISTS restaurants_search_keywords_idx ON public.restaurants USING GIN (search_keywords);

-- Create shop_places table
CREATE TABLE IF NOT EXISTS public.shop_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  shop_type TEXT NOT NULL CHECK (shop_type IN ('clothing', 'food_and_beverage', 'souvenirs', 'handicrafts', 'electronics', 'other')),
  phone TEXT,
  address TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  search_keywords TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique index on shop place name (case insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS shop_places_name_unique_idx ON public.shop_places (LOWER(name));

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS shop_places_status_idx ON public.shop_places (status);

-- Create GIN index for search keywords
CREATE INDEX IF NOT EXISTS shop_places_search_keywords_idx ON public.shop_places USING GIN (search_keywords);

-- Create hotels table
CREATE TABLE IF NOT EXISTS public.hotels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  owner_phone TEXT NOT NULL,
  room_type TEXT NOT NULL CHECK (room_type IN ('single', 'double', 'group', 'suite')),
  price_per_night NUMERIC NOT NULL DEFAULT 0,
  address TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  search_keywords TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique index on hotel name (case insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS hotels_name_unique_idx ON public.hotels (LOWER(name));

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS hotels_status_idx ON public.hotels (status);

-- Create GIN index for search keywords
CREATE INDEX IF NOT EXISTS hotels_search_keywords_idx ON public.hotels USING GIN (search_keywords);

-- Enable Row Level Security
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;

-- Create policies for restaurants (allow all authenticated users)
CREATE POLICY "Allow authenticated users to read restaurants"
  ON public.restaurants FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert restaurants"
  ON public.restaurants FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update restaurants"
  ON public.restaurants FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete restaurants"
  ON public.restaurants FOR DELETE
  TO authenticated
  USING (true);

-- Create policies for shop_places (allow all authenticated users)
CREATE POLICY "Allow authenticated users to read shop_places"
  ON public.shop_places FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert shop_places"
  ON public.shop_places FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update shop_places"
  ON public.shop_places FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete shop_places"
  ON public.shop_places FOR DELETE
  TO authenticated
  USING (true);

-- Create policies for hotels (allow all authenticated users)
CREATE POLICY "Allow authenticated users to read hotels"
  ON public.hotels FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert hotels"
  ON public.hotels FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update hotels"
  ON public.hotels FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete hotels"
  ON public.hotels FOR DELETE
  TO authenticated
  USING (true);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_restaurants_updated_at
  BEFORE UPDATE ON public.restaurants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shop_places_updated_at
  BEFORE UPDATE ON public.shop_places
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_hotels_updated_at
  BEFORE UPDATE ON public.hotels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
