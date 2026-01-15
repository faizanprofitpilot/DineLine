import { createServerClient } from '@/lib/clients/supabase';
import { redirect } from 'next/navigation';
import OrderDetail from '@/components/OrderDetail';
import { PlatformLayout } from '@/components/platform-layout';

// Force dynamic rendering since we use cookies for authentication
export const dynamic = 'force-dynamic';

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Get order
  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !order) {
    redirect('/orders');
  }

  // Verify user owns the restaurant that owns this order
  const { data: restaurantData } = await supabase
    .from('restaurants')
    .select('name, owner_user_id')
    .eq('id', (order as any).restaurant_id)
    .single();

  const restaurant = restaurantData as any;
  if (!restaurant || restaurant.owner_user_id !== user.id) {
    redirect('/orders');
  }

  return (
    <PlatformLayout restaurantName={restaurant?.name || null}>
      <div className="w-full px-6 py-6">
        <div className="max-w-7xl mx-auto px-6 py-8 rounded-2xl" style={{ backgroundColor: '#FFF8DC', minHeight: 'calc(100vh - 4rem)' }}>
          <OrderDetail order={order as any} restaurantName={restaurant.name} />
        </div>
      </div>
    </PlatformLayout>
  );
}

