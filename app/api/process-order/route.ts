import { NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/clients/supabase';
import { twilioClient } from '@/lib/clients/twilio';
import { transcribeRecording } from '@/lib/clients/deepgram';
import { generateSummary } from '@/lib/utils/summarize';
import { sendKitchenTicket } from '@/lib/clients/resend';
import { OrderData, OrderItem } from '@/types';

/**
 * Process a completed order call:
 * 1. Transcribe recording (if available)
 * 2. Generate AI summary
 * 3. Create order record
 * 4. Send kitchen ticket email
 */
export async function POST(request: NextRequest) {
  try {
    const { conversationId, callSid, restaurantId, orderData, transcript, recordingUrl } = await request.json();

    if (!restaurantId) {
      return new Response('Missing restaurantId', { status: 400 });
    }

    const supabase = createServiceClient();

    // Get restaurant
    const { data: restaurantData, error: restaurantError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', restaurantId)
      .single();

    if (restaurantError || !restaurantData) {
      console.error('Restaurant not found:', restaurantError);
      return new Response('Restaurant not found', { status: 404 });
    }

    const restaurant = restaurantData as any;

    // Parse order data
    const parsedOrderData: OrderData = orderData || {};
    
    // Extract items if they're in a string format
    let items: OrderItem[] = [];
    if (parsedOrderData.items) {
      if (Array.isArray(parsedOrderData.items)) {
        items = parsedOrderData.items;
      } else if (typeof parsedOrderData.items === 'string') {
        // Try to parse as JSON
        try {
          items = JSON.parse(parsedOrderData.items);
        } catch {
          // If not JSON, treat as single item
          items = [{ name: parsedOrderData.items }];
        }
      }
    }

    // Generate AI summary from transcript
    let aiSummary = '';
    try {
      if (transcript) {
        // @ts-ignore - generateSummary expects IntakeData but OrderData is compatible
        const summary = await generateSummary(transcript, parsedOrderData);
        aiSummary = summary.summary_bullets?.join(' ') || summary.title || '';
      } else {
        // Create basic summary from order data
        aiSummary = `Order for ${parsedOrderData.customer_name || 'customer'}: ${items.length} item(s), ${parsedOrderData.order_type || 'pickup'}`;
      }
    } catch (error) {
      console.error('[Process Order] Summarization error:', error);
      aiSummary = `Order received: ${parsedOrderData.customer_name || 'customer'}, ${parsedOrderData.order_type || 'pickup'}`;
    }

    // Create order record
    const orderRecord = {
      restaurant_id: restaurantId,
      status: 'new' as const,
      intent: parsedOrderData.intent || 'order',
      order_type: parsedOrderData.order_type || null,
      customer_name: parsedOrderData.customer_name || null,
      customer_phone: parsedOrderData.customer_phone || null,
      delivery_address: parsedOrderData.delivery_address || null,
      requested_time: parsedOrderData.requested_time || null,
      items: items.length > 0 ? items : null,
      special_instructions: parsedOrderData.special_instructions || null,
      ai_summary: aiSummary,
      transcript_text: transcript || null,
      audio_url: recordingUrl || null,
      raw_payload: parsedOrderData,
      vapi_conversation_id: conversationId || null,
      twilio_call_sid: callSid || null,
      from_number: parsedOrderData.customer_phone || null,
      to_number: null, // Will be set from restaurant config if needed
      started_at: new Date().toISOString(),
      ended_at: new Date().toISOString(),
    };

    const { data: newOrder, error: orderError } = await supabase
      .from('orders')
      // @ts-ignore - Supabase type inference issue
      .insert(orderRecord)
      .select()
      .single();

    if (orderError || !newOrder) {
      console.error('[Process Order] Error creating order:', orderError);
      return new Response('Failed to create order', { status: 500 });
    }

    const order = newOrder as any;

    // Send kitchen ticket email
    if (restaurant.kitchen_emails && restaurant.kitchen_emails.length > 0) {
      try {
        const dashboardUrl = process.env.NEXT_PUBLIC_APP_URL 
          ? `${process.env.NEXT_PUBLIC_APP_URL}/orders/${order.id}`
          : undefined;

        await sendKitchenTicket(
          restaurant.kitchen_emails,
          restaurant.name,
          order,
          parsedOrderData,
          transcript || null,
          recordingUrl || null,
          dashboardUrl
        );
      } catch (error) {
        console.error('[Process Order] Kitchen ticket email failed:', error);
        // Don't fail the request if email fails - order is still created
      }
    }

    return new Response(JSON.stringify({ success: true, orderId: order.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in process-order:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

