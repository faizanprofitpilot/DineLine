'use client';

import { useRouter } from 'next/navigation';
import { Order, OrderStatus, OrderIntent, OrderType } from '@/types';
import { Button } from '@/components/ui/button';

interface OrdersListProps {
  orders: Order[];
  searchParams: { status?: string; type?: string; intent?: string };
}

export default function OrdersList({ orders, searchParams }: OrdersListProps) {
  const router = useRouter();

  const getStatusBadgeClass = (status: OrderStatus) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'in_progress':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'new':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-[#FFF0C2] text-[#A0522D] border-[#DEB887]';
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const orderDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (orderDate.getTime() === today.getTime()) {
      return `Today, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (orderDate.getTime() === yesterday.getTime()) {
      return `Yesterday, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    }
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const formatItems = (items: any): string => {
    if (!items || !Array.isArray(items) || items.length === 0) {
      return 'No items';
    }
    const itemNames = items.slice(0, 2).map((item: any) => {
      const qty = item.qty ? `${item.qty}x ` : '';
      return `${qty}${item.name}`;
    });
    const more = items.length > 2 ? ` +${items.length - 2} more` : '';
    return itemNames.join(', ') + more;
  };

  const handleFilter = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newParams = new URLSearchParams();
    if (formData.get('status')) newParams.set('status', formData.get('status') as string);
    if (formData.get('type')) newParams.set('type', formData.get('type') as string);
    if (formData.get('intent')) newParams.set('intent', formData.get('intent') as string);
    router.push(`/orders?${newParams.toString()}`);
  };

  return (
    <div className="flex flex-col">
      {/* Filters */}
      <div className="p-6 border-b" style={{ borderColor: '#DEB887' }}>
        <form onSubmit={handleFilter} className="flex gap-4 flex-wrap items-end">
          <div className="flex-1 min-w-[150px]">
            <label 
              htmlFor="status" 
              className="block text-xs font-semibold uppercase tracking-wide mb-2"
              style={{ color: '#A0522D' }}
            >
              Status
            </label>
            <select
              id="status"
              name="status"
              className="w-full h-10 px-3 rounded-lg border text-sm"
              style={{
                borderColor: '#DEB887',
                backgroundColor: '#FFFFFF',
              }}
              defaultValue={searchParams.status || ''}
            >
              <option value="">All</option>
              <option value="new">New</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label 
              htmlFor="type" 
              className="block text-xs font-semibold uppercase tracking-wide mb-2"
              style={{ color: '#A0522D' }}
            >
              Type
            </label>
            <select
              id="type"
              name="type"
              className="w-full h-10 px-3 rounded-lg border text-sm"
              style={{
                borderColor: '#DEB887',
                backgroundColor: '#FFFFFF',
              }}
              defaultValue={searchParams.type || ''}
            >
              <option value="">All</option>
              <option value="pickup">Pickup</option>
              <option value="delivery">Delivery</option>
              <option value="reservation">Reservation</option>
            </select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label 
              htmlFor="intent" 
              className="block text-xs font-semibold uppercase tracking-wide mb-2"
              style={{ color: '#A0522D' }}
            >
              Intent
            </label>
            <select
              id="intent"
              name="intent"
              className="w-full h-10 px-3 rounded-lg border text-sm"
              style={{
                borderColor: '#DEB887',
                backgroundColor: '#FFFFFF',
              }}
              defaultValue={searchParams.intent || ''}
            >
              <option value="">All</option>
              <option value="order">Order</option>
              <option value="reservation">Reservation</option>
              <option value="info">Info</option>
            </select>
          </div>
          <div>
            <Button 
              type="submit"
              className="h-10 px-4 rounded-lg font-semibold text-sm"
              style={{ backgroundColor: '#8B4513', color: '#FFFFFF' }}
            >
              Filter
            </Button>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="overflow-auto">
        {!orders || orders.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm" style={{ color: '#A0522D', opacity: 0.8 }}>No orders found.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#A0522D' }}>
                  Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#A0522D' }}>
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#A0522D' }}>
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#A0522D' }}>
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#A0522D' }}>
                  Items
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#A0522D' }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const items = order.items || (order.raw_payload as any)?.items || [];
                return (
                  <tr
                    key={order.id}
                    className="border-b transition-colors cursor-pointer"
                    style={{ borderColor: '#DEB887', opacity: 0.5 }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FFF0C2'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    onClick={() => router.push(`/orders/${order.id}`)}
                  >
                    <td className="px-4 py-3 text-sm" style={{ color: '#8B4513' }}>
                      {formatDate(order.started_at)}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: '#8B4513' }}>
                      {order.customer_name || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-sm capitalize" style={{ color: '#A0522D' }}>
                      {order.order_type || order.intent}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full border ${
                          getStatusBadgeClass(order.status)
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: '#A0522D' }}>
                      {formatItems(items)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {order.status !== 'completed' && (
                          <button
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              try {
                                const response = await fetch(`/api/orders/${order.id}`, {
                                  method: 'PUT',
                                  headers: {
                                    'Content-Type': 'application/json',
                                  },
                                  body: JSON.stringify({ status: 'completed' }),
                                });
                                
                                if (response.ok) {
                                  router.refresh();
                                } else {
                                  const data = await response.json();
                                  alert(`Failed to fulfill order: ${data.error || 'Unknown error'}`);
                                }
                              } catch (error) {
                                console.error('Error fulfilling order:', error);
                                alert('Failed to fulfill order. Please check the console for details.');
                              }
                            }}
                            className="px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer"
                            style={{ 
                              backgroundColor: '#8B4513',
                              color: '#FFFFFF',
                            }}
                          >
                            Fulfill
                          </button>
                        )}
                        <button
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
                              try {
                                const response = await fetch(`/api/orders/${order.id}`, {
                                  method: 'DELETE',
                                  headers: {
                                    'Content-Type': 'application/json',
                                  },
                                });
                                
                                if (response.ok) {
                                  router.refresh();
                                } else {
                                  const data = await response.json();
                                  alert(`Failed to delete order: ${data.error || 'Unknown error'}`);
                                }
                              } catch (error) {
                                console.error('Error deleting order:', error);
                                alert('Failed to delete order. Please check the console for details.');
                              }
                            }
                          }}
                          className="px-3 py-1 rounded text-xs hover:bg-red-100 hover:text-red-600 transition-colors"
                          style={{ color: '#A0522D' }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {orders && orders.length > 0 && (
          <div className="p-6 border-t flex items-center justify-between text-sm" style={{ color: '#A0522D', borderColor: '#DEB887' }}>
          <div>
            Showing {orders.length} order{orders.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
}

