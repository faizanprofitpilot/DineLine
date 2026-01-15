'use client';

import { Order } from '@/types';
import Link from 'next/link';
import { Clock, ShoppingCart } from 'lucide-react';
import { getCustomerName } from '@/lib/utils/extract-customer-info';

interface LiveQueueProps {
  orders: Order[];
}

export default function LiveQueue({ orders }: LiveQueueProps) {
  // Filter for New and In Progress orders, limit to 6
  const activeOrders = orders
    .filter(order => order.status === 'new' || order.status === 'in_progress')
    .slice(0, 6);

  if (activeOrders.length === 0) {
    return (
      <div className="text-center py-8">
        <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" style={{ color: '#A0522D' }} />
        <p className="text-sm" style={{ color: '#A0522D', opacity: 0.7 }}>
          No active orders
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {activeOrders.map((order) => {
        const timeAgo = order.created_at
          ? new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '';

        return (
          <Link
            key={order.id}
            href={`/orders/${order.id}`}
            className="block p-4 rounded-lg border hover:shadow-sm transition-all"
            style={{
              borderColor: '#DEB887',
              backgroundColor: order.status === 'new' ? '#FFF8DC' : '#FFFFFF',
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold" style={{ color: '#654321' }}>
                    {getCustomerName(order)}
                  </span>
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: order.status === 'new' ? '#FFE4B5' : '#FFF0C2',
                      color: '#654321',
                    }}
                  >
                    {order.status === 'new' ? 'New' : 'In Progress'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs" style={{ color: '#A0522D', opacity: 0.8 }}>
                  <Clock className="h-3 w-3" />
                  {timeAgo}
                </div>
                {order.order_type && (
                  <div className="mt-1 text-xs font-medium" style={{ color: '#8B4513' }}>
                    {order.order_type.charAt(0).toUpperCase() + order.order_type.slice(1)}
                  </div>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

