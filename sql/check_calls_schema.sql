-- Diagnostic query to check calls table schema
-- Run this to see what constraints and columns exist

-- Check if route_reason column exists
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'calls' 
AND column_name = 'route_reason';

-- Check if twilio_call_sid is nullable
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'calls' 
AND column_name = 'twilio_call_sid';

-- Check if vapi_conversation_id exists
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'calls' 
AND column_name = 'vapi_conversation_id';

-- Check for UNIQUE constraints on twilio_call_sid
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'calls'::regclass
AND conname LIKE '%twilio_call_sid%';

-- Check for indexes on twilio_call_sid
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'calls'
AND indexname LIKE '%twilio_call_sid%';

-- Check all columns in calls table
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'calls'
ORDER BY ordinal_position;

