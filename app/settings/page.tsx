import { createServerClient } from '@/lib/clients/supabase';
import { redirect } from 'next/navigation';
import SettingsForm from '@/components/SettingsForm';
import { PlatformLayout } from '@/components/platform-layout';

// Force dynamic rendering since we use cookies for authentication
export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
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
                  Settings
            </h1>
            <p className="text-sm" style={{ color: '#A0522D' }}>
              Manage your restaurant configuration and preferences
            </p>
              </div>

          <div 
            className="bg-white rounded-2xl shadow-sm p-6 md:p-8"
            style={{
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
            }}
          >
            <SettingsForm firm={restaurant} onSave={refreshData} />
          </div>
        </div>
        </div>
    </PlatformLayout>
  );
}

