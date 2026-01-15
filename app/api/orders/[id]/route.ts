import { NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/clients/supabase';

/**
 * Update order status
 * PUT /api/orders/[id]
 * Body: { status: 'new' | 'in_progress' | 'completed' }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const orderId = id;
    const { status } = await request.json();

    if (!status || !['new', 'in_progress', 'completed'].includes(status)) {
      return new Response('Invalid status', { status: 400 });
    }

    const supabase = createServiceClient();

    // Update order
    const { data: updatedOrder, error } = await supabase
      .from('orders')
      // @ts-ignore - Supabase type inference issue
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      console.error('[Update Order] Error:', error);
      return new Response('Failed to update order', { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, order: updatedOrder }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in update order:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

/**
 * Delete order
 * DELETE /api/orders/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const orderId = id;
    const supabase = createServiceClient();

    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (error) {
      console.error('[Delete Order] Error:', error);
      return new Response('Failed to delete order', { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in delete order:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

