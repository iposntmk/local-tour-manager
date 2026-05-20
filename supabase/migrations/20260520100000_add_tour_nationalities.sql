CREATE TABLE IF NOT EXISTS public.tour_nationalities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  nationality_id UUID NOT NULL REFERENCES public.nationalities(id) ON DELETE RESTRICT,
  nationality_name_at_booking TEXT NOT NULL,
  pax_count INTEGER NOT NULL DEFAULT 1 CHECK (pax_count > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT tour_nationalities_tour_nationality_unique UNIQUE (tour_id, nationality_id)
);

INSERT INTO public.tour_nationalities (
  tour_id,
  nationality_id,
  nationality_name_at_booking,
  pax_count
)
SELECT
  t.id,
  t.nationality_id,
  COALESCE(NULLIF(t.nationality_name_at_booking, ''), n.name, ''),
  GREATEST(COALESCE(t.total_guests, t.adults + t.children, t.number_of_guests, 1), 1)
FROM public.tours t
LEFT JOIN public.nationalities n ON n.id = t.nationality_id
WHERE t.nationality_id IS NOT NULL
ON CONFLICT (tour_id, nationality_id) DO NOTHING;

ALTER TABLE public.tour_nationalities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access" ON public.tour_nationalities;
DROP POLICY IF EXISTS "Public insert access" ON public.tour_nationalities;
DROP POLICY IF EXISTS "Public update access" ON public.tour_nationalities;
DROP POLICY IF EXISTS "Public delete access" ON public.tour_nationalities;

CREATE POLICY "Public read access" ON public.tour_nationalities FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.tour_nationalities FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.tour_nationalities FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON public.tour_nationalities FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_tour_nationalities_tour_id ON public.tour_nationalities(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_nationalities_nationality_id ON public.tour_nationalities(nationality_id);

DROP TRIGGER IF EXISTS update_tour_nationalities_updated_at ON public.tour_nationalities;
CREATE TRIGGER update_tour_nationalities_updated_at
  BEFORE UPDATE ON public.tour_nationalities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
