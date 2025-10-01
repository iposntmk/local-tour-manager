-- Add unique constraint on tour_code
ALTER TABLE tours ADD CONSTRAINT tours_tour_code_unique UNIQUE (tour_code);