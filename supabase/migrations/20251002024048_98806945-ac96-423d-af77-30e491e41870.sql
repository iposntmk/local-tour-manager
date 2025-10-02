-- Add summary columns to tours table
ALTER TABLE tours 
ADD COLUMN IF NOT EXISTS total_tabs numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS advance_payment numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_after_advance numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS company_tip numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_after_tip numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS collections_for_company numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_after_collections numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS final_total numeric DEFAULT 0;