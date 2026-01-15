-- Check if your firm has the Vapi fields populated
-- Replace 'YOUR_FIRM_ID' with your actual firm ID, or run without WHERE to see all firms

SELECT 
  id,
  firm_name,
  vapi_assistant_id,
  vapi_phone_number_id,
  inbound_number_e164,
  telephony_provider
FROM firms
-- WHERE id = 'YOUR_FIRM_ID'  -- Uncomment and add your firm ID
ORDER BY created_at DESC
LIMIT 10;

-- Check if assistant ID matches what Vapi is sending
-- This will help identify if the assistant ID in the webhook matches your firm

