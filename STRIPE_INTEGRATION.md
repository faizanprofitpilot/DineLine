# Stripe Integration Guide

## Overview
Stripe integration has been added to enable subscription management for IntakeGenie. Users can subscribe to Starter, Professional, or Turbo plans.

## Setup Steps

### 1. Database Migration
Run the SQL migration to add subscription fields to the `firms` table:
```sql
-- Run: sql/add_stripe_subscriptions.sql
```

### 2. Stripe Dashboard Setup

1. **Create Products and Prices**:
   - Go to https://dashboard.stripe.com/products
   - Create 3 products:
     - **Starter**: $49/month recurring
     - **Professional**: $149/month recurring
     - **Turbo**: $499/month recurring
   - Copy the Price IDs (e.g., `price_xxxxx`)

2. **Update Environment Variables**:
   - Add the Price IDs to your `.env.local`:
     ```
     STRIPE_PRICE_ID_STARTER=price_xxxxx
     STRIPE_PRICE_ID_PROFESSIONAL=price_xxxxx
     STRIPE_PRICE_ID_TURBO=price_xxxxx
     ```
   - Or update `lib/clients/stripe.ts` directly with the price IDs

3. **Configure Webhook**:
   - Go to https://dashboard.stripe.com/webhooks
   - Add endpoint: `https://yourdomain.com/api/stripe/webhook`
   - Select events:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

### 3. Environment Variables
Add to `.env.local`:
```
STRIPE_SECRET_KEY=sk_test_xxxxx (or sk_live_xxxxx for production)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx (or pk_live_xxxxx for production)
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_PRICE_ID_STARTER=price_xxxxx
STRIPE_PRICE_ID_PROFESSIONAL=price_xxxxx
STRIPE_PRICE_ID_TURBO=price_xxxxx
```

## Features

### API Routes

1. **`POST /api/stripe/checkout`**
   - Creates a Stripe checkout session
   - Requires authentication
   - Body: `{ plan: 'starter' | 'professional' | 'turbo' }`
   - Returns: `{ url: 'https://checkout.stripe.com/...' }`

2. **`POST /api/stripe/webhook`**
   - Handles Stripe webhook events
   - Public route (no authentication)
   - Updates subscription status in database

### Database Fields Added

- `stripe_customer_id`: Stripe customer ID
- `stripe_subscription_id`: Stripe subscription ID
- `stripe_price_id`: Stripe price ID
- `subscription_status`: Current status (active, canceled, past_due, etc.)
- `subscription_plan`: Plan tier (starter, professional, turbo)
- `subscription_current_period_end`: When current period ends
- `subscription_cancel_at_period_end`: Whether subscription will cancel

### User Flow

1. User clicks "Get Started" on pricing card (when authenticated)
2. Frontend calls `/api/stripe/checkout` with plan name
3. User is redirected to Stripe Checkout
4. After payment, Stripe sends webhook to `/api/stripe/webhook`
5. Database is updated with subscription details
6. User is redirected to dashboard with `?subscription=success`

## Testing

### Local Development
1. Use Stripe test mode keys
2. Use Stripe CLI to forward webhooks:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
3. Use test card: `4242 4242 4242 4242`

### Production
1. Use Stripe live mode keys
2. Configure webhook endpoint in Stripe Dashboard
3. Test with real payment methods

## Next Steps

- [ ] Add subscription status display in dashboard
- [ ] Add subscription management UI (cancel, upgrade, downgrade)
- [ ] Add usage tracking (minutes used vs. plan limit)
- [ ] Add billing portal integration for customers

