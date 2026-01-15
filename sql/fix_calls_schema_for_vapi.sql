-- Fix calls table schema to support Vapi calls
-- This ensures all necessary fields exist and constraints are correct

-- ============================================
-- 1. Ensure twilio_call_sid is nullable (for Vapi calls)
-- ============================================
ALTER TABLE calls
ALTER COLUMN twilio_call_sid DROP NOT NULL;

-- Remove UNIQUE constraint if it exists
-- PostgreSQL creates unique indexes for UNIQUE constraints
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Try to drop the constraint (if it exists as a constraint)
  BEGIN
    ALTER TABLE calls DROP CONSTRAINT IF EXISTS calls_twilio_call_sid_key;
  EXCEPTION WHEN OTHERS THEN
    -- Constraint doesn't exist or has different name, continue
    NULL;
  END;
  
  -- Drop any unique index on this column
  -- Find and drop all unique indexes on twilio_call_sid
  FOR r IN (
    SELECT indexname 
    FROM pg_indexes 
    WHERE tablename = 'calls' 
    AND indexname LIKE '%twilio_call_sid%'
  ) LOOP
    EXECUTE 'DROP INDEX IF EXISTS ' || quote_ident(r.indexname);
  END LOOP;
END $$;

-- Recreate as a regular index (not unique) to allow multiple NULLs
-- Only index non-null values for performance
DROP INDEX IF EXISTS idx_calls_twilio_call_sid;
CREATE INDEX IF NOT EXISTS idx_calls_twilio_call_sid 
ON calls(twilio_call_sid) 
WHERE twilio_call_sid IS NOT NULL;

-- ============================================
-- 2. Ensure route_reason is removed (if migration wasn't run)
-- ============================================
ALTER TABLE calls
DROP COLUMN IF EXISTS route_reason;

-- ============================================
-- 3. Ensure vapi_conversation_id exists
-- ============================================
ALTER TABLE calls
ADD COLUMN IF NOT EXISTS vapi_conversation_id TEXT;

-- Create unique index on vapi_conversation_id (to prevent duplicates)
-- Only index non-null values
CREATE UNIQUE INDEX IF NOT EXISTS idx_calls_vapi_conversation_id_unique 
ON calls(vapi_conversation_id) 
WHERE vapi_conversation_id IS NOT NULL;

-- Also create a regular index for lookups
CREATE INDEX IF NOT EXISTS idx_calls_vapi_conversation_id 
ON calls(vapi_conversation_id);

-- ============================================
-- 4. Ensure call_category exists
-- ============================================
ALTER TABLE calls
ADD COLUMN IF NOT EXISTS call_category TEXT;

CREATE INDEX IF NOT EXISTS idx_calls_call_category ON calls(call_category);

-- ============================================
-- 5. Ensure from_number and to_number can be empty strings (for Vapi calls that might not have caller info initially)
-- ============================================
-- These are already TEXT NOT NULL, which allows empty strings, so no change needed
-- But let's verify they're not constrained to be non-empty

-- ============================================
-- Summary
-- ============================================
-- After running this migration, the calls table should support:
-- - Vapi calls with NULL twilio_call_sid
-- - Vapi calls with vapi_conversation_id
-- - Calls without route_reason
-- - Calls with optional call_category
-- - Multiple calls with NULL twilio_call_sid (no unique constraint violation)

