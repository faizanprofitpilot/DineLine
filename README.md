# DineLine MVP

AI voice receptionist for restaurants that answers phone calls, captures pickup/delivery orders (and optionally reservation requests), and sends structured "Kitchen Tickets" to a configured kitchen email. The app also provides a web dashboard where restaurant staff can view new orders, mark them completed, and review call summaries + recordings.

## Tech Stack

- **Next.js 16** (App Router) with TypeScript
- **Supabase** (Auth + Database + RLS)
- **Twilio Voice / Vapi** (Call routing + speech recognition)
- **Deepgram** (Transcription)
- **OpenAI** (Structured order extraction + summarization)
- **Resend** (Email delivery)
- **Tailwind CSS** (Styling)

## Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Twilio account with a phone number (or Vapi account)
- Deepgram API key
- OpenAI API key
- Resend API key

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Supabase Setup

1. Create a new Supabase project at https://supabase.com
2. Go to SQL Editor and run the migration file:
   ```bash
   # Copy contents of sql/dine_line_migration.sql
   # Paste into Supabase SQL Editor and execute
   ```
3. Get your Supabase credentials:
   - Go to Project Settings → API
   - Copy `Project URL` (NEXT_PUBLIC_SUPABASE_URL)
   - Copy `anon public` key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
   - Copy `service_role` key (SUPABASE_SERVICE_ROLE_KEY) - keep this secret!

### 3. Voice Provider Setup

#### Option A: Twilio
1. Sign up at https://www.twilio.com
2. Purchase a phone number (Voice-enabled)
3. Get your credentials:
   - Account SID (TWILIO_ACCOUNT_SID)
   - Auth Token (TWILIO_AUTH_TOKEN)
   - Phone number in E.164 format (TWILIO_NUMBER, e.g., +15551234567)

#### Option B: Vapi
1. Sign up at https://vapi.ai
2. Create an assistant and phone number
3. Configure webhooks to point to your app

### 4. Deepgram Setup

1. Sign up at https://www.deepgram.com
2. Create an API key
3. Copy the API key (DEEPGRAM_API_KEY)

### 5. OpenAI Setup

1. Sign up at https://platform.openai.com
2. Create an API key
3. Copy the API key (OPENAI_API_KEY)

### 6. Resend Setup

1. Sign up at https://resend.com
2. Create an API key
3. Verify a sender domain (or use the default for testing)
4. Copy the API key (RESEND_API_KEY)

### 7. Environment Variables

Create a `.env.local` file in the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Twilio (if using)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_NUMBER=your_twilio_phone_number_e164_format

# Deepgram
DEEPGRAM_API_KEY=your_deepgram_api_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Resend
RESEND_API_KEY=your_resend_api_key

# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3000
# For production, use your actual domain:
# NEXT_PUBLIC_APP_URL=https://www.dineline.xyz
```

### 8. Local Development with ngrok

For local development, you need to expose your local server to the internet for voice provider webhooks:

1. Install ngrok: https://ngrok.com/download
2. Start your Next.js dev server:
   ```bash
   npm run dev
   ```
3. In another terminal, start ngrok:
   ```bash
   ngrok http 3000
   ```
4. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
5. Update `.env.local`:
   ```env
   NEXT_PUBLIC_APP_URL=https://abc123.ngrok.io
   ```
6. Update voice provider webhooks to use the ngrok URL

**Note**: ngrok URLs change on free tier restarts. For production, use a permanent domain.

### 9. Seed Data (Optional)

After creating a user account, you can seed a test restaurant:

1. Log in to the app
2. Go to Settings and configure your restaurant
3. Or use the SQL Editor in Supabase to insert directly into the `restaurants` table

## Running the Application

```bash
npm run dev
```

Visit http://localhost:3000 (or your ngrok URL)

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── orders/          # Order management endpoints
│   │   │   ├── [id]/        # Order status updates
│   │   ├── process-order/    # Post-call order processing
│   │   ├── test-order/      # Test order generator
│   │   └── ...              # Voice provider webhooks
│   ├── (auth)/
│   │   └── login/           # Login page
│   ├── dashboard/          # Dashboard
│   ├── orders/             # Orders list and detail
│   ├── settings/           # Restaurant settings
│   └── page.tsx            # Landing page
├── components/
│   ├── OrdersList.tsx      # Orders list component
│   ├── OrderDetail.tsx     # Order detail component
│   ├── SettingsForm.tsx   # Restaurant settings form
│   └── ...
├── lib/
│   ├── agent/              # AI agent prompts
│   ├── clients/            # API clients
│   └── utils/              # Utilities
├── types/                  # TypeScript types
└── sql/                    # Database migrations
```

## Key Features

- **24/7 Order Taking**: AI receptionist handles all phone calls automatically
- **Order Capture**: Collects customer name, phone, order type (pickup/delivery), items, special instructions, and delivery address
- **Kitchen Tickets**: Sends formatted plain-text emails to kitchen staff
- **Dashboard**: View all orders, filter by status/type, mark orders as in progress or completed
- **Call Recordings**: Full transcripts and audio recordings available for each order
- **Reservations**: Optional reservation support (if enabled in settings)
- **After-Hours Orders**: Option to accept orders after closing hours (for next day)

## Testing / Demo Mode

If voice provider is not configured, you can use the "Create Test Order" button on the Dashboard to generate realistic dummy orders for demo purposes. This is useful for:
- Testing the dashboard UI
- Recording demo videos
- Showing the system to potential customers

## Production Deployment

1. Deploy to Vercel, Railway, or your preferred platform
2. Set environment variables in your hosting platform
3. Update voice provider webhooks to use your production domain
4. Update `NEXT_PUBLIC_APP_URL` to your production domain
5. Ensure Resend sender domain is verified

## Troubleshooting

- **Webhooks not working**: Ensure ngrok is running (dev) or domain is correct (prod)
- **Orders not creating**: Check restaurant settings and voice provider configuration
- **Transcription failing**: Verify Deepgram API key and recording URL
- **Emails not sending**: Check Resend API key and sender domain verification
- **RLS errors**: Ensure user is authenticated and owns the restaurant

## License

MIT
