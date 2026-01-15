-- DineLine Complete Schema
-- Run this in your Supabase SQL Editor to set up the entire database from scratch
-- This script is idempotent - safe to run multiple times

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- RESTAURANTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS restaurants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  kitchen_emails TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  hours_open TIME NOT NULL DEFAULT '09:00',
  hours_close TIME NOT NULL DEFAULT '17:00',
  after_hours_take_orders BOOLEAN NOT NULL DEFAULT true,
  reservations_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Legacy/optional fields for phone number management
  vapi_phone_number_id TEXT,
  vapi_assistant_id TEXT,
  inbound_number_e164 TEXT,
  twilio_phone_number_sid TEXT,
  telephony_provider TEXT,
  ai_greeting_custom TEXT,
  ai_tone TEXT DEFAULT 'warm' CHECK (ai_tone IN ('professional', 'warm', 'friendly', 'formal')),
  ai_knowledge_base TEXT,
  -- Stripe subscription fields (optional - for billing)
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete', 'incomplete_expired', 'unpaid', 'inactive')),
  subscription_plan TEXT CHECK (subscription_plan IN ('starter', 'professional', 'turbo')),
  subscription_current_period_end TIMESTAMP WITH TIME ZONE,
  subscription_cancel_at_period_end BOOLEAN DEFAULT FALSE
);

