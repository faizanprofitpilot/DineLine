import { createServerClient } from '@/lib/clients/supabase';
import { redirect } from 'next/navigation';
import { PlatformLayout } from '@/components/platform-layout';
import ReservationsCalendar from '@/components/ReservationsCalendar';
import CreateTestReservationButton from '@/components/CreateTestReservationButton';
import { Order } from '@/types';

// Force dynamic rendering since we use cookies for authentication
export const dynamic = 'force-dynamic';

export default async function ReservationsPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Get user's restaurant
  const { data: restaurants, error: restaurantError } = await supabase
    .from('restaurants')
    .select('id, name')
    .eq('owner_user_id', user.id)
    .limit(1)
    .single();

  if (restaurantError || !restaurants) {
    return (
      <PlatformLayout restaurantName={null}>
      <div className="w-full px-6 py-6">
        <div className="max-w-7xl mx-auto px-6 py-8 rounded-2xl" style={{ backgroundColor: '#FFF8DC', minHeight: 'calc(100vh - 4rem)' }}>
            <div className="text-center">
              <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ color: '#8B4513' }}>
                No Restaurant Found
              </h1>
              <p className="text-sm mb-6" style={{ color: '#A0522D' }}>
                Please set up your restaurant in Settings first.
              </p>
            </div>
          </div>
        </div>
      </PlatformLayout>
    );
  }

  // Fetch all reservations (orders with intent='reservation')
  const { data: reservations, error: reservationsError } = await supabase
    .from('orders')
    .select('*')
    .eq('restaurant_id', (restaurants as any).id)
    .eq('intent', 'reservation')
    .order('created_at', { ascending: false });

  const reservationsList: Order[] = (reservations || []) as Order[];

  return (
    <PlatformLayout restaurantName={(restaurants as any)?.name || null}>
      <div className="w-full px-6 py-6">
        <div className="max-w-7xl mx-auto px-6 py-8 rounded-2xl" style={{ backgroundColor: '#FFF8DC', minHeight: 'calc(100vh - 4rem)' }}>
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ color: '#8B4513' }}>
                Reservations
              </h1>
              <p className="text-sm" style={{ color: '#A0522D' }}>
                View and manage reservations booked through your AI voice receptionist
              </p>
            </div>
            <CreateTestReservationButton restaurantId={(restaurants as any).id} />
          </div>

          {/* Calendar */}
          {reservationsList.length > 0 ? (
            <ReservationsCalendar reservations={reservationsList} />
          ) : (
            <div className="bg-white rounded-2xl shadow-sm p-12 text-center" style={{ boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)' }}>
              <div className="mb-4">
                <svg
                  className="w-16 h-16 mx-auto"
                  style={{ color: '#A0522D', opacity: 0.5 }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2" style={{ color: '#8B4513' }}>
                No Reservations Yet
              </h2>
              <p className="text-sm mb-6" style={{ color: '#A0522D', opacity: 0.8 }}>
                Reservations made through your AI voice receptionist will appear here.
              </p>
              <p className="text-xs" style={{ color: '#A0522D', opacity: 0.6 }}>
                Make sure reservations are enabled in Settings.
              </p>
            </div>
          )}
        </div>
      </div>
    </PlatformLayout>
  );
}

