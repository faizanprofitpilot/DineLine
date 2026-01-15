'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import CreateTestOrderButton from './CreateTestOrderButton';

interface CompactDemoToolsProps {
  restaurantId: string;
}

export default function CompactDemoTools({ restaurantId }: CompactDemoToolsProps) {
  return (
    <div
      className="bg-white rounded-2xl shadow-sm p-5 border"
      style={{
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        borderColor: '#DEB887',
        borderWidth: '1px',
      }}
    >
      <h3 className="text-base font-semibold mb-2" style={{ color: '#654321' }}>
        Demo Tools
      </h3>
      <p className="text-xs mb-4" style={{ color: '#A0522D', opacity: 0.7 }}>
        Create test orders to see how the system works
      </p>
      <div className="flex flex-col gap-2">
        <CreateTestOrderButton restaurantId={restaurantId} />
        <Button
          asChild
          variant="outline"
          size="sm"
          className="h-9 px-4 rounded-lg font-medium text-sm border"
          style={{ borderColor: '#DEB887', color: '#8B4513' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FFF0C2'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <Link href="/orders">View Orders</Link>
        </Button>
      </div>
    </div>
  );
}

