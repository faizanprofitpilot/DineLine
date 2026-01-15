import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/clients/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Get dashboard statistics for a restaurant within a date range
 * GET /api/dashboard/stats?restaurantId=xxx&dateFilter=today&startDate=xxx&endDate=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const restaurantId = searchParams.get('restaurantId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!restaurantId) {
      return NextResponse.json({ error: 'Missing restaurantId' }, { status: 400 });
    }

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Missing date range' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Build base query with date filter
    const dateFilter = (query: any) => {
      return query
        .gte('created_at', startDate)
        .lt('created_at', endDate);
    };

    // Get total orders count
    const { count: totalOrders } = await dateFilter(
      supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
    );

    // Get new orders count
    const { count: newOrders } = await dateFilter(
      supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .eq('status', 'new')
    );

    // Get completed orders count
    const { count: completedOrders } = await dateFilter(
      supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .eq('status', 'completed')
    );

    // Get reservations count
    const { count: reservations } = await dateFilter(
      supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .eq('intent', 'reservation')
    );

    return NextResponse.json({
      totalOrders: totalOrders || 0,
      newOrders: newOrders || 0,
      completedOrders: completedOrders || 0,
      reservations: reservations || 0,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}

