CREATE TABLE IF NOT EXISTS public.languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  native_name TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  search_keywords TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT languages_code_unique UNIQUE (code)
);

CREATE TABLE IF NOT EXISTS public.guide_languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID NOT NULL REFERENCES public.guides(id) ON DELETE CASCADE,
  language_id UUID NOT NULL REFERENCES public.languages(id) ON DELETE RESTRICT,
  proficiency TEXT NOT NULL DEFAULT 'working',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT guide_languages_guide_language_unique UNIQUE (guide_id, language_id),
  CONSTRAINT guide_languages_proficiency_check CHECK (proficiency IN ('basic', 'working', 'fluent', 'native'))
);

CREATE TABLE IF NOT EXISTS public.nationality_languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nationality_id UUID NOT NULL REFERENCES public.nationalities(id) ON DELETE CASCADE,
  language_id UUID NOT NULL REFERENCES public.languages(id) ON DELETE RESTRICT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  priority INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT nationality_languages_nationality_language_unique UNIQUE (nationality_id, language_id)
);

INSERT INTO public.languages (code, name, native_name, search_keywords)
VALUES
  ('en', 'English', 'English', ARRAY['english','en']),
  ('fr', 'French', 'Francais', ARRAY['french','fr','francais']),
  ('vi', 'Vietnamese', 'Tieng Viet', ARRAY['vietnamese','vi','tieng viet']),
  ('zh', 'Chinese', 'Chinese', ARRAY['chinese','zh','mandarin']),
  ('ja', 'Japanese', 'Japanese', ARRAY['japanese','ja']),
  ('ko', 'Korean', 'Korean', ARRAY['korean','ko']),
  ('de', 'German', 'Deutsch', ARRAY['german','de','deutsch']),
  ('es', 'Spanish', 'Espanol', ARRAY['spanish','es','espanol']),
  ('it', 'Italian', 'Italiano', ARRAY['italian','it','italiano']),
  ('ru', 'Russian', 'Russian', ARRAY['russian','ru'])
ON CONFLICT (code) DO NOTHING;

ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guide_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nationality_languages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access" ON public.languages;
DROP POLICY IF EXISTS "Public insert access" ON public.languages;
DROP POLICY IF EXISTS "Public update access" ON public.languages;
DROP POLICY IF EXISTS "Public delete access" ON public.languages;

CREATE POLICY "Public read access" ON public.languages FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.languages FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.languages FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON public.languages FOR DELETE USING (true);

DROP POLICY IF EXISTS "Public read access" ON public.guide_languages;
DROP POLICY IF EXISTS "Public insert access" ON public.guide_languages;
DROP POLICY IF EXISTS "Public update access" ON public.guide_languages;
DROP POLICY IF EXISTS "Public delete access" ON public.guide_languages;

CREATE POLICY "Public read access" ON public.guide_languages FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.guide_languages FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.guide_languages FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON public.guide_languages FOR DELETE USING (true);

DROP POLICY IF EXISTS "Public read access" ON public.nationality_languages;
DROP POLICY IF EXISTS "Public insert access" ON public.nationality_languages;
DROP POLICY IF EXISTS "Public update access" ON public.nationality_languages;
DROP POLICY IF EXISTS "Public delete access" ON public.nationality_languages;

CREATE POLICY "Public read access" ON public.nationality_languages FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.nationality_languages FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.nationality_languages FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON public.nationality_languages FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_guide_languages_guide_id ON public.guide_languages(guide_id);
CREATE INDEX IF NOT EXISTS idx_guide_languages_language_id ON public.guide_languages(language_id);
CREATE INDEX IF NOT EXISTS idx_nationality_languages_nationality_id ON public.nationality_languages(nationality_id);
CREATE INDEX IF NOT EXISTS idx_nationality_languages_language_id ON public.nationality_languages(language_id);

DROP TRIGGER IF EXISTS update_languages_updated_at ON public.languages;
CREATE TRIGGER update_languages_updated_at
  BEFORE UPDATE ON public.languages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_guide_languages_updated_at ON public.guide_languages;
CREATE TRIGGER update_guide_languages_updated_at
  BEFORE UPDATE ON public.guide_languages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_nationality_languages_updated_at ON public.nationality_languages;
CREATE TRIGGER update_nationality_languages_updated_at
  BEFORE UPDATE ON public.nationality_languages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
