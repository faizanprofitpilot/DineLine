'use client';

import { Order } from '@/types';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface RecentOrdersTableProps {
  orders: Order[];
}

export default function RecentOrdersTable({ orders }: RecentOrdersTableProps) {
  const handleRowClick = (orderId: string) => {
    window.location.href = `/orders/${orderId}`;
  };

  if (!orders || orders.length === 0) {
    return null;
  }

  return (
    <div 
      className="bg-white rounded-xl shadow-sm overflow-hidden"
      style={{
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      }}
    >
      <div className="p-8 border-b border-[#DEB887]">
        <h2 className="text-lg font-semibold mb-1" style={{ color: '#A0522D' }}>
          Recent Orders
        </h2>
        <p className="text-sm" style={{ color: '#A0522D', opacity: 0.7 }}>
          Latest order activity
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#DEB887]">
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#A0522D' }}>
                Customer
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#A0522D' }}>
                Date
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#A0522D' }}>
                Type
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#A0522D' }}>
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              return (
                <tr 
                  key={order.id} 
                  className="border-b border-[#DEB887] hover:bg-[#FFF0C2] transition-colors cursor-pointer" 
                  onClick={() => handleRowClick(order.id)}
                >
                  <td className="px-6 py-4 text-sm" style={{ color: '#8B4513' }}>{order.customer_name || 'Unknown'}</td>
                  <td className="px-6 py-4 text-sm" style={{ color: '#A0522D', opacity: 0.8 }}>
                    {new Date(order.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm capitalize" style={{ color: '#A0522D' }}>
                    {order.order_type || order.intent}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                        order.status === 'completed'
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : order.status === 'in_progress'
                          ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="p-6 border-t border-[#DEB887]">
        <Button 
          asChild 
          variant="outline"
          className="h-12 px-6 rounded-lg font-semibold cursor-pointer border"
          style={{ 
            borderColor: '#DEB887',
            color: '#8B4513',
          }}
        >
          <Link href="/orders">View All Orders</Link>
        </Button>
      </div>
    </div>
  );
}

