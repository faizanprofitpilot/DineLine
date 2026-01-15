-- Make twilio_call_sid nullable for Vapi calls
ALTER TABLE calls
ALTER COLUMN twilio_call_sid DROP NOT NULL;

