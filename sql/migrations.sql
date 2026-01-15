-- IntakeGenie Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Firms table
CREATE TABLE firms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  firm_name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  forward_to_number TEXT NOT NULL, -- E.164 format
  notify_emails TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  mode TEXT NOT NULL DEFAULT 'both' CHECK (mode IN ('after_hours', 'failover', 'both')),
  open_days INTEGER[] NOT NULL DEFAULT ARRAY[1,2,3,4,5], -- Mon-Fri
  open_time TEXT NOT NULL DEFAULT '09:00',
  close_time TEXT NOT NULL DEFAULT '17:00',
  failover_ring_seconds INTEGER NOT NULL DEFAULT 20,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Calls table
CREATE TABLE calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  twilio_call_sid TEXT NOT NULL UNIQUE,
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  route_reason TEXT NOT NULL CHECK (route_reason IN ('after_hours', 'no_answer', 'manual_test')),
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'transcribing', 'summarizing', 'emailed', 'error')),
  urgency TEXT NOT NULL DEFAULT 'normal' CHECK (urgency IN ('normal', 'high', 'emergency_redirected')),
  recording_url TEXT,
  transcript_text TEXT,
  intake_json JSONB,
  summary_json JSONB,
  error_message TEXT
);

-- Indexes for performance
CREATE INDEX idx_firms_owner_user_id ON firms(owner_user_id);
CREATE INDEX idx_calls_firm_id ON calls(firm_id);
CREATE INDEX idx_calls_twilio_call_sid ON calls(twilio_call_sid);
CREATE INDEX idx_calls_started_at ON calls(started_at DESC);
CREATE INDEX idx_calls_status ON calls(status);
CREATE INDEX idx_calls_urgency ON calls(urgency);

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

-- Firms policies: users can only access their own firm
CREATE POLICY "Users can view their own firms"
  ON firms FOR SELECT
  USING (auth.uid() = owner_user_id);

CREATE POLICY "Users can insert their own firms"
  ON firms FOR INSERT
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Users can update their own firms"
  ON firms FOR UPDATE
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Users can delete their own firms"
  ON firms FOR DELETE
  USING (auth.uid() = owner_user_id);

-- Calls policies: users can only access calls for their firms
CREATE POLICY "Users can view calls for their firms"
  ON calls FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM firms
      WHERE firms.id = calls.firm_id
      AND firms.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert calls for their firms"
  ON calls FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM firms
      WHERE firms.id = calls.firm_id
      AND firms.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update calls for their firms"
  ON calls FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM firms
      WHERE firms.id = calls.firm_id
      AND firms.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM firms
      WHERE firms.id = calls.firm_id
      AND firms.owner_user_id = auth.uid()
    )
  );

