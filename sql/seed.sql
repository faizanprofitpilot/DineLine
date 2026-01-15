-- Seed data for testing
-- Note: Replace 'YOUR_USER_ID' with an actual user ID from auth.users after creating a user

-- Insert a test firm
-- First, you need to create a user via Supabase Auth, then get their ID
-- Example: INSERT INTO firms (owner_user_id, firm_name, forward_to_number, notify_emails, mode)
-- VALUES ('YOUR_USER_ID', 'Test Law Firm', '+15551234567', ARRAY['test@example.com'], 'both');

-- Or use this to create a firm for the currently authenticated user:
-- INSERT INTO firms (owner_user_id, firm_name, forward_to_number, notify_emails, mode, timezone, open_days, open_time, close_time, failover_ring_seconds)
-- VALUES (
--   auth.uid(),
--   'Demo Law Firm',
--   '+15551234567',
--   ARRAY['demo@example.com'],
--   'both',
--   'America/New_York',
--   ARRAY[1,2,3,4,5],
--   '09:00',
--   '17:00',
--   20
-- );

-- Sample call records (for demo purposes)
-- These should be created via the application, but you can manually insert for testing:
/*
INSERT INTO calls (
  firm_id,
  twilio_call_sid,
  from_number,
  to_number,
  route_reason,
  status,
  urgency,
  intake_json,
  summary_json
) VALUES (
  (SELECT id FROM firms LIMIT 1),
  'CA1234567890abcdef',
  '+15559876543',
  '+15551234567',
  'after_hours',
  'emailed',
  'normal',
  '{"full_name": "John Doe", "callback_number": "+15559876543", "reason_for_call": "Car accident"}',
  '{"title": "Car Accident Intake", "summary_bullets": ["Caller involved in car accident"], "key_facts": {}, "action_items": ["Follow up within 24 hours"], "urgency_level": "normal", "follow_up_recommendation": "Standard follow-up"}'
);
*/

