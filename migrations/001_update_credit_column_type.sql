-- Migration: Update credit_events.credit column to NUMERIC for better decimal handling
-- Run this migration if you need to support decimal credit values instead of integers

-- First, create a backup of the current data
CREATE TABLE IF NOT EXISTS credit_events_backup AS SELECT * FROM credit_events;

-- Update the column type to NUMERIC
ALTER TABLE credit_events 
ALTER COLUMN credit TYPE NUMERIC(10,2);

-- Add a comment to document the change
COMMENT ON COLUMN credit_events.credit IS 'Credit value as numeric with 2 decimal places';

-- Optional: Add a check constraint to ensure positive values
ALTER TABLE credit_events 
ADD CONSTRAINT credit_positive_check CHECK (credit >= 0);

-- Verify the migration
SELECT column_name, data_type, numeric_precision, numeric_scale 
FROM information_schema.columns 
WHERE table_name = 'credit_events' AND column_name = 'credit'; 