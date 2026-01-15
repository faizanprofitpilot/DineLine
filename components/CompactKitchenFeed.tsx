'use client';

import { Order } from '@/types';
import { CheckCircle, ShoppingCart, Calendar, Clock } from 'lucide-react';
import Link from 'next/link';
import EmptyState from './EmptyState';

interface CompactKitchenFeedProps {
  orders: Order[];
}

export default function CompactKitchenFeed({ orders }: CompactKitchenFeedProps) {
  // Get recent events (last 6 orders, sorted by created_at desc)
  const recentEvents = orders
    .sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 6);

  const getEventIcon = (order: Order) => {
    if (order.status === 'completed') {
      return <CheckCircle className="h-4 w-4" style={{ color: '#228B22' }} />;
    }
    if (order.intent === 'reservation') {
      return <Calendar className="h-4 w-4" style={{ color: '#FF8C42' }} />;
    }
    return <ShoppingCart className="h-4 w-4" style={{ color: '#8B4513' }} />;
  };

  const getEventDescription = (order: Order) => {
    if (order.status === 'completed') {
      return `Order for ${order.customer_name || 'customer'} completed`;
    }
    if (order.intent === 'reservation') {
      return `Reservation request from ${order.customer_name || 'customer'}`;
    }
    return `New order from ${order.customer_name || 'customer'}`;
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  if (recentEvents.length === 0) {
    return (
      <EmptyState
        icon={<Clock className="h-10 w-10 mx-auto opacity-30" style={{ color: '#A0522D' }} />}
        title="No recent activity"
        description="Recent orders and updates will appear here."
      />
    );
  }

  return (
    <div className="space-y-2">
      {recentEvents.map((order) => (
        <Link
          key={order.id}
          href={`/orders/${order.id}`}
          className="flex items-start gap-2.5 p-2.5 rounded-lg border transition-colors"
          style={{ borderColor: '#DEB887', borderWidth: '1px' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FFF0C2'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <div className="mt-0.5 flex-shrink-0">{getEventIcon(order)}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium" style={{ color: '#654321' }}>
              {getEventDescription(order)}
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#A0522D', opacity: 0.7 }}>
              {formatTime(order.created_at)}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}

