-- Add summary column to tours table
ALTER TABLE public.tours ADD COLUMN IF NOT EXISTS summary JSONB DEFAULT '{"totalTabs": 0}';