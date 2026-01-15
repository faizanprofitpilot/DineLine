'use client';

import { Button } from '@/components/ui/button';

interface CreateTestOrderButtonProps {
  restaurantId: string;
}

export default function CreateTestOrderButton({ restaurantId }: CreateTestOrderButtonProps) {
  const handleCreateTestOrder = async () => {
    try {
      const response = await fetch('/api/test-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId }),
      });
      if (response.ok) {
        window.location.reload();
      } else {
        alert('Failed to create test order');
      }
    } catch (error) {
      console.error('Error creating test order:', error);
      alert('Failed to create test order');
    }
  };

  return (
    <Button
      onClick={handleCreateTestOrder}
      className="h-9 px-4 rounded-lg font-medium text-sm cursor-pointer w-full"
      style={{ backgroundColor: '#8B4513', color: '#FFFFFF' }}
    >
      Create Test Order
    </Button>
  );
}

