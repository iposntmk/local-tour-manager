-- Add guide explanations, VAT details, and per-line evidence attachments.

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['tour_destinations', 'tour_meals', 'tour_expenses']
  LOOP
    EXECUTE format($f$
      ALTER TABLE public.%I
        ADD COLUMN IF NOT EXISTS guide_note TEXT,
        ADD COLUMN IF NOT EXISTS vat_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS vat_amount NUMERIC(12,2) NOT NULL DEFAULT 0;
    $f$, t);
  END LOOP;
END $$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tour-line-attachments',
  'tour-line-attachments',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS tour_line_attachments_storage_select ON storage.objects;
DROP POLICY IF EXISTS tour_line_attachments_storage_insert ON storage.objects;
DROP POLICY IF EXISTS tour_line_attachments_storage_update ON storage.objects;
DROP POLICY IF EXISTS tour_line_attachments_storage_delete ON storage.objects;

CREATE POLICY tour_line_attachments_storage_select
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tour-line-attachments');

CREATE POLICY tour_line_attachments_storage_insert
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'tour-line-attachments');

CREATE POLICY tour_line_attachments_storage_update
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'tour-line-attachments');

CREATE POLICY tour_line_attachments_storage_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'tour-line-attachments');

CREATE TABLE IF NOT EXISTS public.tour_line_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  line_type TEXT NOT NULL CHECK (line_type IN ('destination', 'meal', 'expense')),
  line_id UUID NOT NULL,
  file_path TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  uploaded_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tour_line_attachments_tour
  ON public.tour_line_attachments(tour_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tour_line_attachments_line
  ON public.tour_line_attachments(line_type, line_id);

ALTER TABLE public.tour_line_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tour_line_attachments_select ON public.tour_line_attachments;
DROP POLICY IF EXISTS tour_line_attachments_insert ON public.tour_line_attachments;
DROP POLICY IF EXISTS tour_line_attachments_delete ON public.tour_line_attachments;

CREATE POLICY tour_line_attachments_select
  ON public.tour_line_attachments
  FOR SELECT TO authenticated
  USING (public.can_view_tour(tour_id));

CREATE POLICY tour_line_attachments_insert
  ON public.tour_line_attachments
  FOR INSERT TO authenticated
  WITH CHECK (public.is_tour_owner(tour_id));

CREATE POLICY tour_line_attachments_delete
  ON public.tour_line_attachments
  FOR DELETE TO authenticated
  USING (public.is_tour_owner(tour_id));

GRANT SELECT, INSERT, DELETE ON public.tour_line_attachments TO authenticated;
