# DineLine Schema Verification

## Current Schema Status

The `complete_schema.sql` file contains all necessary database structures for DineLine. Here's what's included:

### ✅ Tables

1. **`restaurants`** - Complete with:
   - Core fields: `id`, `owner_user_id`, `name`, `timezone`
   - Restaurant settings: `kitchen_emails`, `hours_open`, `hours_close`, `after_hours_take_orders`, `reservations_enabled`
   - Phone number fields: `vapi_phone_number_id`, `vapi_assistant_id`, `inbound_number_e164`, `twilio_phone_number_sid`, `telephony_provider`
   - AI settings: `ai_greeting_custom`, `ai_tone`, `ai_knowledge_base`
   - Stripe billing: `stripe_customer_id`, `stripe_subscription_id`, `stripe_price_id`, `subscription_status`, `subscription_plan`, `subscription_current_period_end`, `subscription_cancel_at_period_end`
   - Timestamps: `created_at`, `updated_at`

2. **`orders`** - Complete with:
   - Core fields: `id`, `restaurant_id`, `status`, `intent`, `order_type`
   - Customer info: `customer_name`, `customer_phone`, `delivery_address`, `requested_time`
   - Order data: `items` (JSONB), `special_instructions`, `ai_summary`
   - Call data: `transcript_text`, `audio_url`, `raw_payload` (JSONB)
   - Legacy fields: `twilio_call_sid`, `vapi_conversation_id`, `from_number`, `to_number`
   - Timestamps: `started_at`, `ended_at`, `created_at`, `updated_at`
   - Usage tracking: `call_duration_minutes` (added via ALTER TABLE)

### ✅ Indexes

All performance indexes are present:
- Restaurant indexes: `owner_user_id`, `created_at`, Stripe fields, `subscription_status`
- Order indexes: `restaurant_id`, `status`, `intent`, `order_type`, `created_at`, composite indexes, legacy field indexes
- Usage tracking: `restaurant_id + started_at` composite index

### ✅ Row Level Security (RLS)

All RLS policies are configured:
- Restaurants: SELECT, INSERT, UPDATE, DELETE (users can only access their own)
- Orders: SELECT, INSERT, UPDATE, DELETE (users can only access orders for their restaurants)

### ✅ Functions & Triggers

1. **`update_updated_at_column()`** - Auto-updates `updated_at` timestamp
2. **`calculate_call_duration_minutes()`** - Calculates call duration
3. **`get_restaurant_usage_minutes()`** - Gets usage for a period
4. **`get_current_period_usage_minutes()`** - Gets current billing period usage (supports both `restaurant_id` and `firm_id` for backward compatibility)
5. **`update_order_duration()`** - Trigger function to auto-calculate duration
6. **Triggers**: Auto-update `updated_at` and `call_duration_minutes`

## Verification

### Fields Used in Codebase ✅

All fields accessed in the codebase are present in the schema:
- ✅ `items` (JSONB) - Used in OrdersKanban, KitchenTicket, OrdersList, OrderDetail
- ✅ `audio_url` - Used in OrderDetail for playback
- ✅ `raw_payload` (JSONB) - Used in OrdersList, process-order API
- ✅ `call_duration_minutes` - Used for usage tracking
- ✅ All status, intent, order_type fields
- ✅ All customer and order fields

### Schema is Idempotent ✅

The schema uses:
- `CREATE TABLE IF NOT EXISTS`
- `CREATE INDEX IF NOT EXISTS`
- `DROP POLICY IF EXISTS` before creating new ones
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
- `DROP TRIGGER IF EXISTS` before creating new ones

**Safe to run multiple times without errors.**

## Action Required

### If you're setting up a NEW database:
Run the entire `complete_schema.sql` file in your Supabase SQL Editor.

### If you have an EXISTING database:
The schema is idempotent, so you can run `complete_schema.sql` safely. It will:
- Create any missing tables/columns
- Add any missing indexes
- Update/create RLS policies
- Add any missing functions/triggers

### To Verify Your Current Schema:

Run these queries in Supabase SQL Editor:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('restaurants', 'orders');

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('restaurants', 'orders');

-- Check if call_duration_minutes column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
  AND column_name = 'call_duration_minutes';

-- Check if usage functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'calculate_call_duration_minutes',
    'get_restaurant_usage_minutes',
    'get_current_period_usage_minutes'
  );
```

## Conclusion

✅ **The schema is complete and up-to-date.** No new migrations are needed.

The `complete_schema.sql` file contains everything required for DineLine to function properly, including:
- All tables and columns
- All indexes for performance
- All RLS policies for security
- All functions and triggers for automation
- Usage tracking for billing

You can safely run `complete_schema.sql` on your Supabase database.

