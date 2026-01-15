import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/clients/supabase';
import { createServerClient } from '@/lib/clients/supabase';
import { sendKitchenTicket } from '@/lib/clients/resend';
import { OrderData } from '@/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Create a test reservation for development/demo purposes
 * POST /api/test-reservation
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

    // Verify user owns the restaurant and get kitchen emails
    const { data: restaurantData, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, name, kitchen_emails')
      .eq('id', restaurantId)
      .eq('owner_user_id', user.id)
      .single();

    if (restaurantError || !restaurantData) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    const restaurant = restaurantData as any;

    // Create a test reservation
    // Set reservation time to tomorrow at 7:30 PM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(19, 30, 0, 0);
    const reservationTime = tomorrow.toLocaleString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const serviceClient = createServiceClient();
    const testReservation = {
      restaurant_id: restaurantId,
      status: 'new' as const,
      intent: 'reservation' as const,
      order_type: 'reservation' as const,
      customer_name: 'Test Customer',
      customer_phone: '+15551234567',
      delivery_address: null,
      requested_time: reservationTime,
      items: null, // Reservations typically don't have items
      special_instructions: 'This is a test reservation created for demonstration purposes. Party of 2.',
      ai_summary: `Test reservation: Party of 2 for ${reservationTime}`,
      transcript_text: 'Test reservation transcript - this is a demo reservation.',
      audio_url: null,
      raw_payload: {
        customer_name: 'Test Customer',
        customer_phone: '+15551234567',
        order_type: 'reservation',
        requested_time: reservationTime,
        special_instructions: 'This is a test reservation created for demonstration purposes. Party of 2.',
        intent: 'reservation',
        party_size: 2,
      },
      started_at: new Date().toISOString(),
      ended_at: new Date().toISOString(),
    };

    const { data: newReservation, error: reservationError } = await serviceClient
      .from('orders')
      // @ts-ignore - Supabase type inference issue
      .insert(testReservation)
      .select()
      .single();

    if (reservationError || !newReservation) {
      console.error('[Test Reservation] Error creating test reservation:', reservationError);
      return NextResponse.json(
        { error: 'Failed to create test reservation', details: reservationError?.message },
        { status: 500 }
      );
    }

    const reservation = newReservation as any;

    // Send kitchen ticket email if kitchen emails are configured
    if (restaurant.kitchen_emails && restaurant.kitchen_emails.length > 0) {
      try {
        const dashboardUrl = process.env.NEXT_PUBLIC_APP_URL 
          ? `${process.env.NEXT_PUBLIC_APP_URL}/orders/${reservation.id}`
          : undefined;

        const orderData: OrderData = {
          customer_name: 'Test Customer',
          customer_phone: '+15551234567',
          order_type: 'reservation',
          requested_time: reservationTime,
          special_instructions: 'This is a test reservation created for demonstration purposes. Party of 2.',
          intent: 'reservation',
        };

        await sendKitchenTicket(
          restaurant.kitchen_emails,
          restaurant.name,
          reservation,
          orderData,
          'Test reservation transcript - this is a demo reservation.',
          null, // No recording for test reservations
          dashboardUrl
        );
        console.log('[Test Reservation] ✅ Kitchen ticket email sent');
      } catch (error) {
        console.error('[Test Reservation] Kitchen ticket email failed:', error);
        // Don't fail the request if email fails - reservation is still created
      }
    } else {
      console.log('[Test Reservation] No kitchen emails configured, skipping email');
    }

    return NextResponse.json({
      success: true,
      reservation: newReservation,
      message: 'Test reservation created successfully',
      emailSent: restaurant.kitchen_emails && restaurant.kitchen_emails.length > 0,
    });
  } catch (error) {
    console.error('[Test Reservation] Unexpected error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create test reservation' },
      { status: 500 }
    );
  }
}
