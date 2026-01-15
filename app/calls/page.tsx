import { createServerClient } from '@/lib/clients/supabase';
import { redirect } from 'next/navigation';
import { PlatformLayout } from '@/components/platform-layout';
import CallsList from '@/components/CallsList';

// Force dynamic rendering since we use cookies for authentication
export const dynamic = 'force-dynamic';

export default async function CallsPage({
  searchParams,
}: {
  searchParams: { status?: string; urgency?: string };
}) {
  try {
    const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Get user's firm
    const { data: firmData, error: firmError } = await supabase
    .from('firms')
    .select('id')
    .eq('owner_user_id', user.id)
    .limit(1)
    .single();

    if (firmError || !firmData) {
    redirect('/settings');
  }

  const firm = firmData as any;

  // Build query
  let query = supabase
    .from('calls')
    .select('*')
    .eq('firm_id', firm.id)
    .order('started_at', { ascending: false });

  // Apply filters
  if (searchParams.status) {
    query = query.eq('status', searchParams.status);
  }
  if (searchParams.urgency) {
    query = query.eq('urgency', searchParams.urgency);
  }

  const { data: calls, error } = await query;

  if (error) {
    console.error('Error fetching calls:', error);
  }

    const callsList = calls || [];

  return (
      <PlatformLayout>
        <div className="w-full px-6 py-6">
          <div className="max-w-7xl mx-auto px-6 py-8 rounded-2xl" style={{ backgroundColor: '#FFF8DC', minHeight: 'calc(100vh - 4rem)' }}>
            <div className="mb-8">
              <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ color: '#8B4513' }}>
                Call Activity
              </h1>
              <p className="text-sm" style={{ color: '#A0522D' }}>
                View and manage your AI receptionist's call records
              </p>
            </div>
            <div 
              className="bg-white rounded-2xl shadow-sm overflow-hidden"
              style={{
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
              }}
            >
              <CallsList calls={callsList} searchParams={searchParams} />
            </div>
          </div>
        </div>
      </PlatformLayout>
    );
  } catch (error) {
    console.error('Error in CallsPage:', error);
    // Return a safe fallback UI
    return (
      <PlatformLayout>
        <div className="w-full px-6 py-6">
          <div className="max-w-7xl mx-auto px-6 py-8 rounded-2xl" style={{ backgroundColor: '#FFF8DC', minHeight: 'calc(100vh - 4rem)' }}>
            <div className="mb-8">
              <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ color: '#8B4513' }}>
                Call Activity
              </h1>
              <p className="text-sm" style={{ color: '#A0522D' }}>
                View and manage your AI receptionist's call records
              </p>
            </div>
            <div 
              className="bg-white rounded-2xl shadow-sm p-12 text-center"
              style={{
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
              }}
            >
              <p className="text-sm" style={{ color: '#A0522D', opacity: 0.8 }}>
                Unable to load calls. Please try again later.
              </p>
            </div>
          </div>
        </div>
      </PlatformLayout>
  );
}
}
