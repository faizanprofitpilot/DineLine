-- Add custom instructions field to restaurants table
-- This allows users to provide bespoke instructions that modify the AI agent's prompt

ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS ai_custom_instructions TEXT;

COMMENT ON COLUMN restaurants.ai_custom_instructions IS 'Custom instructions that modify the AI agent prompt behavior. These are appended to the system prompt to allow restaurant-specific customization.';
