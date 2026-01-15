import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/clients/supabase';
import { createServerClient } from '@/lib/clients/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Create a test order for development/demo purposes
 * POST /api/test-order
 * Body: { restaurantId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { restaurantId } = await request.json();

    if (!restaurantId) {
      return NextResponse.json({ error: 'Missing restaurantId' }, { status: 400 });
    }

    // Verify user owns the restaurant
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, name')
      .eq('id', restaurantId)
      .eq('owner_user_id', user.id)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    // Create a test order
    const serviceClient = createServiceClient();
    const testOrder = {
      restaurant_id: restaurantId,
      status: 'new' as const,
      intent: 'order' as const,
      order_type: 'pickup' as const,
      customer_name: 'Test Customer',
      customer_phone: '+15551234567',
      delivery_address: null,
      requested_time: 'ASAP',
      items: [
        { name: 'Margherita Pizza', qty: 1 },
        { name: 'Caesar Salad', qty: 2 },
      ],
      special_instructions: 'This is a test order created for demonstration purposes.',
      ai_summary: 'Test order: 1x Margherita Pizza, 2x Caesar Salad for pickup',
      transcript_text: 'Test order transcript - this is a demo order.',
      audio_url: null,
      raw_payload: {
        customer_name: 'Test Customer',
        customer_phone: '+15551234567',
        order_type: 'pickup',
        requested_time: 'ASAP',
        items: [
          { name: 'Margherita Pizza', qty: 1 },
          { name: 'Caesar Salad', qty: 2 },
        ],
        special_instructions: 'This is a test order created for demonstration purposes.',
        intent: 'order',
      },
      started_at: new Date().toISOString(),
      ended_at: new Date().toISOString(),
    };

    const { data: newOrder, error: orderError } = await serviceClient
      .from('orders')
      // @ts-ignore - Supabase type inference issue
      .insert(testOrder)
      .select()
      .single();

    if (orderError || !newOrder) {
      console.error('[Test Order] Error creating test order:', orderError);
      return NextResponse.json(
        { error: 'Failed to create test order', details: orderError?.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      order: newOrder,
      message: 'Test order created successfully',
    });
  } catch (error) {
    console.error('[Test Order] Unexpected error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create test order' },
      { status: 500 }
    );
  }
}
