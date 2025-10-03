-- Add notes column to tours table
ALTER TABLE tours ADD COLUMN IF NOT EXISTS notes TEXT;
