-- Create diary_types table
CREATE TABLE public.diary_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  search_keywords TEXT[] DEFAULT '{}'::text[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for diary_types
ALTER TABLE public.diary_types ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for diary_types
CREATE POLICY "Public read access" ON public.diary_types FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.diary_types FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.diary_types FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON public.diary_types FOR DELETE USING (true);

-- Create tour_diaries table
CREATE TABLE public.tour_diaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tour_id UUID REFERENCES public.tours(id) ON DELETE CASCADE,
  tour_code_at_booking TEXT,
  diary_type_id UUID REFERENCES public.diary_types(id) ON DELETE SET NULL,
  diary_type_name_at_booking TEXT,
  content_type TEXT NOT NULL,
  content_text TEXT,
  content_urls TEXT[] DEFAULT '{}'::text[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for tour_diaries
ALTER TABLE public.tour_diaries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tour_diaries
CREATE POLICY "Public read access" ON public.tour_diaries FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.tour_diaries FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.tour_diaries FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON public.tour_diaries FOR DELETE USING (true);

-- Create triggers for updated_at
CREATE TRIGGER update_diary_types_updated_at
  BEFORE UPDATE ON public.diary_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tour_diaries_updated_at
  BEFORE UPDATE ON public.tour_diaries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default diary types
INSERT INTO public.diary_types (name) VALUES
  ('Text'),
  ('Image'),
  ('Video');