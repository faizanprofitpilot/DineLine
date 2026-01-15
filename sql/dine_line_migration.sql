-- DineLine Migration: Convert IntakeGenie to DineLine
-- This migration creates new tables for restaurants and orders
-- Run this AFTER backing up existing data if needed

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create restaurants table (replaces firms)
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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create orders table (replaces calls)
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_restaurants_owner_user_id ON restaurants(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_intent ON orders(intent);
CREATE INDEX IF NOT EXISTS idx_orders_order_type ON orders(order_type);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_twilio_call_sid ON orders(twilio_call_sid) WHERE twilio_call_sid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_vapi_conversation_id ON orders(vapi_conversation_id) WHERE vapi_conversation_id IS NOT NULL;

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Restaurants policies: users can only access their own restaurant
DROP POLICY IF EXISTS "Users can view their own restaurants" ON restaurants;
CREATE POLICY "Users can view their own restaurants"
  ON restaurants FOR SELECT
  USING (auth.uid() = owner_user_id);

DROP POLICY IF EXISTS "Users can insert their own restaurants" ON restaurants;
CREATE POLICY "Users can insert their own restaurants"
  ON restaurants FOR INSERT
  WITH CHECK (auth.uid() = owner_user_id);

DROP POLICY IF EXISTS "Users can update their own restaurants" ON restaurants;
CREATE POLICY "Users can update their own restaurants"
  ON restaurants FOR UPDATE
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

DROP POLICY IF EXISTS "Users can delete their own restaurants" ON restaurants;
CREATE POLICY "Users can delete their own restaurants"
  ON restaurants FOR DELETE
  USING (auth.uid() = owner_user_id);

-- Orders policies: users can only access orders for their restaurants
DROP POLICY IF EXISTS "Users can view orders for their restaurants" ON orders;
CREATE POLICY "Users can view orders for their restaurants"
  ON orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM restaurants
      WHERE restaurants.id = orders.restaurant_id
      AND restaurants.owner_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert orders for their restaurants" ON orders;
CREATE POLICY "Users can insert orders for their restaurants"
  ON orders FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM restaurants
      WHERE restaurants.id = orders.restaurant_id
      AND restaurants.owner_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update orders for their restaurants" ON orders;
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

DROP POLICY IF EXISTS "Users can delete orders for their restaurants" ON orders;
CREATE POLICY "Users can delete orders for their restaurants"
  ON orders FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM restaurants
      WHERE restaurants.id = orders.restaurant_id
      AND restaurants.owner_user_id = auth.uid()
    )
  );

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

-- Migration helper: Copy data from firms to restaurants (optional, run manually if needed)
-- Uncomment and run separately if you want to migrate existing data:
/*
INSERT INTO restaurants (id, owner_user_id, name, timezone, kitchen_emails, hours_open, hours_close, after_hours_take_orders, reservations_enabled, created_at)
SELECT 
  id,
  owner_user_id,
  firm_name as name,
  timezone,
  notify_emails as kitchen_emails,
  COALESCE(open_time::time, '09:00'::time) as hours_open,
  COALESCE(close_time::time, '17:00'::time) as hours_close,
  true as after_hours_take_orders,
  false as reservations_enabled,
  created_at
FROM firms
ON CONFLICT (id) DO NOTHING;
*/

