-- Add diary_type_data_type column to tour_diaries table to store the data type at booking time
ALTER TABLE tour_diaries ADD COLUMN IF NOT EXISTS diary_type_data_type TEXT NOT NULL DEFAULT 'text';

-- Add a comment to describe the column
COMMENT ON COLUMN tour_diaries.diary_type_data_type IS 'The data type of the diary type at booking time (denormalized for historical accuracy)';
