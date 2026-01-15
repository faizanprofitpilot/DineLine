'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Order } from '@/types';
import { Clock, MapPin, Package } from 'lucide-react';

interface OrdersKanbanProps {
  orders: Order[];
}

export default function OrdersKanban({ orders }: OrdersKanbanProps) {
  const router = useRouter();
  const [draggedOrder, setDraggedOrder] = useState<Order | null>(null);
  const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null);
  const [localOrders, setLocalOrders] = useState<Order[]>(orders);
  const [showAllCompleted, setShowAllCompleted] = useState(false);

  // Update local orders when props change
  useEffect(() => {
    setLocalOrders(orders);
  }, [orders]);

  // Filter completed orders to recent ones by default (last 7 days)
  const getRecentCompletedCutoff = () => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    return cutoff;
  };

  // Group orders by status
  const allCompleted = localOrders.filter(order => order.status === 'completed');
  const recentCompleted = showAllCompleted 
    ? allCompleted 
    : allCompleted.filter(order => {
        const orderDate = new Date(order.created_at || order.started_at || 0);
        return orderDate >= getRecentCompletedCutoff();
      });

  const ordersByStatus = {
    new: localOrders.filter(order => order.status === 'new'),
    in_progress: localOrders.filter(order => order.status === 'in_progress'),
    completed: recentCompleted,
  };

  const handleDragStart = (e: React.DragEvent, order: Order) => {
    setDraggedOrder(order);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', order.id);
    // Add visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    // Reset visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
    setDraggedOrder(null);
    setDraggedOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, columnStatus: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDraggedOverColumn(columnStatus);
  };

  const handleDragLeave = () => {
    setDraggedOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: 'new' | 'in_progress' | 'completed') => {
    e.preventDefault();
    setDraggedOverColumn(null);

    if (!draggedOrder) return;

    // Don't update if dropped in the same column
    if (draggedOrder.status === targetStatus) {
      setDraggedOrder(null);
      return;
    }

    // Optimistically update UI
    const updatedOrders = localOrders.map(order =>
      order.id === draggedOrder.id ? { ...order, status: targetStatus } : order
    );
    setLocalOrders(updatedOrders);

    // Update on server
    try {
      const response = await fetch(`/api/orders/${draggedOrder.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: targetStatus }),
      });

      if (!response.ok) {
        // Revert on error
        setLocalOrders(orders);
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        alert(`Failed to update order status: ${errorData.error || 'Unknown error'}`);
      } else {
        // Refresh to get latest data
        router.refresh();
      }
    } catch (error) {
      // Revert on error
      setLocalOrders(orders);
      console.error('Error updating order status:', error);
      alert('Failed to update order status. Please try again.');
    } finally {
      setDraggedOrder(null);
    }
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getOrderItemsPreview = (order: Order) => {
    if (!order.items || !Array.isArray(order.items) || order.items.length === 0) {
      return 'No items';
    }
    const items = order.items.slice(0, 2);
    return items.map(item => {
      if (typeof item === 'string') return item;
      return item.qty ? `${item.qty}x ${item.name}` : item.name;
    }).join(', ') + (order.items.length > 2 ? ` +${order.items.length - 2} more` : '');
  };

  const renderOrderCard = (order: Order) => {
    const itemsPreview = getOrderItemsPreview(order);
    const totalItems = Array.isArray(order.items) ? order.items.length : 0;
    const isDragging = draggedOrder?.id === order.id;

    return (
      <div
        key={order.id}
        draggable
        onDragStart={(e) => handleDragStart(e, order)}
        onDragEnd={handleDragEnd}
        onClick={() => router.push(`/orders/${order.id}`)}
        className="p-4 rounded-xl border cursor-move hover:shadow-md transition-all mb-3 bg-white"
        style={{
          borderColor: '#DEB887',
          opacity: isDragging ? 0.5 : 1,
          cursor: 'grab',
        }}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm mb-1" style={{ color: '#654321' }}>
              {order.customer_name || 'Unknown Customer'}
            </p>
            <div className="flex items-center gap-2 text-xs" style={{ color: '#A0522D', opacity: 0.8 }}>
              <Clock className="h-3 w-3" />
              {formatTime(order.created_at)}
            </div>
          </div>
          {order.order_type && (
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
              style={{
                backgroundColor: order.order_type === 'delivery' ? '#FFE4B5' : '#FFF0C2',
                color: '#654321',
              }}
            >
              {order.order_type.charAt(0).toUpperCase() + order.order_type.slice(1)}
            </span>
          )}
        </div>

        {order.delivery_address && order.order_type === 'delivery' && (
          <div className="flex items-start gap-1.5 mb-2 text-xs" style={{ color: '#A0522D' }}>
            <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span className="truncate">{order.delivery_address}</span>
          </div>
        )}

        <div className="flex items-start gap-1.5 mb-2 text-xs" style={{ color: '#8B4513' }}>
          <Package className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <span className="line-clamp-2">{itemsPreview}</span>
        </div>

        {totalItems > 0 && (
          <div className="text-xs font-medium mt-2 pt-2 border-t" style={{ borderColor: '#DEB887', color: '#654321' }}>
            {totalItems} item{totalItems !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    );
  };

  const columns = [
    { title: 'New', status: 'new' as const, orders: ordersByStatus.new, color: '#DC143C' },
    { title: 'In Progress', status: 'in_progress' as const, orders: ordersByStatus.in_progress, color: '#FF8C42' },
    { title: 'Completed', status: 'completed' as const, orders: ordersByStatus.completed, color: '#228B22' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {columns.map((column) => {
        const isDragOver = draggedOverColumn === column.status;
        const isDraggingFromThisColumn = draggedOrder && draggedOrder.status === column.status;

        return (
          <div
            key={column.status}
            className="flex flex-col"
            onDragOver={(e) => handleDragOver(e, column.status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.status)}
          >
            <div className="mb-4 pb-3 border-b" style={{ borderColor: '#DEB887' }}>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold" style={{ color: '#654321' }}>
                  {column.title}
                </h3>
                <div className="flex items-center gap-2">
                  {column.status === 'completed' && allCompleted.length > recentCompleted.length && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAllCompleted(!showAllCompleted);
                      }}
                      className="text-xs font-medium hover:underline px-2 py-1 rounded"
                      style={{ color: '#8B4513' }}
                    >
                      {showAllCompleted ? 'Show recent' : `+${allCompleted.length - recentCompleted.length} older`}
                    </button>
                  )}
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: column.color + '20',
                      color: column.color,
                    }}
                  >
                    {column.orders.length - (isDraggingFromThisColumn ? 1 : 0)}
                    {column.status === 'completed' && !showAllCompleted && allCompleted.length > recentCompleted.length && (
                      <span className="ml-1 opacity-70">/ {allCompleted.length}</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
            <div
              className="flex-1 min-h-[200px] transition-colors rounded-lg"
              style={{
                backgroundColor: isDragOver ? '#FFF8DC' : 'transparent',
                border: isDragOver ? '2px dashed #FF8C42' : '2px dashed transparent',
                padding: isDragOver ? '0.5rem' : '0',
              }}
            >
              {column.orders.length === 0 && !isDragOver ? (
                <div className="text-center py-8 text-sm" style={{ color: '#A0522D', opacity: 0.5 }}>
                  No orders
                </div>
              ) : (
                <>
                  {column.orders.map(renderOrderCard)}
                  {isDragOver && draggedOrder && draggedOrder.status !== column.status && (
                    <div className="p-4 rounded-xl border-2 border-dashed mb-3 bg-white/50" style={{ borderColor: '#FF8C42' }}>
                      <div className="text-center text-sm" style={{ color: '#FF8C42' }}>
                        Drop here to move to {column.title}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

