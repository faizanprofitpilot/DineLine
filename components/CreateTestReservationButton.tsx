'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface CreateTestReservationButtonProps {
  restaurantId: string;
}

export default function CreateTestReservationButton({ restaurantId }: CreateTestReservationButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCreateTestReservation = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test-reservation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId }),
      });
      
      if (response.ok) {
        // Use router.refresh() to refresh server data without full page reload
        router.refresh();
        // Small delay to ensure data is refreshed
        setTimeout(() => {
          setLoading(false);
        }, 500);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        alert(`Failed to create test reservation: ${errorData.error || 'Unknown error'}`);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error creating test reservation:', error);
      alert('Failed to create test reservation. Please try again.');
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleCreateTestReservation}
      disabled={loading}
      className="h-10 px-4 rounded-lg font-medium text-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      style={{ backgroundColor: '#8B4513', color: '#FFFFFF' }}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Creating...
        </>
      ) : (
        'Create Test Reservation'
      )}
    </Button>
  );
}

