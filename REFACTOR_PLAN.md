# DineLine Refactor Plan

## Overview
Complete refactor from IntakeGenie (legal intake) to DineLine (restaurant AI receptionist).

## High-Level Changes

### 1. Database Schema
- **firms** → **restaurants**
  - `firm_name` → `name`
  - Remove: `forward_to_number`, `mode`, `open_days`, `failover_ring_seconds`
  - Add: `kitchen_emails` (text[]), `hours_open` (time), `hours_close` (time), `after_hours_take_orders` (boolean), `reservations_enabled` (boolean)
  - Keep: `owner_user_id`, `timezone`, `notify_emails` (reuse for kitchen_emails), `created_at`

- **calls** → **orders**
  - `firm_id` → `restaurant_id`
  - `twilio_call_sid` → keep for migration but add `vapi_conversation_id` support
  - Remove: `route_reason`, `urgency` (or repurpose)
  - Add: `status` (new, in_progress, completed), `intent` (order, reservation, info), `order_type` (pickup, delivery, reservation)
  - Add: `customer_name`, `customer_phone`, `delivery_address`, `requested_time`, `items` (jsonb), `special_instructions`
  - Keep: `transcript_text`, `recording_url`, `ai_summary`, `raw_payload` (jsonb)
  - Rename: `intake_json` → `raw_payload`, `summary_json` → keep for AI summary

### 2. Type System
- `Firm` → `Restaurant`
- `Call` → `Order`
- `IntakeData` → `OrderData`
- `SummaryData` → keep for AI summaries
- Remove legal-specific types, add restaurant-specific

### 3. UI Components
- `CallsList` → `OrdersList`
- `CallDetail` → `OrderDetail`
- `SettingsForm` → update for restaurant settings
- Dashboard: "Calls" → "Orders", "Leads" → "New Orders"
- Remove legal-specific copy

### 4. API Routes
- `/api/process-call` → update to create orders and send kitchen tickets
- Voice webhooks → update to extract order data
- Add `/api/orders/[id]` for status updates
- Add `/api/test-order` for dummy order generation

### 5. Agent Prompts
- Remove legal intake flow
- Add restaurant order flow:
  - Greeting
  - Intent classification (order/reservation/info)
  - Order capture: name, phone, type (pickup/delivery), time, address, items, special instructions
  - Confirmation
  - Closing

### 6. Email System
- `sendIntakeEmail` → `sendKitchenTicket`
- Format: Plain text kitchen ticket with all order details
- Subject: "New Phone Order — {RestaurantName} — {Pickup/Delivery}"

### 7. Branding
- All "IntakeGenie" → "DineLine"
- All "firm" → "restaurant"
- All "call" → "order" (where appropriate)
- All "intake" → "order"
- Legal copy → Restaurant copy

## File-by-File Refactor

### Database
- `sql/migrations.sql` → create new migration for restaurants/orders
- `sql/dine_line_migration.sql` → new migration file

### Types
- `types/database.ts` → update table definitions
- `types/index.ts` → update domain types

### Components
- `components/CallsList.tsx` → `components/OrdersList.tsx`
- `components/CallDetail.tsx` → `components/OrderDetail.tsx`
- `components/SettingsForm.tsx` → update for restaurants
- `components/app-sidebar.tsx` → update nav labels

### Pages
- `app/dashboard/page.tsx` → update for orders
- `app/calls/page.tsx` → `app/orders/page.tsx`
- `app/calls/[id]/page.tsx` → `app/orders/[id]/page.tsx`
- `app/settings/page.tsx` → update for restaurants
- `app/page.tsx` → update landing page copy

### API Routes
- `app/api/process-call/route.ts` → update for orders
- `app/api/calls/[id]/route.ts` → `app/api/orders/[id]/route.ts`
- Add `app/api/test-order/route.ts`

### Lib
- `lib/agent/prompts.ts` → restaurant order prompts
- `lib/clients/resend.ts` → update email templates
- `lib/utils/summarize.ts` → update for order summaries

### Config
- `package.json` → update name
- `app/layout.tsx` → update metadata
- `README.md` → update documentation
- `env.local.template` → update if needed

## Execution Order
1. Database migrations first (can run in parallel with code)
2. Types update
3. Core logic (prompts, email, API routes)
4. UI components
5. Pages
6. Branding/polish
7. Documentation

