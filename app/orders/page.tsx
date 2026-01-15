import { createServerClient } from '@/lib/clients/supabase';
import { redirect } from 'next/navigation';
import { PlatformLayout } from '@/components/platform-layout';
import OrdersKanban from '@/components/OrdersKanban';
import OrdersFilters from '@/components/OrdersFilters';
import Link from 'next/link';

// Force dynamic rendering since we use cookies for authentication
export const dynamic = 'force-dynamic';

export default async function OrdersPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string; type?: string; intent?: string; search?: string; dateRange?: string }> | { status?: string; type?: string; intent?: string; search?: string; dateRange?: string };
}) {
  try {
    // Handle Next.js 15 searchParams (may be Promise)
    const params = searchParams && typeof searchParams === 'object' && 'then' in searchParams
      ? await searchParams
      : (searchParams || {});
    
    const supabase = await createServerClient();
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          redirect('/login');
        }

    // Get user's restaurant
    const { data: restaurantData, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, name')
          .eq('owner_user_id', user.id)
      .limit(1)
      .single();

    if (restaurantError || !restaurantData) {
      redirect('/settings');
    }

    const restaurant = restaurantData as any;

    // Calculate date range (default: last 30 days to prevent infinite growth)
    const dateRange = params.dateRange || '30days';
    const getDateRange = () => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      switch (dateRange) {
        case 'today':
          return {
            start: today.toISOString(),
            end: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString(),
          };
        case '7days':
          const sevenDaysAgo = new Date(today);
          sevenDaysAgo.setDate(today.getDate() - 7);
          return {
            start: sevenDaysAgo.toISOString(),
            end: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString(),
          };
        case '30days':
          const thirtyDaysAgo = new Date(today);
          thirtyDaysAgo.setDate(today.getDate() - 30);
          return {
            start: thirtyDaysAgo.toISOString(),
            end: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString(),
          };
        case 'all':
        default:
          return null; // No date filter
      }
    };

    const dateFilter = getDateRange();

    // Build query
    let query = supabase
      .from('orders')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('created_at', { ascending: false });

    // Apply date filter (default to last 30 days to prevent infinite growth)
    if (dateFilter) {
      query = query
        .gte('created_at', dateFilter.start)
        .lte('created_at', dateFilter.end);
    }

    // Apply filters
    if (params.status) {
      query = query.eq('status', params.status);
    }
    if (params.type) {
      query = query.eq('order_type', params.type);
    }
    if (params.intent) {
      query = query.eq('intent', params.intent);
    }

    const { data: orders, error } = await query;

    // Apply client-side search filter if search query is provided
    let filteredOrders = orders || [];
    if (params.search && params.search.trim()) {
      const searchLower = params.search.toLowerCase().trim();
      filteredOrders = filteredOrders.filter((order: any) => {
        // Search in customer name
        if (order.customer_name && order.customer_name.toLowerCase().includes(searchLower)) {
          return true;
        }
        // Search in customer phone
        if (order.customer_phone && order.customer_phone.includes(searchLower)) {
          return true;
        }
        // Search in items (JSONB field)
        if (order.items && Array.isArray(order.items)) {
          const itemMatch = order.items.some((item: any) => 
            item.name && item.name.toLowerCase().includes(searchLower)
          );
          if (itemMatch) return true;
        }
        // Search in special instructions
        if (order.special_instructions && order.special_instructions.toLowerCase().includes(searchLower)) {
          return true;
        }
        // Search in AI summary
        if (order.ai_summary && order.ai_summary.toLowerCase().includes(searchLower)) {
          return true;
        }
        return false;
      });
    }

    if (error) {
      console.error('Error fetching orders:', error);
    }

    const ordersList = filteredOrders;

    return (
      <PlatformLayout restaurantName={restaurant?.name || null}>
        <div className="w-full px-6 py-6">
          <div className="max-w-7xl mx-auto px-6 py-8 rounded-2xl" style={{ backgroundColor: '#FFF8DC', minHeight: 'calc(100vh - 4rem)' }}>
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ color: '#8B4513' }}>
                    Orders
                  </h1>
                  <p className="text-sm" style={{ color: '#A0522D' }}>
                    Manage orders by status
                    {dateRange !== 'all' && (
                      <span className="ml-2 opacity-70">
                        (Showing {dateRange === 'today' ? 'today' : dateRange === '7days' ? 'last 7 days' : 'last 30 days'})
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-white rounded-lg border p-1" style={{ borderColor: '#DEB887' }}>
                    <Link
                      href="/orders"
                      className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                        dateRange === '30days'
                          ? 'bg-[#8B4513] text-white'
                          : 'text-[#654321] hover:bg-[#FFF0C2]'
                      }`}
                    >
                      30 days
                    </Link>
                    <Link
                      href="/orders?dateRange=7days"
                      className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                        dateRange === '7days'
                          ? 'bg-[#8B4513] text-white'
                          : 'text-[#654321] hover:bg-[#FFF0C2]'
                      }`}
                    >
                      7 days
                    </Link>
                    <Link
                      href="/orders?dateRange=today"
                      className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                        dateRange === 'today'
                          ? 'bg-[#8B4513] text-white'
                          : 'text-[#654321] hover:bg-[#FFF0C2]'
                      }`}
                    >
                      Today
                    </Link>
                    <Link
                      href="/orders?dateRange=all"
                      className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                        dateRange === 'all'
                          ? 'bg-[#8B4513] text-white'
                          : 'text-[#654321] hover:bg-[#FFF0C2]'
                      }`}
                    >
                      All
                    </Link>
                  </div>
                </div>
              </div>
            </div>
            {params.search && (
              <div className="mb-4">
                <div className="bg-white rounded-lg border p-3 flex items-center justify-between" style={{ borderColor: '#DEB887', borderWidth: '1px' }}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm" style={{ color: '#654321' }}>
                      Searching for: <strong>{params.search}</strong>
                    </span>
                    <span className="text-xs" style={{ color: '#A0522D', opacity: 0.7 }}>
                      ({ordersList.length} {ordersList.length === 1 ? 'result' : 'results'})
                    </span>
                  </div>
                  <Link
                    href="/orders"
                    className="text-xs font-medium hover:underline"
                    style={{ color: '#8B4513' }}
                  >
                    Clear
                  </Link>
                </div>
              </div>
            )}
            <div 
              className="bg-white rounded-2xl shadow-sm overflow-hidden"
              style={{
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
              }}
            >
              <OrdersFilters searchParams={params} />
              <div className="p-6">
                <OrdersKanban orders={ordersList} />
              </div>
            </div>
          </div>
        </div>
      </PlatformLayout>
    );
  } catch (error) {
    console.error('Error in OrdersPage:', error);
    return (
      <PlatformLayout restaurantName={null}>
        <div className="w-full px-6 py-6">
          <div className="max-w-7xl mx-auto px-6 py-8 rounded-2xl" style={{ backgroundColor: '#FFF8DC', minHeight: 'calc(100vh - 4rem)' }}>
            <div className="mb-6">
              <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ color: '#8B4513' }}>
                Orders
              </h1>
              <p className="text-sm" style={{ color: '#A0522D' }}>
                View and manage phone orders
              </p>
            </div>
            <div 
              className="bg-white rounded-2xl shadow-sm p-12 text-center"
              style={{
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
              }}
            >
              <p className="text-sm" style={{ color: '#A0522D', opacity: 0.8 }}>
                Unable to load orders. Please try again later.
              </p>
            </div>
          </div>
        </div>
      </PlatformLayout>
    );
  }
}
