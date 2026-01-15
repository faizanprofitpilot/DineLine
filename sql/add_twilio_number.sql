-- Add twilio_number column to firms table
-- Run this in your Supabase SQL Editor

ALTER TABLE firms 
ADD COLUMN IF NOT EXISTS twilio_number TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_firms_twilio_number ON firms(twilio_number);

