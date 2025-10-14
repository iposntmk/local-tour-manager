-- Add province_id and province_name_at_booking to hotels table
ALTER TABLE public.hotels
ADD COLUMN IF NOT EXISTS province_id UUID,
ADD COLUMN IF NOT EXISTS province_name_at_booking TEXT;

-- Add foreign key constraint to provinces table
ALTER TABLE public.hotels
ADD CONSTRAINT hotels_province_id_fkey
FOREIGN KEY (province_id)
REFERENCES public.provinces(id)
ON DELETE SET NULL;

-- Create index on province_id for faster lookups
CREATE INDEX IF NOT EXISTS hotels_province_id_idx ON public.hotels (province_id);
