-- Add province_id and province_name_at_booking to restaurants table
ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS province_id UUID,
ADD COLUMN IF NOT EXISTS province_name_at_booking TEXT;

-- Add foreign key constraint to provinces table
ALTER TABLE public.restaurants
ADD CONSTRAINT restaurants_province_id_fkey
FOREIGN KEY (province_id)
REFERENCES public.provinces(id)
ON DELETE SET NULL;

-- Create index on province_id for faster lookups
CREATE INDEX IF NOT EXISTS restaurants_province_id_idx ON public.restaurants (province_id);

-- Add province_id and province_name_at_booking to shop_places table
ALTER TABLE public.shop_places
ADD COLUMN IF NOT EXISTS province_id UUID,
ADD COLUMN IF NOT EXISTS province_name_at_booking TEXT;

-- Add foreign key constraint to provinces table
ALTER TABLE public.shop_places
ADD CONSTRAINT shop_places_province_id_fkey
FOREIGN KEY (province_id)
REFERENCES public.provinces(id)
ON DELETE SET NULL;

-- Create index on province_id for faster lookups
CREATE INDEX IF NOT EXISTS shop_places_province_id_idx ON public.shop_places (province_id);
