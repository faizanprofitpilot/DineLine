import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/clients/supabase';
import { vapi } from '@/lib/clients/vapi';
import { generateSummary } from '@/lib/utils/summarize';
import { sendKitchenTicket } from '@/lib/clients/resend';
import { OrderData, OrderItem } from '@/types';
import { isRestaurantOpen, formatHours } from '@/lib/utils/hours';

// Ensure this route is public (no authentication required)
// This route MUST be accessible without authentication for Vapi webhooks
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Explicitly mark as public route - no authentication required
export const maxDuration = 60; // Allow up to 60 seconds for processing

// Handle CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function POST(req: NextRequest) {
  // Log that webhook was received (for debugging 401 issues)
  const timestamp = new Date().toISOString();
  console.log(`[Vapi Webhook] ========== WEBHOOK REQUEST RECEIVED at ${timestamp} ==========`);
  console.log('[Vapi Webhook] Method:', req.method);
  console.log('[Vapi Webhook] URL:', req.url);
  console.log('[Vapi Webhook] Headers:', Object.fromEntries(req.headers.entries()));
  
  try {
    let body;
    try {
      body = await req.json();
    } catch (jsonError) {
      console.error('[Vapi Webhook] Failed to parse JSON:', jsonError);
      return NextResponse.json({ ok: true, error: 'Invalid JSON' }, { 
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    console.log('[Vapi Webhook] Message type:', body.message?.type);
    console.log('[Vapi Webhook] Message status:', body.message?.status);
    console.log('[Vapi Webhook] Transcript type:', body.message?.transcriptType);

    // Handle non-completed status-update events immediately (before any processing)
    // These are just status updates, not events that require processing
    if (body.message?.type === 'status-update' && body.message?.status !== 'ended') {
      console.log('[Vapi Webhook] ✅ Received status-update (non-ended), returning success:', body.message?.status);
      return NextResponse.json({ ok: true, status: body.message?.status }, { 
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // Handle partial transcript events immediately (we only process final transcripts)
    if (body.message?.type === 'transcript' && body.message?.transcriptType === 'partial') {
      console.log('[Vapi Webhook] ✅ Received partial transcript, returning success');
      return NextResponse.json({ ok: true, transcriptType: 'partial' }, { 
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // Vapi sends webhooks in different formats:
    // 1. New format: { message: { type: "status-update", call: {...}, assistant: {...} } }
    // 2. Old format: { event: "conversation.updated", conversation_id: "...", ... }
    
    let event: string | null = null;
    let conversation_id: string | null = null;
    let transcript: string | undefined;
    let structuredData: any;
    let phoneNumber: string | undefined;
    let metadata: any;
    let phoneNumberId: string | undefined;
    let recordingUrl: string | undefined;

    // Check if it's the new message format (Vapi's actual webhook format)
    if (body.message) {
      const message = body.message;
      
      // Map Vapi message types to our event types
      if (message.type === 'status-update') {
        // status-update with status "ended" means conversation.completed
        if (message.status === 'ended') {
          event = 'conversation.completed';
        } else {
          event = 'conversation.updated';
        }
      } else if (message.type === 'end-of-call-report') {
        // end-of-call-report contains final transcript and data
        event = 'conversation.completed';
      } else {
        event = message.type;
      }
      
      conversation_id = message.call?.id || message.conversation_id;
      // IMPORTANT: caller number is in call.customer.number, NOT phoneNumber.number
      // phoneNumber.number is the Vapi number being called, not the caller
      phoneNumber = message.call?.customer?.number || message.customer?.number;
      phoneNumberId = message.phoneNumber?.id || message.call?.phoneNumberId || message.phoneNumberId;
      metadata = message.assistant?.metadata || message.metadata || message.call?.metadata;
      
      // Extract transcript from various locations
      if (message.artifact?.transcript) {
        transcript = message.artifact.transcript;
      } else if (message.transcript) {
        transcript = message.transcript;
      } else if (message.summary?.transcript) {
        transcript = message.summary.transcript;
      } else if (message.report?.transcript) {
        transcript = message.report.transcript;
      }
      
      // Extract structured data from various locations
      if (message.artifact?.structuredData) {
        structuredData = message.artifact.structuredData;
      } else if (message.structuredData) {
        structuredData = message.structuredData;
      } else if (message.summary?.structuredData) {
        structuredData = message.summary.structuredData;
      } else if (message.report?.structuredData) {
        structuredData = message.report.structuredData;
      }
      
      // Extract recording URL from various locations
      // According to Vapi docs: https://docs.vapi.ai/assistants/call-recording
      // Vapi provides recordings in multiple formats:
      // 1. artifact.recordingUrl (string URL) - mono recording
      // 2. artifact.recording.stereoUrl (string URL) - stereo recording
      // 3. artifact.recording.mono.combinedUrl (string URL) - mono recording
      // 4. artifact.recording (can be string or object)
      
      // First check for recordingUrl (direct string URL - easiest to use)
      if (message.artifact?.recordingUrl) {
        recordingUrl = message.artifact.recordingUrl;
      }
      // Also check call.artifact.recordingUrl (webhook might have call object with artifact)
      else if (message.call?.artifact?.recordingUrl) {
        recordingUrl = message.call.artifact.recordingUrl;
      }
      // Check artifact.recording (can be string URL or object)
      else if (message.artifact?.recording) {
        if (typeof message.artifact.recording === 'string') {
          recordingUrl = message.artifact.recording;
        } else {
          // Object format: check stereoUrl, mono.combinedUrl, or url properties
          recordingUrl = message.artifact.recording.stereoUrl 
            || message.artifact.recording.mono?.combinedUrl
            || message.artifact.recording.url 
            || message.artifact.recording.recordingUrl;
        }
      }
      // Check call.artifact.recording (webhook might have call object with artifact)
      else if (message.call?.artifact?.recording) {
        if (typeof message.call.artifact.recording === 'string') {
          recordingUrl = message.call.artifact.recording;
        } else {
          recordingUrl = message.call.artifact.recording.stereoUrl
            || message.call.artifact.recording.mono?.combinedUrl
            || message.call.artifact.recording.url
            || message.call.artifact.recording.recordingUrl;
        }
      }
      // Fallback to other locations
      else if (message.recordingUrl) {
        recordingUrl = message.recordingUrl;
      } else if (message.recording?.url) {
        recordingUrl = message.recording.url;
      } else if (message.report?.recordingUrl) {
        recordingUrl = message.report.recordingUrl;
      } else if (message.call?.recordingUrl) {
        recordingUrl = message.call.recordingUrl;
      } else if (message.call?.recording?.url) {
        recordingUrl = message.call.recording.url;
      }
      
      if (recordingUrl) {
        console.log('[Vapi Webhook] Extracted recording URL from webhook:', recordingUrl);
      } else {
        console.log('[Vapi Webhook] No recording URL found in webhook message. Available paths:', {
          hasMessageArtifact: !!message.artifact,
          hasCallArtifact: !!message.call?.artifact,
          messageArtifactKeys: message.artifact ? Object.keys(message.artifact) : [],
          callArtifactKeys: message.call?.artifact ? Object.keys(message.call.artifact) : [],
        });
      }
      
      console.log('[Vapi Webhook] ========== WEBHOOK RECEIVED (VAPI FORMAT) ==========');
      console.log('[Vapi Webhook] Message Type:', message.type);
      console.log('[Vapi Webhook] Call Status:', message.status);
      console.log('[Vapi Webhook] Ended Reason:', message.endedReason);
      console.log('[Vapi Webhook] Mapped Event:', event);
    } else {
      // Old format
      event = body.event;
      conversation_id = body.conversation_id;
      transcript = body.transcript;
      structuredData = body.structuredData;
      phoneNumber = body.phoneNumber;
      metadata = body.metadata;
      phoneNumberId = body.phoneNumberId;
      // Extract recording URL from old format
      if (!recordingUrl) {
        recordingUrl = body.recordingUrl || body.recording?.url || body.recording_url;
      }
      
      console.log('[Vapi Webhook] ========== WEBHOOK RECEIVED (OLD FORMAT) ==========');
    }

    // Extract phone number from various possible locations
    // IMPORTANT: We want the CALLER's number, not the Vapi number
    // The caller is in: call.customer.number, customer.number, or phoneNumber (old format)
    // The Vapi number (being called) is in: phoneNumber.number (new format) - we DON'T want this
    const actualPhoneNumber = phoneNumber || body.call?.customer?.number || body.customer?.number || body.phoneNumber;
    const actualPhoneNumberId = phoneNumberId || body.phoneNumber?.id || body.phoneNumberId;

    console.log('[Vapi Webhook] Event:', event);
    console.log('[Vapi Webhook] Conversation ID:', conversation_id);
    console.log('[Vapi Webhook] Phone Number (caller):', actualPhoneNumber);
    console.log('[Vapi Webhook] Phone Number ID (Vapi number):', actualPhoneNumberId);
    console.log('[Vapi Webhook] Metadata:', JSON.stringify(metadata, null, 2));
    console.log('[Vapi Webhook] Full body keys:', Object.keys(body));
    console.log('[Vapi Webhook] ========== FULL WEBHOOK BODY ==========');
    console.log(JSON.stringify(body, null, 2));
    console.log('[Vapi Webhook] =========================================');

    const supabase = createServiceClient();

    // Look up restaurant by metadata first (most reliable)
    // Extract from nested message.assistant.metadata if in new format
    // DineLine uses restaurantId in metadata (set by link-number and update-assistant)
    let restaurantId = metadata?.restaurantId || body.metadata?.restaurantId || body.message?.assistant?.metadata?.restaurantId;
    
    console.log('[Vapi Webhook] Initial restaurantId from metadata:', restaurantId);
    console.log('[Vapi Webhook] Metadata sources checked:', {
      metadata_restaurantId: metadata?.restaurantId,
      body_metadata_restaurantId: body.metadata?.restaurantId,
      message_assistant_metadata_restaurantId: body.message?.assistant?.metadata?.restaurantId,
    });
    
    if (!restaurantId) {
      // Try to extract from phoneNumber object if it exists
      if (actualPhoneNumberId) {
        // Look up by phone number ID (stored in vapi_phone_number_id field)
        const { data: restaurantData, error: lookupError } = await supabase
          .from('restaurants')
          .select('id, inbound_number_e164, vapi_phone_number_id, vapi_assistant_id')
          .eq('vapi_phone_number_id', actualPhoneNumberId)
          .limit(1)
          .maybeSingle();
        
        console.log('[Vapi Webhook] Restaurant lookup by phoneNumberId:', actualPhoneNumberId, 'Result:', restaurantData, 'Error:', lookupError);
        
        if (restaurantData && (restaurantData as any).id) {
          restaurantId = (restaurantData as any).id;
          
          // If we have the actual phone number from webhook and restaurant doesn't have it stored, update it
          if (actualPhoneNumber && actualPhoneNumber.match(/^\+?[1-9]\d{1,14}$/) && 
              !(restaurantData as any).inbound_number_e164) {
            console.log('[Vapi Webhook] Updating restaurant with actual phone number from webhook:', actualPhoneNumber);
            await supabase
              .from('restaurants')
              // @ts-ignore
              .update({ inbound_number_e164: actualPhoneNumber })
              .eq('id', restaurantId);
          }
        }
      }
      
      // Fallback: look up by phone number
      if (!restaurantId && actualPhoneNumber) {
        const { data: restaurantData, error: phoneLookupError } = await supabase
          .from('restaurants')
          .select('id')
          .eq('inbound_number_e164', actualPhoneNumber)
          .maybeSingle();
        
        console.log('[Vapi Webhook] Restaurant lookup by phoneNumber:', actualPhoneNumber, 'Result:', restaurantData, 'Error:', phoneLookupError);
        
        if (restaurantData && (restaurantData as any).id) {
          restaurantId = (restaurantData as any).id;
        }
      }
    } else if (actualPhoneNumber && actualPhoneNumber.match(/^\+?[1-9]\d{1,14}$/)) {
      // If we have restaurantId and actual phone number, check if we need to update the stored number
      const { data: restaurantData } = await supabase
        .from('restaurants')
        .select('inbound_number_e164')
        .eq('id', restaurantId)
        .single();
      
      if (restaurantData && !(restaurantData as any).inbound_number_e164) {
        // Restaurant doesn't have the number stored - update it
        console.log('[Vapi Webhook] Updating restaurant with actual phone number from webhook:', actualPhoneNumber);
        await supabase
          .from('restaurants')
          // @ts-ignore
          .update({ inbound_number_e164: actualPhoneNumber })
          .eq('id', restaurantId);
      }
    }

    console.log('[Vapi Webhook] Resolved restaurantId:', restaurantId);

    // If we still don't have restaurantId, try one more lookup by assistant ID
    if (!restaurantId) {
      // Try multiple locations for assistant ID
      const assistantId = 
        metadata?.assistantId || 
        body.assistantId || 
        body.assistant?.id ||
        body.message?.assistant?.id ||
        body.message?.call?.assistantId ||
        body.call?.assistantId;
        
      console.log('[Vapi Webhook] Attempting assistant ID lookup. Extracted assistantId:', assistantId);
      console.log('[Vapi Webhook] Assistant ID locations checked:', {
        metadata_assistantId: metadata?.assistantId,
        body_assistantId: body.assistantId,
        body_assistant_id: body.assistant?.id,
        message_assistant_id: body.message?.assistant?.id,
        message_call_assistantId: body.message?.call?.assistantId,
        call_assistantId: body.call?.assistantId,
      });
      
      if (assistantId) {
        console.log('[Vapi Webhook] Trying restaurant lookup by assistantId:', assistantId);
        const { data: restaurantData, error: assistantLookupError } = await supabase
          .from('restaurants')
          .select('id, vapi_assistant_id')
          .eq('vapi_assistant_id', assistantId)
          .maybeSingle();
        
        console.log('[Vapi Webhook] Assistant lookup result:', restaurantData, 'Error:', assistantLookupError);
        
        if (restaurantData && (restaurantData as any).id) {
          restaurantId = (restaurantData as any).id;
          console.log('[Vapi Webhook] ✅ Found restaurant by assistantId:', restaurantId);
        } else {
          console.warn('[Vapi Webhook] No restaurant found with assistantId:', assistantId);
        }
      } else {
        console.warn('[Vapi Webhook] No assistant ID found in webhook payload');
      }
    }

    if (!restaurantId) {
      console.error('[Vapi Webhook] CRITICAL: Could not resolve restaurantId for conversation:', conversation_id);
      console.error('[Vapi Webhook] Phone Number:', actualPhoneNumber);
      console.error('[Vapi Webhook] Phone Number ID:', actualPhoneNumberId);
      console.error('[Vapi Webhook] Metadata:', JSON.stringify(metadata, null, 2));
      console.error('[Vapi Webhook] Full body keys:', Object.keys(body));
      // Still return 200 to prevent Vapi retries, but log the error
      return NextResponse.json({ ok: true, warning: 'Could not resolve restaurantId' });
    }

    // Handle function-call events FIRST (server-side function execution)
    // Function calls must be handled even if conversation_id is missing
    if (body.message?.type === 'function-call' || event === 'function-call') {
      const functionCall = body.message?.functionCall || body.functionCall;
      const functionName = functionCall?.name;
      
      console.log('[Vapi Webhook] Function call received:', functionName);
      
      if (functionName === 'checkRestaurantHours') {
        // Get restaurant data to check hours
        const { data: restaurantData, error: restaurantError } = await supabase
          .from('restaurants')
          .select('hours_open, hours_close, timezone, after_hours_take_orders, reservations_enabled')
          .eq('id', restaurantId)
          .single();
        
        if (restaurantError || !restaurantData) {
          console.error('[Vapi Webhook] Error fetching restaurant data for hours check:', restaurantError);
          return NextResponse.json({
            result: {
              isOpen: true, // Fail open
              message: 'Unable to check hours, proceeding as open',
              formattedHours: 'Unknown',
              canTakeOrders: true,
              canTakeReservations: true
            }
          });
        }
        
        const restaurant = restaurantData as any;
        const isOpen = isRestaurantOpen(
          restaurant.hours_open,
          restaurant.hours_close,
          restaurant.timezone
        );
        const formattedHours = formatHours(restaurant.hours_open, restaurant.hours_close);
        
        // Get current time in restaurant timezone for context
        const now = new Date();
        const restaurantTime = new Date(now.toLocaleString('en-US', { timeZone: restaurant.timezone }));
        const currentTimeStr = restaurantTime.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          timeZone: restaurant.timezone 
        });
        
        return NextResponse.json({
          result: {
            isOpen,
            currentTime: currentTimeStr,
            timezone: restaurant.timezone,
            hours: formattedHours,
            openingTime: restaurant.hours_open,
            closingTime: restaurant.hours_close,
            canTakeOrders: isOpen || restaurant.after_hours_take_orders,
            canTakeReservations: restaurant.reservations_enabled || isOpen,
            message: isOpen 
              ? `Restaurant is currently OPEN (current time: ${currentTimeStr} ${restaurant.timezone}). Hours: ${formattedHours}.`
              : `Restaurant is currently CLOSED (current time: ${currentTimeStr} ${restaurant.timezone}). Hours: ${formattedHours}.${restaurant.after_hours_take_orders ? ' Can take orders for tomorrow.' : ''}${restaurant.reservations_enabled ? ' Can still take reservations.' : ''}`
          }
        });
      }
      
      // Unknown function - return error
      console.warn('[Vapi Webhook] Unknown function call:', functionName);
      return NextResponse.json({
        error: 'Unknown function',
        functionName
      }, { status: 400 });
    }

    // Handle status-update as conversation.completed if call ended
    if (body.message?.type === 'status-update' && body.message?.status === 'ended') {
      event = 'conversation.completed';
      conversation_id = body.message.call?.id || conversation_id;
    }

    if (!conversation_id) {
      console.error('[Vapi Webhook] No conversation_id found in webhook');
      return NextResponse.json({ ok: true, warning: 'No conversation_id' }, { 
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // For DineLine, we only create orders when the call completes
    // No need to create intermediate call records - orders are created on completion

    if (event === 'conversation.completed' || 
        (body.message?.type === 'status-update' && body.message?.status === 'ended') ||
        body.message?.type === 'end-of-call-report') {
      // Finalize call: save transcript, generate summary, send email
      console.log('[Vapi Webhook] Processing conversation.completed event');
      
      // Extract transcript from various locations in webhook
      let finalTranscript = transcript;
      if (!finalTranscript && body.message?.artifact?.transcript) {
        finalTranscript = body.message.artifact.transcript;
      }
      if (!finalTranscript && body.transcript) {
        finalTranscript = body.transcript;
      }
      
      // If transcript is still missing, fetch it from Vapi API
      // Vapi may need time to process the transcript after call ends, so we retry with delays
      let finalStructuredData = structuredData;
      let finalCallerNumber = actualPhoneNumber;
      let finalRecordingUrl = recordingUrl;
      let finalEndedAt: string | undefined = body.message?.call?.endedAt || body.message?.endedAt || undefined;
      
      if (!finalTranscript || !finalStructuredData || !finalCallerNumber) {
        console.log('[Vapi Webhook] Missing data, fetching from Vapi API...');
        console.log('[Vapi Webhook] Missing transcript:', !finalTranscript);
        console.log('[Vapi Webhook] Missing structured data:', !finalStructuredData);
        console.log('[Vapi Webhook] Missing caller number:', !finalCallerNumber);
        
        // Retry fetching with increasing delays (Vapi may need time to process transcript)
        const delays = [2000, 5000, 10000]; // 2s, 5s, 10s
        let fetchedData = false;
        
        for (let i = 0; i < delays.length; i++) {
          try {
            // Wait before fetching (except first attempt)
            if (i > 0) {
              console.log(`[Vapi Webhook] Waiting ${delays[i]}ms before retry ${i + 1}...`);
              await new Promise(resolve => setTimeout(resolve, delays[i] - delays[i - 1]));
            }
            
            // Fetch call data from Vapi API
            // Use conversation_id as call ID
            console.log(`[Vapi Webhook] Fetching call data from API (attempt ${i + 1}/${delays.length})...`);
            const callResponse = await vapi.get(`/call/${conversation_id}`);
            const callData = callResponse.data;
            
            console.log('[Vapi Webhook] Fetched call data from API:', JSON.stringify(callData, null, 2));
            console.log('[Vapi Webhook] Call data keys:', Object.keys(callData));
            
            // Extract transcript from various possible locations
            if (!finalTranscript) {
              // Try different fields where transcript might be
              finalTranscript = 
                callData.transcript || 
                callData.fullTranscript ||
                callData.transcription ||
                callData.artifact?.transcript ||
                null;
              
              if (finalTranscript) {
                console.log('[Vapi Webhook] Found transcript in API response, length:', finalTranscript.length);
                fetchedData = true;
              }
            }
            
            // Extract structured data from various possible locations
            if (!finalStructuredData) {
              finalStructuredData = 
                callData.structuredData || 
                callData.artifact?.structuredData ||
                callData.data ||
                null;
              
              if (finalStructuredData) {
                console.log('[Vapi Webhook] Found structured data in API response');
                fetchedData = true;
              }
            }
            
            // Extract caller number from API response
            if (!finalCallerNumber) {
              finalCallerNumber = 
                callData.customer?.number || 
                callData.fromNumber ||
                callData.from_number ||
                null;
              
              if (finalCallerNumber) {
                console.log('[Vapi Webhook] Found caller number in API response:', finalCallerNumber);
                fetchedData = true;
              }
            }
            
            // Extract end time from API response
            if (!finalEndedAt && callData.endedAt) {
              finalEndedAt = callData.endedAt;
              console.log('[Vapi Webhook] Found end time in API response:', finalEndedAt);
            }
            
            // Extract recording URL from API response
            // Vapi provides recordings in multiple formats:
            // 1. artifact.recordingUrl (string URL) - mono recording (preferred)
            // 2. artifact.recording.stereoUrl (string URL) - stereo recording
            // 3. artifact.recording.mono.combinedUrl (string URL) - mono recording
            // 4. artifact.recording (can be string or object)
            if (!finalRecordingUrl) {
              // First check recordingUrl (direct string - easiest)
              if (callData.artifact?.recordingUrl) {
                finalRecordingUrl = callData.artifact.recordingUrl;
              }
              // Check artifact.recording (object format)
              else if (callData.artifact?.recording) {
                if (typeof callData.artifact.recording === 'string') {
                  finalRecordingUrl = callData.artifact.recording;
                } else {
                  // Object format: check stereoUrl, mono.combinedUrl, or url properties
                  finalRecordingUrl = callData.artifact.recording.stereoUrl
                    || callData.artifact.recording.mono?.combinedUrl
                    || callData.artifact.recording.url
                    || callData.artifact.recording.recordingUrl;
                }
              }
              // Fallback to other locations
              else {
                finalRecordingUrl = 
                  callData.recordingUrl ||
                  callData.recording?.url ||
                  callData.recording_url ||
                  callData.call?.recordingUrl ||
                  callData.call?.recording?.url ||
                  null;
              }
              
              if (finalRecordingUrl) {
                console.log('[Vapi Webhook] Found recording URL in API response:', finalRecordingUrl);
                fetchedData = true;
              } else {
                console.log('[Vapi Webhook] No recording URL found in API response. Available fields:', {
                  hasArtifact: !!callData.artifact,
                  hasRecording: !!callData.recording,
                  hasCall: !!callData.call,
                  artifactKeys: callData.artifact ? Object.keys(callData.artifact) : [],
                  callKeys: callData.call ? Object.keys(callData.call) : [],
                  topLevelKeys: Object.keys(callData),
                });
              }
            }
            
            // Also extract messages/transcript from messages array if available
            if (!finalTranscript && callData.messages && Array.isArray(callData.messages)) {
              console.log('[Vapi Webhook] Processing messages array, length:', callData.messages.length);
              const messages = callData.messages
                .filter((msg: any) => {
                  // Include transcript messages, user/assistant messages, or any message with content
                  return msg.type === 'transcript' || 
                         msg.role === 'user' || 
                         msg.role === 'assistant' ||
                         msg.type === 'message' ||
                         (msg.content && msg.content.trim().length > 0);
                })
                .map((msg: any) => {
                  const role = msg.role === 'user' ? 'Caller' : (msg.role === 'assistant' ? 'Assistant' : 'System');
                  const content = msg.transcript || msg.content || msg.text || '';
                  return `${role}: ${content}`;
                });
              
              if (messages.length > 0) {
                finalTranscript = messages.join('\n');
                console.log('[Vapi Webhook] Built transcript from messages array, length:', finalTranscript?.length || 0);
                fetchedData = true;
              }
            }
            
            // If we got what we needed, break out of retry loop
            if (finalTranscript && finalCallerNumber) {
              console.log('[Vapi Webhook] Successfully fetched all required data');
              break;
            }
            
          } catch (apiError: any) {
            console.error(`[Vapi Webhook] Error fetching call data from API (attempt ${i + 1}):`, apiError?.response?.data || apiError?.message);
            console.error('[Vapi Webhook] API error status:', apiError?.response?.status);
            
            // If it's a 404, the call might not exist yet - continue retrying
            if (apiError?.response?.status === 404 && i < delays.length - 1) {
              console.log('[Vapi Webhook] Call not found yet, will retry...');
              continue;
            }
            
            // For other errors, continue with what we have
            break;
          }
        }
        
        if (!fetchedData) {
          console.warn('[Vapi Webhook] Could not fetch transcript/data from API after all retries');
        }
      }
      
      console.log('[Vapi Webhook] Final transcript length:', finalTranscript?.length || 0);
      console.log('[Vapi Webhook] Final structured data:', JSON.stringify(finalStructuredData, null, 2));
      console.log('[Vapi Webhook] Ended reason:', body.message?.endedReason);
      
      // Map structured data to OrderData format
      // Vapi structured data should match OrderData interface
      const orderData: OrderData = finalStructuredData || {};
      
      // Ensure we have customer phone from structured data or caller number
      if (!orderData.customer_phone && finalCallerNumber) {
        orderData.customer_phone = finalCallerNumber;
      }
      
      // Extract items if they're in a string format
      let items: OrderItem[] = [];
      if (orderData.items) {
        if (Array.isArray(orderData.items)) {
          items = orderData.items;
        } else if (typeof orderData.items === 'string') {
          try {
            items = JSON.parse(orderData.items);
          } catch {
            items = [{ name: orderData.items }];
          }
        }
      }
      
      // Get restaurant to check subscription and get kitchen emails
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', restaurantId)
        .single();

      if (restaurantError || !restaurantData) {
        console.error('[Vapi Webhook] Restaurant not found:', restaurantError);
        return NextResponse.json({ ok: true, warning: 'Restaurant not found' });
      }

      const restaurant = restaurantData as any;

      // Generate AI summary from transcript
      let aiSummary = '';
      try {
        if (finalTranscript) {
          // @ts-ignore - generateSummary expects IntakeData but OrderData is compatible
          const summary = await generateSummary(finalTranscript, orderData);
          aiSummary = summary.summary_bullets?.join(' ') || summary.title || '';
        } else {
          // Create basic summary from order data
          const intent = orderData.intent || 'order';
          if (intent === 'reservation') {
            aiSummary = `Reservation for ${orderData.customer_name || 'customer'}: ${orderData.requested_time || 'time TBD'}`;
          } else {
            aiSummary = `${intent === 'order' ? 'Order' : 'Request'} for ${orderData.customer_name || 'customer'}: ${items.length} item(s), ${orderData.order_type || 'pickup'}`;
          }
        }
      } catch (error) {
        console.error('[Vapi Webhook] Summarization error:', error);
        const intent = orderData.intent || 'order';
        if (intent === 'reservation') {
          aiSummary = `Reservation received: ${orderData.customer_name || 'customer'}, ${orderData.requested_time || 'time TBD'}`;
        } else {
          aiSummary = `${intent === 'order' ? 'Order' : 'Request'} received: ${orderData.customer_name || 'customer'}, ${orderData.order_type || 'pickup'}`;
        }
      }
      
      // Log intent and order type for debugging
      console.log('[Vapi Webhook] Intent:', orderData.intent || 'order');
      console.log('[Vapi Webhook] Order type:', orderData.order_type || 'null');
      console.log('[Vapi Webhook] Is reservation:', (orderData.intent === 'reservation' || orderData.order_type === 'reservation'));

      // Create order record
      const orderRecord = {
        restaurant_id: restaurantId,
        status: 'new' as const,
        intent: orderData.intent || 'order',
        order_type: orderData.order_type || null,
        customer_name: orderData.customer_name || null,
        customer_phone: orderData.customer_phone || null,
        delivery_address: orderData.delivery_address || null,
        requested_time: orderData.requested_time || null,
        items: items.length > 0 ? items : null,
        special_instructions: orderData.special_instructions || null,
        ai_summary: aiSummary,
        transcript_text: finalTranscript || null,
        audio_url: finalRecordingUrl || null,
        raw_payload: orderData,
        vapi_conversation_id: conversation_id || null,
        twilio_call_sid: null,
        from_number: orderData.customer_phone || finalCallerNumber || null,
        to_number: restaurant.inbound_number_e164 || null,
        started_at: body.message?.call?.startedAt || new Date().toISOString(),
        ended_at: finalEndedAt || new Date().toISOString(),
      };

      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        // @ts-ignore - Supabase type inference issue
        .insert(orderRecord)
        .select()
        .single();

      if (orderError || !newOrder) {
        console.error('[Vapi Webhook] Error creating order:', orderError);
        return NextResponse.json({ ok: true, warning: 'Failed to create order' });
      }

      const order = newOrder as any;
      console.log('[Vapi Webhook] ✅ Order created successfully:', order.id);
      console.log('[Vapi Webhook] Restaurant kitchen emails:', restaurant.kitchen_emails);
      console.log('[Vapi Webhook] Kitchen emails count:', restaurant.kitchen_emails?.length || 0);

      // Send kitchen ticket email - CRITICAL: Always send if kitchen emails are configured
      if (restaurant.kitchen_emails && Array.isArray(restaurant.kitchen_emails) && restaurant.kitchen_emails.length > 0) {
        console.log('[Vapi Webhook] Attempting to send kitchen ticket email to:', restaurant.kitchen_emails);
        try {
          const dashboardUrl = process.env.NEXT_PUBLIC_APP_URL 
            ? `${process.env.NEXT_PUBLIC_APP_URL}/orders/${order.id}`
            : undefined;

          console.log('[Vapi Webhook] Calling sendKitchenTicket with:', {
            to: restaurant.kitchen_emails,
            restaurantName: restaurant.name,
            orderId: order.id,
            hasTranscript: !!finalTranscript,
            hasRecording: !!finalRecordingUrl,
            dashboardUrl,
          });

          await sendKitchenTicket(
            restaurant.kitchen_emails,
            restaurant.name,
            order,
            orderData,
            finalTranscript || null,
            finalRecordingUrl || null,
            dashboardUrl
          );
          console.log('[Vapi Webhook] ✅ Kitchen ticket email sent successfully to:', restaurant.kitchen_emails);
        } catch (error) {
          console.error('[Vapi Webhook] ❌ Kitchen ticket email failed:', error);
          console.error('[Vapi Webhook] Email error details:', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            to: restaurant.kitchen_emails,
            restaurantName: restaurant.name,
          });
          // Don't fail the request if email fails - order is still created
        }
      } else {
        console.warn('[Vapi Webhook] ⚠️ No kitchen emails configured or empty array. Kitchen emails:', restaurant.kitchen_emails);
        console.warn('[Vapi Webhook] Restaurant data:', {
          id: restaurant.id,
          name: restaurant.name,
          hasKitchenEmails: !!restaurant.kitchen_emails,
          kitchenEmailsType: typeof restaurant.kitchen_emails,
          kitchenEmailsValue: restaurant.kitchen_emails,
        });
      }
    }

    // Check if agent said goodbye and end call if needed
    // This handles the case where agent says goodbye but call hasn't ended
    if (event === 'conversation.updated' && transcript) {
      const lastMessage = transcript.split('\n').pop() || '';
      const agentSaidGoodbye = lastMessage.toLowerCase().includes('goodbye') || 
                                lastMessage.toLowerCase().includes('take care') ||
                                lastMessage.toLowerCase().includes('thank you for calling');
      
      if (agentSaidGoodbye) {
        console.log('[Vapi Webhook] Agent said goodbye, ending call');
        // The call should end automatically, but we log it
        // Vapi should handle call ending when agent says goodbye
      }
    }

    return NextResponse.json({ ok: true }, { 
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error: any) {
    console.error('[Vapi Webhook] Error:', error);
    console.error('[Vapi Webhook] Error stack:', error?.stack);
    // Always return 200 to prevent Vapi retries, even on errors
    return NextResponse.json({ 
      ok: true, 
      error: error?.message || 'Unknown error',
      note: 'Error logged but returning 200 to prevent retries'
    }, { 
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }
}

