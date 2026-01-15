-- Check for UNIQUE constraints on twilio_call_sid that might block inserts
-- Run this to see if there are any constraints preventing multiple NULL values

-- Check all constraints on calls table
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'calls'::regclass
ORDER BY conname;

-- Check all indexes on calls table (UNIQUE constraints create indexes)
SELECT 
  indexname,
  indexdef,
  CASE 
    WHEN indexdef LIKE '%UNIQUE%' THEN 'UNIQUE'
    ELSE 'REGULAR'
  END AS index_type
FROM pg_indexes
WHERE tablename = 'calls'
ORDER BY indexname;

-- Specifically check for twilio_call_sid constraints
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'calls'::regclass
AND (
  conname LIKE '%twilio_call_sid%' 
  OR pg_get_constraintdef(oid) LIKE '%twilio_call_sid%'
);


