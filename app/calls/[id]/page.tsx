import { createServerClient } from '@/lib/clients/supabase';
import { redirect } from 'next/navigation';
import CallTranscript from '@/components/CallTranscript';
import { PlatformLayout } from '@/components/platform-layout';

// Force dynamic rendering since we use cookies for authentication
export const dynamic = 'force-dynamic';

export default async function CallDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Get call
  const { data: call, error } = await supabase
    .from('calls')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !call) {
    redirect('/calls');
  }

  // Verify user owns the firm that owns this call
  const { data: firmData } = await supabase
    .from('firms')
    .select('owner_user_id')
    .eq('id', (call as any).firm_id)
    .single();

  const firm = firmData as any;
  if (!firm || firm.owner_user_id !== user.id) {
    redirect('/calls');
  }

  return (
    <PlatformLayout>
      <div className="w-full px-6 py-6">
        <div className="max-w-7xl mx-auto px-6 py-8 rounded-2xl" style={{ backgroundColor: '#FFF8DC', minHeight: 'calc(100vh - 4rem)' }}>
          <CallTranscript call={call as any} />
        </div>
          </div>
    </PlatformLayout>
  );
}

