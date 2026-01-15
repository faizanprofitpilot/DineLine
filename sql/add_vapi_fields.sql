-- Add Vapi fields to firms and calls tables

-- Add vapi_phone_number to firms table
ALTER TABLE firms
ADD COLUMN IF NOT EXISTS vapi_phone_number TEXT;

-- Add vapi_assistant_id to firms table
ALTER TABLE firms
ADD COLUMN IF NOT EXISTS vapi_assistant_id TEXT;

-- Add vapi_conversation_id to calls table
ALTER TABLE calls
ADD COLUMN IF NOT EXISTS vapi_conversation_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_calls_vapi_conversation_id ON calls(vapi_conversation_id);
CREATE INDEX IF NOT EXISTS idx_firms_vapi_phone_number ON firms(vapi_phone_number);
CREATE INDEX IF NOT EXISTS idx_firms_vapi_assistant_id ON firms(vapi_assistant_id);

