import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/clients/supabase';
import { vapi } from '@/lib/clients/vapi';
import { buildVapiAgent } from '@/lib/vapi/agent';
import { cleanVapiPayload } from '@/lib/vapi/utils';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Update an existing Vapi assistant with new settings
 * Called when AI Receptionist settings or Knowledge Base are updated
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

    const { firmId, restaurantId } = await req.json();
    const id = firmId || restaurantId;

    if (!id) {
      return NextResponse.json({ error: 'Missing firmId or restaurantId' }, { status: 400 });
    }

    // Verify user owns the restaurant and get restaurant data
    const { data: restaurantData, error: restaurantError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', id)
      .single();

    if (restaurantError || !restaurantData || (restaurantData as any).owner_user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const restaurant = restaurantData as any;

    // Check if assistant exists
    if (!restaurant.vapi_assistant_id) {
      return NextResponse.json({ 
        error: 'No assistant found',
        message: 'Assistant must be created first by generating a phone number'
      }, { status: 400 });
    }

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

    // Build updated agent configuration
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

    // Log greeting being applied
    console.log('[Update Assistant] Custom greeting from DB:', restaurant.ai_greeting_custom);
    console.log('[Update Assistant] First message being set:', agentConfig.firstMessage);
    console.log('[Update Assistant] Knowledge base length:', restaurant.ai_knowledge_base?.length || 0);
    console.log('[Update Assistant] Knowledge base preview:', restaurant.ai_knowledge_base?.substring(0, 200) || 'None');
    console.log('[Update Assistant] System prompt includes knowledge base:', agentConfig.model.messages[0]?.content?.includes('Restaurant context:') || false);

    // Update assistant with new configuration
    // Vapi PATCH: Include all fields that should be updated
    // According to Vapi docs, when updating nested objects, include the complete object
    try {
      // Build the update payload - include all configuration fields
      const assistantPayload: any = {
        model: agentConfig.model, // Complete model object with messages
        voice: agentConfig.voice, // Voice configuration
        transcriber: agentConfig.transcriber, // Transcriber configuration
        firstMessage: agentConfig.firstMessage, // Updated greeting
      };
      
      // Add stopSpeakingPlan to prevent interruptions
      if ((agentConfig as any).stopSpeakingPlan) {
        assistantPayload.stopSpeakingPlan = (agentConfig as any).stopSpeakingPlan;
      }
      // Note: responseDelay is not supported by Vapi API - removed to avoid validation errors
      
      // Ensure metadata includes restaurantId for webhook resolution
      assistantPayload.metadata = {
        restaurantId: id,
      };
      
      // Ensure server webhook URL is set
      assistantPayload.server = {
        url: webhookUrl,
      };
      
      // Ensure serverMessages includes events we need for transcript/data
      assistantPayload.serverMessages = [
        'status-update',
        'end-of-call-report',
        'function-call',
        'transcript',
      ];
      
      // Enable recording
      assistantPayload.artifactPlan = {
        recordingEnabled: true,
      };
      
      console.log('[Update Assistant] Updating assistant:', restaurant.vapi_assistant_id);
      console.log('[Update Assistant] First message in payload:', assistantPayload.firstMessage);
      
      // Clean payload to remove undefined/null values before PATCH
      const cleanedPayload = cleanVapiPayload(assistantPayload);
      console.log('[Update Assistant] Payload:', JSON.stringify(cleanedPayload, null, 2));
      console.log('[Update Assistant] First message in cleaned payload:', cleanedPayload.firstMessage);
      
      const updateResponse = await vapi.patch(`/assistant/${restaurant.vapi_assistant_id}`, cleanedPayload);
      
      console.log('[Update Assistant] Assistant updated successfully:', updateResponse.data);
      
      return NextResponse.json({ 
        success: true,
        message: 'Assistant updated successfully',
        assistantId: restaurant.vapi_assistant_id
      });
    } catch (vapiError: any) {
      const errorDetails = vapiError?.response?.data || vapiError?.message || vapiError;
      console.error('[Update Assistant] Error updating assistant:', errorDetails);
      console.error('[Update Assistant] Full error:', vapiError);
      
      // Return more detailed error information
      const errorMessage = typeof errorDetails === 'object' && errorDetails?.message 
        ? (Array.isArray(errorDetails.message) ? errorDetails.message.join(', ') : errorDetails.message)
        : (typeof errorDetails === 'string' ? errorDetails : 'Unknown error');
      
      return NextResponse.json({ 
        error: 'Failed to update assistant',
        details: errorDetails,
        status: vapiError?.response?.status || 500,
        message: errorMessage
      }, { status: vapiError?.response?.status || 500 });
    }
  } catch (error: any) {
    console.error('[Update Assistant] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: error?.response?.data || error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

