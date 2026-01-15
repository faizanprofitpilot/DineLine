import { NextRequest, NextResponse } from 'next/server';
import { generateTwiML } from '@/lib/clients/twilio';

// Ensure this route is public (no authentication required)
export const dynamic = 'force-dynamic';

// Explicitly allow POST and OPTIONS methods
export const runtime = 'nodejs';

// Handle CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}

export async function POST(request: NextRequest) {
  // Twilio voice routes are disabled - IntakeGenie is now Vapi-exclusive
  console.log('[Twilio Voice] POST request received but disabled - Vapi-exclusive mode');
  return generateTwiML(
    '<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">This service is no longer available via Twilio. Please contact support.</Say><Hangup/></Response>'
  );
}
