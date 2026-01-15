import { createServerClient } from '@/lib/clients/supabase';
import { redirect } from 'next/navigation';
import CallHandlingStudio from '@/components/CallHandlingStudio';
import { PlatformLayout } from '@/components/platform-layout';

// Force dynamic rendering since we use cookies for authentication
export const dynamic = 'force-dynamic';

export default async function AIReceptionistPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Get user's restaurant
  const { data: restaurants, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('owner_user_id', user.id)
    .limit(1)
    .single();

  const restaurant = restaurants || null;

  const refreshData = async () => {
    'use server';
    // This will trigger a refresh of the page
  };

  return (
    <PlatformLayout restaurantName={(restaurants as any)?.name || null}>
      <div className="w-full px-6 py-6">
        <div className="max-w-7xl mx-auto px-6 py-8 rounded-2xl" style={{ backgroundColor: '#FFF8DC', minHeight: 'calc(100vh - 4rem)' }}>
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ color: '#8B4513' }}>
              AI Receptionist Settings
            </h1>
            <p className="text-sm" style={{ color: '#A0522D' }}>
              Customize how your AI receptionist interacts with callers
            </p>
          </div>

          <CallHandlingStudio restaurant={restaurant} onSave={refreshData} />
        </div>
      </div>
    </PlatformLayout>
  );
}

