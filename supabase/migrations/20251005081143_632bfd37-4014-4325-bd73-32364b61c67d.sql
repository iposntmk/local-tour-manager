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