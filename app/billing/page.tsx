import { createServerClient } from '@/lib/clients/supabase';
import { redirect } from 'next/navigation';
import { PlatformLayout } from '@/components/platform-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import BillingClient from '@/components/BillingClient';

// Force dynamic rendering since we use cookies for authentication
export const dynamic = 'force-dynamic';

export default async function BillingPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Get user's restaurant with subscription details
  const { data: restaurantData, error: restaurantError } = await supabase
    .from('restaurants')
    .select('*')
    .eq('owner_user_id', user.id)
    .limit(1)
    .single();

  if (restaurantError) {
    console.error('[Billing] Error fetching restaurant:', restaurantError);
    return (
      <PlatformLayout restaurantName={null}>
        <div className="p-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <p>Error loading billing information. Please try refreshing the page.</p>
          </div>
        </div>
      </PlatformLayout>
    );
  }

  const restaurant = restaurantData as any;

  return (
    <PlatformLayout restaurantName={restaurant?.name || null}>
      <div className="w-full px-6 py-6">
        <div className="max-w-7xl mx-auto px-6 py-8 rounded-2xl" style={{ backgroundColor: '#FFF8DC', minHeight: 'calc(100vh - 4rem)' }}>
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ color: '#8B4513' }}>
              Billing & Subscription
            </h1>
            <p className="text-sm" style={{ color: '#A0522D' }}>
              Manage your subscription, view invoices, and update payment methods
            </p>
          </div>

          <BillingClient firm={restaurant} />
        </div>
      </div>
    </PlatformLayout>
  );
}

