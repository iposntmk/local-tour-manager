-- ============================================
-- Add Foreign Keys and Refresh Schema
-- ============================================

-- Drop existing foreign keys if they exist (to recreate them)
ALTER TABLE IF EXISTS public.tour_destinations DROP CONSTRAINT IF EXISTS tour_destinations_tour_id_fkey CASCADE;
ALTER TABLE IF EXISTS public.tour_expenses DROP CONSTRAINT IF EXISTS tour_expenses_tour_id_fkey CASCADE;
ALTER TABLE IF EXISTS public.tour_meals DROP CONSTRAINT IF EXISTS tour_meals_tour_id_fkey CASCADE;
ALTER TABLE IF EXISTS public.tour_allowances DROP CONSTRAINT IF EXISTS tour_allowances_tour_id_fkey CASCADE;
ALTER TABLE IF EXISTS public.tour_shoppings DROP CONSTRAINT IF EXISTS tour_shoppings_tour_id_fkey CASCADE;
ALTER TABLE IF EXISTS public.tour_images DROP CONSTRAINT IF EXISTS tour_images_tour_id_fkey CASCADE;
ALTER TABLE IF EXISTS public.tour_images DROP CONSTRAINT IF EXISTS fk_tour CASCADE;
ALTER TABLE IF EXISTS public.tour_diaries DROP CONSTRAINT IF EXISTS tour_diaries_tour_id_fkey CASCADE;

-- Add foreign keys with ON DELETE CASCADE
ALTER TABLE public.tour_destinations
  ADD CONSTRAINT tour_destinations_tour_id_fkey
  FOREIGN KEY (tour_id)
  REFERENCES public.tours(id)
  ON DELETE CASCADE;

ALTER TABLE public.tour_expenses
  ADD CONSTRAINT tour_expenses_tour_id_fkey
  FOREIGN KEY (tour_id)
  REFERENCES public.tours(id)
  ON DELETE CASCADE;

ALTER TABLE public.tour_meals
  ADD CONSTRAINT tour_meals_tour_id_fkey
  FOREIGN KEY (tour_id)
  REFERENCES public.tours(id)
  ON DELETE CASCADE;

ALTER TABLE public.tour_allowances
  ADD CONSTRAINT tour_allowances_tour_id_fkey
  FOREIGN KEY (tour_id)
  REFERENCES public.tours(id)
  ON DELETE CASCADE;

ALTER TABLE public.tour_shoppings
  ADD CONSTRAINT tour_shoppings_tour_id_fkey
  FOREIGN KEY (tour_id)
  REFERENCES public.tours(id)
  ON DELETE CASCADE;

-- Add foreign key for tour_images if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tour_images') THEN
    ALTER TABLE public.tour_images
      ADD CONSTRAINT tour_images_tour_id_fkey
      FOREIGN KEY (tour_id)
      REFERENCES public.tours(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key for tour_diaries if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tour_diaries') THEN
    ALTER TABLE public.tour_diaries
      ADD CONSTRAINT tour_diaries_tour_id_fkey
      FOREIGN KEY (tour_id)
      REFERENCES public.tours(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes for foreign keys to improve performance
CREATE INDEX IF NOT EXISTS idx_tour_destinations_tour_id ON public.tour_destinations(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_expenses_tour_id ON public.tour_expenses(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_meals_tour_id ON public.tour_meals(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_allowances_tour_id ON public.tour_allowances(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_shoppings_tour_id ON public.tour_shoppings(tour_id);

-- Verify foreign keys exist
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name LIKE 'tour_%'
  AND ccu.table_name = 'tours'
ORDER BY tc.table_name;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
