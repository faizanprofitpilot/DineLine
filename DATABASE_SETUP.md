# Database Setup Instructions

## SQL File to Run

Run the following SQL file in your Supabase SQL Editor:

**`sql/complete_schema.sql`**

This file contains the complete database schema for DineLine, including:
- `restaurants` table (replaces the old `firms` table)
- `orders` table (replaces the old `calls` table)
- All indexes for performance
- Row Level Security (RLS) policies
- Functions for usage tracking

## How to Run

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the entire contents of `sql/complete_schema.sql`
4. Paste it into the SQL Editor
5. Click "Run" to execute

## Notes

- The script is **idempotent** - it's safe to run multiple times (uses `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, etc.)
- The script will create all necessary tables, indexes, and RLS policies from scratch
- After running the script:
  1. Create a user account via the login page
  2. Go to Settings to create your restaurant
  3. Configure kitchen emails, hours, etc.
  4. Start using the app!

## Important

- Do NOT run any of the old migration files (they reference `firms` and `calls` tables)
- Only run `sql/complete_schema.sql` - it's the complete, up-to-date schema
- For service role operations (API routes), use `SUPABASE_SERVICE_ROLE_KEY` which bypasses RLS

