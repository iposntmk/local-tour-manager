-- Enable pg_trgm extension for full-text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add composite index for filtering tours by company and date range
CREATE INDEX IF NOT EXISTS idx_tours_company_start_date 
ON tours(company_id, start_date);

-- Add GIN index for full-text search on tour_code
CREATE INDEX IF NOT EXISTS idx_tours_tour_code_trgm 
ON tours USING gin(tour_code gin_trgm_ops);

-- Add index on end_date for date range queries
CREATE INDEX IF NOT EXISTS idx_tours_end_date 
ON tours(end_date);

-- Ensure all child tables have proper CASCADE foreign keys
-- Drop existing foreign keys if they exist and recreate with CASCADE

-- tour_allowances
ALTER TABLE tour_allowances 
DROP CONSTRAINT IF EXISTS tour_allowances_tour_id_fkey;

ALTER TABLE tour_allowances 
ADD CONSTRAINT tour_allowances_tour_id_fkey 
FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE;

-- tour_destinations
ALTER TABLE tour_destinations 
DROP CONSTRAINT IF EXISTS tour_destinations_tour_id_fkey;

ALTER TABLE tour_destinations 
ADD CONSTRAINT tour_destinations_tour_id_fkey 
FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE;

-- tour_expenses
ALTER TABLE tour_expenses 
DROP CONSTRAINT IF EXISTS tour_expenses_tour_id_fkey;

ALTER TABLE tour_expenses 
ADD CONSTRAINT tour_expenses_tour_id_fkey 
FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE;

-- tour_images
ALTER TABLE tour_images 
DROP CONSTRAINT IF EXISTS tour_images_tour_id_fkey;

ALTER TABLE tour_images 
ADD CONSTRAINT tour_images_tour_id_fkey 
FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE;

-- tour_meals
ALTER TABLE tour_meals 
DROP CONSTRAINT IF EXISTS tour_meals_tour_id_fkey;

ALTER TABLE tour_meals 
ADD CONSTRAINT tour_meals_tour_id_fkey 
FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE;

-- tour_shoppings
ALTER TABLE tour_shoppings 
DROP CONSTRAINT IF EXISTS tour_shoppings_tour_id_fkey;

ALTER TABLE tour_shoppings 
ADD CONSTRAINT tour_shoppings_tour_id_fkey 
FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE;