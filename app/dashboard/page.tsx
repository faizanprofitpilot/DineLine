import { createServerClient } from '@/lib/clients/supabase';
import { redirect } from 'next/navigation';
import { PlatformLayout } from '@/components/platform-layout';
import Link from 'next/link';
import UsageDisplay from '@/components/UsageDisplay';
import SnapshotCard from '@/components/SnapshotCard';
import CompactLiveQueue from '@/components/CompactLiveQueue';
import CompactKitchenFeed from '@/components/CompactKitchenFeed';
import CompactInfoCard from '@/components/CompactInfoCard';
import CompactPhoneRouting from '@/components/CompactPhoneRouting';
import CompactDemoTools from '@/components/CompactDemoTools';

// Force dynamic rendering since we use cookies for authentication
export const dynamic = 'force-dynamic';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ dateFilter?: string; startDate?: string; endDate?: string }>;
}) {
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
    .select('*')
      .eq('owner_user_id', user.id)
    .limit(1)
    .maybeSingle();

  // Check for actual errors (not just "no rows found")
  if (restaurantError && restaurantError.code !== 'PGRST116') {
    console.error('[Dashboard] Error fetching restaurant:', restaurantError);
    return (
      <PlatformLayout restaurantName={null}>
        <div className="p-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <p>Error loading restaurant data. Please try refreshing the page.</p>
          </div>
        </div>
      </PlatformLayout>
    );
  }

  const restaurant = restaurantData || null;

  // Await searchParams (Next.js 15 requirement)
  const params = searchParams ? await searchParams : {};

  // Calculate date range for initial load (default to today)
  const dateFilter = params?.dateFilter || 'today';
  const getDateRange = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (dateFilter === 'custom' && params?.startDate && params?.endDate) {
      const startDate = new Date(params.startDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(params.endDate);
      endDate.setHours(23, 59, 59, 999);
      return {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      };
    }
    
    switch (dateFilter) {
      case 'today':
        return {
          start: today.toISOString(),
          end: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        };
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return {
          start: weekStart.toISOString(),
          end: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        };
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        return {
          start: monthStart.toISOString(),
          end: monthEnd.toISOString(),
        };
      default:
        return {
          start: today.toISOString(),
          end: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        };
    }
  };

  const dateRange = getDateRange();

  // Get total orders count (only if restaurant exists)
  const { count: ordersCount } = restaurant
    ? await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', (restaurant as any).id)
        .gte('created_at', dateRange.start)
        .lt('created_at', dateRange.end)
    : { count: 0 };

  // Get new orders count (status = 'new')
  let newOrdersCount = 0;
  if (restaurant) {
    const { count } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', (restaurant as any).id)
      .eq('status', 'new')
      .gte('created_at', dateRange.start)
      .lt('created_at', dateRange.end);
    
    newOrdersCount = count || 0;
  }

  // Get recent orders (only if restaurant exists) - need more for feed
  const { data: recentOrdersData } = restaurant
    ? await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', (restaurant as any).id)
        .order('created_at', { ascending: false })
        .limit(20)
    : { data: null };

  const recentOrders = (recentOrdersData || []) as any[];

  // Get completed orders count
  let completedOrdersCount = 0;
  if (restaurant) {
    const { count } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', (restaurant as any).id)
      .eq('status', 'completed')
      .gte('created_at', dateRange.start)
      .lt('created_at', dateRange.end);
    completedOrdersCount = count || 0;
  }

  // Get reservations count
  let reservationsCount = 0;
  if (restaurant) {
    const { count } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', (restaurant as any).id)
      .eq('intent', 'reservation')
      .gte('created_at', dateRange.start)
      .lt('created_at', dateRange.end);
    reservationsCount = count || 0;
  }

  return (
    <PlatformLayout restaurantName={(restaurant as any)?.name || null}>
      <div className="w-full px-6 py-6">
        <div className="max-w-7xl mx-auto px-6 py-8 rounded-2xl" style={{ backgroundColor: '#FFF8DC', minHeight: 'calc(100vh - 4rem)' }}>
          {!restaurant ? (
            <div 
              className="bg-white rounded-2xl shadow-sm p-8 border"
              style={{
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                borderColor: '#DEB887',
                borderWidth: '1px',
              }}
            >
              <h2 className="text-xl font-semibold mb-2" style={{ color: '#8B4513' }}>
                No Restaurant Configured
              </h2>
              <p className="text-sm mb-6" style={{ color: '#A0522D', opacity: 0.8 }}>
                Please configure your restaurant settings to start receiving orders.
              </p>
              <Link 
                href="/settings"
                className="inline-block px-6 py-3 rounded-lg font-semibold text-white"
                style={{ backgroundColor: '#8B4513' }}
              >
                Go to Settings
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {/* BAND 1: Operations Snapshot */}
              <SnapshotCard
                totalOrders={ordersCount || 0}
                newOrders={newOrdersCount}
                completedOrders={completedOrdersCount}
                reservations={reservationsCount}
                restaurantId={(restaurant as any).id}
              />

              {/* BAND 2: Live Work + Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Live Queue (8 cols) */}
                <div className="lg:col-span-8">
                  <div
                    className="bg-white rounded-2xl shadow-sm p-5 border h-full"
                    style={{
                      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                      borderColor: '#DEB887',
                      borderWidth: '1px',
                    }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-semibold" style={{ color: '#654321' }}>
                        Live Queue
                      </h3>
                      <Link
                        href="/orders"
                        className="text-xs font-medium hover:underline"
                        style={{ color: '#8B4513' }}
                      >
                        View All
                      </Link>
                    </div>
                    <CompactLiveQueue orders={recentOrders as any} restaurantId={(restaurant as any).id} />
                  </div>
                </div>

                {/* Right: Kitchen Feed + Hours & Routing (4 cols) */}
                <div className="lg:col-span-4 space-y-4">
                  {/* Kitchen Feed */}
                  <div
                    className="bg-white rounded-2xl shadow-sm p-5 border"
                    style={{
                      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                      borderColor: '#DEB887',
                      borderWidth: '1px',
                    }}
                  >
                    <h3 className="text-base font-semibold mb-4" style={{ color: '#654321' }}>
                      Kitchen Feed
                    </h3>
                    <CompactKitchenFeed orders={recentOrders as any} />
                  </div>

                  {/* Hours & Routing */}
                  <CompactInfoCard restaurant={restaurant} />
                </div>
              </div>

              {/* BAND 3: Setup & Tools */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <CompactPhoneRouting restaurant={restaurant as any} />
                {restaurant && (
                  <CompactDemoTools restaurantId={(restaurant as any).id} />
                )}
              </div>

              {/* Usage Display (if subscription exists) */}
              {(restaurant as any).subscription_plan && (
                <UsageDisplay
                  firmId={(restaurant as any).id}
                  subscriptionPlan={(restaurant as any).subscription_plan}
                  subscriptionStatus={(restaurant as any).subscription_status}
                  subscriptionCurrentPeriodEnd={(restaurant as any).subscription_current_period_end}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </PlatformLayout>
  );
}
