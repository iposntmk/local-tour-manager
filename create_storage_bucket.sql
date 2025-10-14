-- ============================================
-- Create Storage Bucket for Tour Images
-- ============================================

-- Create the storage bucket (using 'tour-images' to match the code)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tour-images',
  'tour-images',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete" ON storage.objects;

-- Create policy to allow public reads
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'tour-images');

-- Create policy to allow authenticated uploads
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'tour-images');

-- Create policy to allow authenticated updates
CREATE POLICY "Authenticated users can update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'tour-images');

-- Create policy to allow authenticated deletes
CREATE POLICY "Authenticated users can delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'tour-images');
