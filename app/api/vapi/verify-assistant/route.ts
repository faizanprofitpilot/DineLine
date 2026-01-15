import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/clients/supabase';
import { vapi } from '@/lib/clients/vapi';

export const runtime = 'nodejs';

/**
 * Verify assistant configuration - check if webhook URL is set correctly
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user }, error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const firmId = searchParams.get('firmId');

    if (!firmId) {
      return NextResponse.json({ error: 'Missing firmId' }, { status: 400 });
    }

    // Verify user owns the firm
    const { data: firmData, error: firmError } = await supabase
      .from('firms')
      .select('id, firm_name, vapi_assistant_id, owner_user_id')
      .eq('id', firmId)
      .single();

    if (firmError || !firmData) {
      return NextResponse.json({ error: 'Firm not found' }, { status: 404 });
    }

    if ((firmData as any).owner_user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const firm = firmData as any;

    if (!firm.vapi_assistant_id) {
      return NextResponse.json({ 
        error: 'No assistant ID found',
        message: 'Please generate a phone number first to create an assistant'
      }, { status: 400 });
    }

    // Get app URL for webhook - prefer production domain over Vercel preview URL
    let appUrl = process.env.NEXT_PUBLIC_APP_URL 
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
    
    if (!appUrl) {
      return NextResponse.json({ 
        error: 'App URL not configured' 
      }, { status: 500 });
    }

    if (!appUrl.startsWith('http://') && !appUrl.startsWith('https://')) {
      appUrl = `https://${appUrl}`;
    }

    const expectedWebhookUrl = `${appUrl}/api/vapi/webhook`;

    // Fetch assistant from Vapi to verify configuration
    try {
      const assistantResponse = await vapi.get(`/assistant/${firm.vapi_assistant_id}`);
      const assistant = assistantResponse.data;

      const actualWebhookUrl = assistant.server?.url;
      const hasCorrectWebhook = actualWebhookUrl === expectedWebhookUrl;
      const serverMessages = assistant.serverMessages || [];

      return NextResponse.json({
        success: true,
        assistant: {
          id: assistant.id,
          name: assistant.name,
          webhookUrl: actualWebhookUrl,
          expectedWebhookUrl,
          hasCorrectWebhook,
          serverMessages,
          metadata: assistant.metadata,
        },
        message: hasCorrectWebhook 
          ? 'Assistant webhook is configured correctly' 
          : 'Assistant webhook URL does not match expected URL',
      });
    } catch (vapiError: any) {
      const errorDetails = vapiError?.response?.data || vapiError?.message;
      console.error('[Verify Assistant] Error fetching assistant:', errorDetails);
      return NextResponse.json({
        error: 'Failed to fetch assistant from Vapi',
        details: errorDetails,
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('[Verify Assistant] Unexpected error:', error);
    return NextResponse.json({
      error: error?.message || 'Internal server error',
    }, { status: 500 });
  }
}

