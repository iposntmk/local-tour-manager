-- Add tip column to tour_shoppings table
ALTER TABLE tour_shoppings ADD COLUMN IF NOT EXISTS tip NUMERIC(10, 2) NOT NULL DEFAULT 0;
