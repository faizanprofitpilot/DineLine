-- Add Stripe subscription fields to firms table
-- This enables subscription management and billing

ALTER TABLE firms
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete', 'incomplete_expired', 'unpaid', 'inactive')),
ADD COLUMN IF NOT EXISTS subscription_plan TEXT CHECK (subscription_plan IN ('starter', 'professional', 'turbo')),
ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end BOOLEAN DEFAULT FALSE;

-- Add indexes for lookups
CREATE INDEX IF NOT EXISTS idx_firms_stripe_customer_id ON firms(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_firms_stripe_subscription_id ON firms(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_firms_subscription_status ON firms(subscription_status);

-- Add comments
COMMENT ON COLUMN firms.stripe_customer_id IS 'Stripe customer ID (e.g., cus_...)';
COMMENT ON COLUMN firms.stripe_subscription_id IS 'Stripe subscription ID (e.g., sub_...)';
COMMENT ON COLUMN firms.stripe_price_id IS 'Stripe price ID for the subscription plan';
COMMENT ON COLUMN firms.subscription_status IS 'Current subscription status from Stripe';
COMMENT ON COLUMN firms.subscription_plan IS 'Subscription plan tier: starter, professional, turbo';
COMMENT ON COLUMN firms.subscription_current_period_end IS 'When the current subscription period ends';
COMMENT ON COLUMN firms.subscription_cancel_at_period_end IS 'Whether subscription will cancel at period end';