-- ============================================================================
-- ORDERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'completed')),
  intent TEXT NOT NULL DEFAULT 'order' CHECK (intent IN ('order', 'reservation', 'info')),
  order_type TEXT CHECK (order_type IN ('pickup', 'delivery', 'reservation')),
  customer_name TEXT,
  customer_phone TEXT,
  delivery_address TEXT,
  requested_time TEXT, -- Simple text like "ASAP" or "7:30 PM"
  items JSONB, -- Array of {name, qty?, notes?}
  special_instructions TEXT,
  ai_summary TEXT,
  transcript_text TEXT,
  audio_url TEXT,
  raw_payload JSONB, -- Full extracted data from voice agent
  -- Legacy fields for migration compatibility
  twilio_call_sid TEXT,
  vapi_conversation_id TEXT,
  from_number TEXT,
  to_number TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_restaurants_owner_user_id ON restaurants(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_created_at ON restaurants(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_restaurants_stripe_customer_id ON restaurants(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_restaurants_stripe_subscription_id ON restaurants(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_restaurants_subscription_status ON restaurants(subscription_status);

CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_intent ON orders(intent);
CREATE INDEX IF NOT EXISTS idx_orders_order_type ON orders(order_type);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status ON orders(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_twilio_call_sid ON orders(twilio_call_sid) WHERE twilio_call_sid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_vapi_conversation_id ON orders(vapi_conversation_id) WHERE vapi_conversation_id IS NOT NULL;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view their own restaurants" ON restaurants;
DROP POLICY IF EXISTS "Users can insert their own restaurants" ON restaurants;
DROP POLICY IF EXISTS "Users can update their own restaurants" ON restaurants;
DROP POLICY IF EXISTS "Users can delete their own restaurants" ON restaurants;

DROP POLICY IF EXISTS "Users can view orders for their restaurants" ON orders;
DROP POLICY IF EXISTS "Users can insert orders for their restaurants" ON orders;
DROP POLICY IF EXISTS "Users can update orders for their restaurants" ON orders;
DROP POLICY IF EXISTS "Users can delete orders for their restaurants" ON orders;

-- Restaurants policies: users can only access their own restaurant
CREATE POLICY "Users can view their own restaurants"
  ON restaurants FOR SELECT
  USING (auth.uid() = owner_user_id);

CREATE POLICY "Users can insert their own restaurants"
  ON restaurants FOR INSERT
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Users can update their own restaurants"
  ON restaurants FOR UPDATE
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Users can delete their own restaurants"
  ON restaurants FOR DELETE
  USING (auth.uid() = owner_user_id);

-- Orders policies: users can only access orders for their restaurants
CREATE POLICY "Users can view orders for their restaurants"
  ON orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM restaurants
      WHERE restaurants.id = orders.restaurant_id
      AND restaurants.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert orders for their restaurants"
  ON orders FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM restaurants
      WHERE restaurants.id = orders.restaurant_id
      AND restaurants.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update orders for their restaurants"
  ON orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM restaurants
      WHERE restaurants.id = orders.restaurant_id
      AND restaurants.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM restaurants
      WHERE restaurants.id = orders.restaurant_id
      AND restaurants.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete orders for their restaurants"
  ON orders FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM restaurants
      WHERE restaurants.id = orders.restaurant_id
      AND restaurants.owner_user_id = auth.uid()
    )
  );

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_restaurants_updated_at ON restaurants;
CREATE TRIGGER update_restaurants_updated_at
    BEFORE UPDATE ON restaurants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VERIFICATION QUERIES (Optional - uncomment to verify setup)
-- ============================================================================

-- Verify tables exist
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' AND table_name IN ('restaurants', 'orders');

-- Verify RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables 
-- WHERE schemaname = 'public' AND tablename IN ('restaurants', 'orders');

-- Verify policies exist
-- SELECT schemaname, tablename, policyname FROM pg_policies 
-- WHERE tablename IN ('restaurants', 'orders');

-- ============================================================================
-- USAGE TRACKING (Optional - for billing/plan limits)
-- ============================================================================

-- Add call duration tracking to orders (for usage calculation)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS call_duration_minutes NUMERIC(10, 2);

-- Create index for efficient usage queries
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_started_at ON orders(restaurant_id, started_at DESC);

-- Function to calculate call duration in minutes
CREATE OR REPLACE FUNCTION calculate_call_duration_minutes(
  call_started_at TIMESTAMP WITH TIME ZONE,
  call_ended_at TIMESTAMP WITH TIME ZONE
) RETURNS NUMERIC(10, 2) AS $$
BEGIN
  IF call_ended_at IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Calculate duration in minutes (rounded to 2 decimal places)
  RETURN ROUND(EXTRACT(EPOCH FROM (call_ended_at - call_started_at)) / 60.0, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get usage for a restaurant in a billing period
CREATE OR REPLACE FUNCTION get_restaurant_usage_minutes(
  p_restaurant_id UUID,
  p_period_start TIMESTAMP WITH TIME ZONE,
  p_period_end TIMESTAMP WITH TIME ZONE
) RETURNS NUMERIC(10, 2) AS $$
DECLARE
  total_minutes NUMERIC(10, 2);
BEGIN
  SELECT COALESCE(SUM(call_duration_minutes), 0)
  INTO total_minutes
  FROM orders
  WHERE restaurant_id = p_restaurant_id
    AND started_at >= p_period_start
    AND started_at < p_period_end
    AND call_duration_minutes IS NOT NULL;
  
  RETURN COALESCE(total_minutes, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get current billing period usage
-- Note: Also supports p_firm_id parameter for backward compatibility with UsageDisplay component
CREATE OR REPLACE FUNCTION get_current_period_usage_minutes(p_restaurant_id UUID DEFAULT NULL, p_firm_id UUID DEFAULT NULL)
RETURNS NUMERIC(10, 2) AS $$
DECLARE
  period_start TIMESTAMP WITH TIME ZONE;
  period_end TIMESTAMP WITH TIME ZONE;
  restaurant_subscription_period_end TIMESTAMP WITH TIME ZONE;
  target_restaurant_id UUID;
BEGIN
  -- Support both restaurant_id and firm_id (for backward compatibility)
  IF p_restaurant_id IS NOT NULL THEN
    target_restaurant_id := p_restaurant_id;
  ELSIF p_firm_id IS NOT NULL THEN
    target_restaurant_id := p_firm_id;
  ELSE
    RETURN 0;
  END IF;
  
  -- Get subscription period end from restaurants table
  SELECT subscription_current_period_end
  INTO restaurant_subscription_period_end
  FROM restaurants
  WHERE id = target_restaurant_id;
  
  -- If no subscription period, use current month
  IF restaurant_subscription_period_end IS NULL THEN
    period_start := date_trunc('month', NOW());
    period_end := date_trunc('month', NOW()) + INTERVAL '1 month';
  ELSE
    -- Calculate period start (30 days before period end)
    period_start := restaurant_subscription_period_end - INTERVAL '30 days';
    period_end := restaurant_subscription_period_end;
  END IF;
  
  RETURN get_restaurant_usage_minutes(target_restaurant_id, period_start, period_end);
END;
$$ LANGUAGE plpgsql STABLE;

-- Trigger to automatically calculate duration when order/call ends
CREATE OR REPLACE FUNCTION update_order_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ended_at IS NOT NULL AND (OLD.ended_at IS NULL OR OLD.ended_at != NEW.ended_at) THEN
    NEW.call_duration_minutes := calculate_call_duration_minutes(NEW.started_at, NEW.ended_at);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_order_duration ON orders;
CREATE TRIGGER trigger_update_order_duration
  BEFORE UPDATE ON orders
  FOR EACH ROW
  WHEN (NEW.ended_at IS NOT NULL)
  EXECUTE FUNCTION update_order_duration();

-- ============================================================================
-- NOTES
-- ============================================================================
-- 
-- After running this script:
-- 1. Create a user account via the login page
-- 2. Go to Settings to create your restaurant
-- 3. Configure kitchen emails, hours, etc.
-- 4. Start using the app!
--
-- For service role operations (API routes), use SUPABASE_SERVICE_ROLE_KEY
-- which bypasses RLS. Make sure your API routes use createServiceClient()
-- from lib/clients/supabase.ts
--
-- Stripe billing fields are optional - only needed if you're using Stripe
-- for subscription management. The app will work without them.

