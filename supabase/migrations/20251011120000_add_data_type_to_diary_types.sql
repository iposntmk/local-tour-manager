-- Add data_type column to diary_types table
ALTER TABLE diary_types ADD COLUMN IF NOT EXISTS data_type TEXT NOT NULL DEFAULT 'text';

-- Add a comment to describe the column
COMMENT ON COLUMN diary_types.data_type IS 'The data type for this diary entry: text, date, time, datetime, number, boolean, image, video, audio, location';
