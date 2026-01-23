import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/clients/supabase';
import { vapi } from '@/lib/clients/vapi';
import { buildVapiAgent } from '@/lib/vapi/agent';
import { cleanVapiPayload } from '@/lib/vapi/utils';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Link an existing Vapi phone number to a restaurant
 * This is useful when you have a phone number already in Vapi (e.g., imported from Twilio)
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user }, error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { firmId, phoneNumberId } = await req.json();

    if (!firmId || !phoneNumberId) {
      return NextResponse.json({ error: 'Missing firmId (restaurantId) or phoneNumberId' }, { status: 400 });
    }

    // Verify user owns the restaurant and get restaurant data
    const { data: restaurantData, error: restaurantError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', firmId)
      .single();

    if (restaurantError || !restaurantData || (restaurantData as any).owner_user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const restaurant = restaurantData as any;

    // Get app URL for webhook - prefer production domain over Vercel preview URL
    let appUrl = process.env.NEXT_PUBLIC_APP_URL 
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
    
    if (!appUrl) {
      return NextResponse.json({ 
        error: 'App URL not configured. Set NEXT_PUBLIC_APP_URL or deploy to Vercel.' 
      }, { status: 500 });
    }

    // Ensure URL has https:// protocol
    if (!appUrl.startsWith('http://') && !appUrl.startsWith('https://')) {
      appUrl = `https://${appUrl}`;
    }

    const webhookUrl = `${appUrl}/api/vapi/webhook`;

    // Build agent configuration
    const agentConfig = buildVapiAgent(
      restaurant.name || 'the restaurant',
      restaurant.ai_greeting_custom,
      restaurant.ai_tone,
      restaurant.ai_knowledge_base,
      restaurant.hours_open,
      restaurant.hours_close,
      restaurant.timezone,
      restaurant.after_hours_take_orders,
      restaurant.reservations_enabled,
      restaurant.ai_custom_instructions
    );

    // Step 1: Create or get assistant
    let assistantId = restaurant.vapi_assistant_id;
    
    if (!assistantId) {
      // Create assistant
      try {
        // Build model object - only include tools if they exist
        const modelPayload: any = {
          provider: agentConfig.model.provider,
          model: agentConfig.model.model,
          temperature: agentConfig.model.temperature,
          maxTokens: agentConfig.model.maxTokens,
          messages: agentConfig.model.messages,
        };
        
        // Only include tools if they exist (not undefined)
        if (agentConfig.model.tools && Array.isArray(agentConfig.model.tools) && agentConfig.model.tools.length > 0) {
          modelPayload.tools = agentConfig.model.tools;
        }

        const assistantPayload: any = {
          name: `${restaurant.name} Receptionist`,
          model: modelPayload,
          voice: agentConfig.voice,
          transcriber: agentConfig.transcriber,
          firstMessage: agentConfig.firstMessage,
          server: {
            url: webhookUrl,
          },
          serverMessages: [
            'status-update',
            'end-of-call-report',
            'function-call',
            'transcript',
          ],
          artifactPlan: {
            recordingEnabled: true,
          },
          metadata: {
            restaurantId: firmId,
          },
        };
        
        // Add stopSpeakingPlan to prevent interruptions
        if ((agentConfig as any).stopSpeakingPlan) {
          assistantPayload.stopSpeakingPlan = (agentConfig as any).stopSpeakingPlan;
        }
        // Add responseDelay for patience
        if ((agentConfig as any).responseDelay !== undefined) {
          assistantPayload.responseDelay = (agentConfig as any).responseDelay;
        }
        // Note: Call ending handled via webhook when agent says goodbye
        
        // Clean payload to remove any undefined/null values
        const cleanedPayload = cleanVapiPayload(assistantPayload);
        
        console.log('[Link Number] Creating assistant with payload:', JSON.stringify(cleanedPayload, null, 2));
        
        const assistantResponse = await vapi.post('/assistant', cleanedPayload);
        assistantId = assistantResponse.data.id;
        console.log('[Link Number] Assistant created:', assistantId);
      } catch (vapiError: any) {
        const errorDetails = vapiError?.response?.data || vapiError?.message;
        const errorStatus = vapiError?.response?.status || 500;
        
        console.error('[Link Number] ========== ASSISTANT CREATION ERROR ==========');
        console.error('[Link Number] Error status:', errorStatus);
        console.error('[Link Number] Error details:', JSON.stringify(errorDetails, null, 2));
        console.error('[Link Number] Full error:', JSON.stringify(vapiError, null, 2));
        
        // Extract detailed error message
        let errorMessage = 'Failed to create assistant';
        if (errorDetails) {
          if (typeof errorDetails === 'string') {
            errorMessage = errorDetails;
          } else if (errorDetails.message) {
            errorMessage = Array.isArray(errorDetails.message) 
              ? errorDetails.message.join(', ')
              : errorDetails.message;
          } else if (errorDetails.error) {
            errorMessage = errorDetails.error;
          }
        }
        
        return NextResponse.json({ 
          error: 'Failed to create assistant',
          message: errorMessage,
          details: errorDetails,
          status: errorStatus,
        }, { status: 500 });
      }
    }

    // Step 2: Get the phone number details to verify it exists and get the actual number
    let phoneNumber: string | null = null;
    try {
      console.log('[Link Number] Fetching phone number details for ID:', phoneNumberId);
      const getResponse = await vapi.get(`/phone-number/${phoneNumberId}`);
      const data = getResponse.data;
      
      console.log('[Link Number] Phone number details:', JSON.stringify(data, null, 2));
      
      // Extract phone number
      phoneNumber = 
        (data.number && typeof data.number === 'string' && data.number.match(/^\+?[1-9]\d{1,14}$/)) ? data.number :
        (data.fallbackDestination?.number && typeof data.fallbackDestination.number === 'string' && data.fallbackDestination.number.match(/^\+?[1-9]\d{1,14}$/)) ? data.fallbackDestination.number :
        null;
      
      console.log('[Link Number] Extracted number:', phoneNumber);
      
      // Update phone number to assign assistant (webhook is already on assistant)
      console.log('[Link Number] Updating phone number with assistantId:', assistantId);
      const patchPayload = cleanVapiPayload({ assistantId: assistantId });
      await vapi.patch(`/phone-number/${phoneNumberId}`, patchPayload);
      console.log('[Link Number] Phone number updated with assistant');
      
    } catch (vapiError: any) {
      const errorDetails = vapiError?.response?.data || vapiError?.message || vapiError;
      const statusCode = vapiError?.response?.status || 500;
      console.error('[Link Number] Error linking phone number:', errorDetails);
      console.error('[Link Number] Error status:', statusCode);
      console.error('[Link Number] Full error:', JSON.stringify(errorDetails, null, 2));
      
      // Return more detailed error information
      // Vapi often returns validation errors as arrays in the message field
      const errorMessage = typeof errorDetails === 'object' && errorDetails?.message 
        ? (Array.isArray(errorDetails.message) ? errorDetails.message.join(', ') : errorDetails.message)
        : (typeof errorDetails === 'string' ? errorDetails : 'Unknown error');
      
      return NextResponse.json({ 
        error: 'Failed to link phone number',
        details: errorDetails,
        message: errorMessage,
        statusCode: statusCode
      }, { status: 500 });
    }

    // Step 3: Save to restaurant record
    const updateData: any = {
      vapi_assistant_id: assistantId,
      vapi_phone_number_id: phoneNumberId,
    };
    
    // Use the actual phone number if we found it
    if (phoneNumber) {
      updateData.inbound_number_e164 = phoneNumber;
    }
    
    const { error: updateError } = await supabase
      .from('restaurants')
      // @ts-ignore
      .update(updateData)
      .eq('id', firmId);

    if (updateError) {
      console.error('[Link Number] Error updating restaurant:', updateError);
      return NextResponse.json({ error: 'Failed to save to restaurant' }, { status: 500 });
    }

    return NextResponse.json({ 
      phoneNumber: phoneNumber || phoneNumberId,
      assistantId,
      message: 'Phone number linked successfully'
    });
  } catch (error: any) {
    console.error('[Link Number] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: error?.response?.data || error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

