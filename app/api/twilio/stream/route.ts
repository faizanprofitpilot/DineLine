// This endpoint is for Media Streams (future enhancement)
// For MVP, we use Gather instead, so this is a placeholder
import { NextRequest, NextResponse } from 'next/server';
import { generateTwiML, getTTSAudioUrl, normalizeAppUrl, twilioClient } from '@/lib/clients/twilio';
import { twiml } from 'twilio';

// Ensure this route is public (no authentication required)
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Handle CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}

// Helper function to generate greeting with premium TTS
async function generateGreeting(response: twiml.VoiceResponse, callSid: string | null, firmName: string | null, customGreeting: string | null) {
  const firmNameText = firmName || 'the firm';
  let greetingText: string;
  
  if (customGreeting) {
    // Use custom greeting, replacing {FIRM_NAME} placeholder
    greetingText = customGreeting.replace(/{FIRM_NAME}/g, firmNameText);
  } else {
    // Use canonical greeting script
    greetingText = `Thank you for calling ${firmNameText}. I'm an automated assistant for the firm. I can't give legal advice, but I can collect details so the firm can follow up. How can I help you today?`;
  }
  
  try {
    const { playUrl, fallbackText } = await getTTSAudioUrl(greetingText, callSid || 'unknown', 'greeting');
    console.log('[Stream] Play URL:', playUrl);
    if (playUrl) {
      response.play(playUrl);
    } else {
      // Fallback to Twilio TTS
      response.say({ voice: 'alice' }, fallbackText);
    }
  } catch (error) {
    console.error('[Stream] TTS error, using fallback:', error);
    response.say({ voice: 'alice' }, greetingText);
  }
}

// Helper function to generate no-input message with premium TTS
async function generateNoInput(response: twiml.VoiceResponse, callSid: string | null) {
  const noInputText = "I didn't hear anything. Please call back when you're ready.";
  try {
    const { playUrl, fallbackText } = await getTTSAudioUrl(noInputText, callSid || 'unknown', 'no-input');
    if (playUrl) {
      response.play(playUrl);
    } else {
      response.say({ voice: 'alice' }, fallbackText);
    }
  } catch (error) {
    console.error('[Stream] TTS error, using fallback:', error);
    response.say({ voice: 'alice' }, noInputText);
  }
}

// Helper function to start recording via Twilio API
async function startCallRecording(callSid: string) {
  try {
    // Start recording on the call - records the entire call
    // Using create() with empty params to start basic recording
    // The recording will be available after the call ends and can be fetched via process-call
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    if (!accountSid) {
      throw new Error('TWILIO_ACCOUNT_SID not configured');
    }
    
    // Use the account-specific recordings API
    const recording = await twilioClient.api.v2010.accounts(accountSid).calls(callSid).recordings.create({
      recordingStatusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/recording-status`,
      recordingStatusCallbackMethod: 'POST',
    });
    console.log(`[Stream] Started recording for call ${callSid}, recording SID: ${recording.sid}`);
  } catch (error) {
    console.error(`[Stream] Error starting recording for call ${callSid}:`, error);
    // Don't throw - recording failure shouldn't break the call flow
    // We can still fetch recordings later via process-call
  }
}

// Twilio's <Redirect> defaults to POST, so we must support POST
export async function POST(request: NextRequest) {
  console.log('[Twilio Stream] POST request received');
  // For MVP, redirect to gather-based flow
  const callSid = request.nextUrl.searchParams.get('callSid');
  const firmId = request.nextUrl.searchParams.get('firmId');

  console.log('[Twilio Stream] CallSid:', callSid, 'FirmId:', firmId);

  // Start recording the call via Twilio API (non-blocking)
  if (callSid) {
    // Fire and forget - start recording asynchronously
    startCallRecording(callSid).catch((err) => {
      console.error('[Stream] Recording start failed:', err);
    });
  }

  // Fetch firm data if firmId is provided
  let firmName: string | null = null;
  let customGreeting: string | null = null;
  if (firmId) {
    try {
      const { createServiceClient } = await import('@/lib/clients/supabase');
      const supabase = createServiceClient();
      const { data: firmData } = await supabase
        .from('firms')
        .select('firm_name, ai_greeting_custom')
        .eq('id', firmId)
        .single();
      firmName = (firmData as any)?.firm_name || null;
      customGreeting = (firmData as any)?.ai_greeting_custom || null;
    } catch (error) {
      console.error('[Stream] Error fetching firm data:', error);
    }
  }

  const response = new twiml.VoiceResponse();

  // Start with greeting - use premium TTS
  await generateGreeting(response, callSid, firmName, customGreeting);

  // Start gathering with speech recognition
  response.gather({
    input: ['speech'] as any,
    action: `/api/twilio/gather?callSid=${callSid}&firmId=${firmId}`,
    method: 'POST',
    speechTimeout: 'auto',
    language: 'en-US',
  });

  // If no input, hang up
  await generateNoInput(response, callSid);
  response.hangup();

  return generateTwiML(response.toString());
}

// Keep GET for backward compatibility (though Twilio uses POST)
export async function GET(request: NextRequest) {
  console.log('[Twilio Stream] GET request received (fallback)');
  // For MVP, redirect to gather-based flow
  const callSid = request.nextUrl.searchParams.get('callSid');
  const firmId = request.nextUrl.searchParams.get('firmId');

  // Start recording the call via Twilio API (non-blocking)
  if (callSid) {
    // Fire and forget - start recording asynchronously
    startCallRecording(callSid).catch((err) => {
      console.error('[Stream] Recording start failed:', err);
    });
  }

  // Fetch firm data if firmId is provided
  let firmName: string | null = null;
  let customGreeting: string | null = null;
  if (firmId) {
    try {
      const { createServiceClient } = await import('@/lib/clients/supabase');
      const supabase = createServiceClient();
      const { data: firmData } = await supabase
        .from('firms')
        .select('firm_name, ai_greeting_custom')
        .eq('id', firmId)
        .single();
      firmName = (firmData as any)?.firm_name || null;
      customGreeting = (firmData as any)?.ai_greeting_custom || null;
    } catch (error) {
      console.error('[Stream] Error fetching firm data:', error);
    }
  }

  const response = new twiml.VoiceResponse();

  // Start with greeting - use premium TTS
  await generateGreeting(response, callSid, firmName, customGreeting);

  // Start gathering with speech recognition
  response.gather({
    input: ['speech'] as any,
    action: `/api/twilio/gather?callSid=${callSid}&firmId=${firmId}`,
    method: 'POST',
    speechTimeout: 'auto',
    language: 'en-US',
  });

  // If no input, hang up
  await generateNoInput(response, callSid);
  response.hangup();

  return generateTwiML(response.toString());
}
