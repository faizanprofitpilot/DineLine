'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Order } from '@/types';
import { Button } from '@/components/ui/button';
import { Copy, Trash2 } from 'lucide-react';
import KitchenTicket from './KitchenTicket';
import AudioPlayer from '@/components/AudioPlayer';

interface OrderDetailProps {
  order: Order;
  restaurantName: string;
}

export default function OrderDetail({ order, restaurantName }: OrderDetailProps) {
  const router = useRouter();
  const [status, setStatus] = useState<Order['status']>(order.status);

  const handleStatusUpdate = async (newStatus: Order['status']) => {
    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setStatus(newStatus);
        router.refresh();
      } else {
        alert('Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update order status');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/orders');
      } else {
        alert('Failed to delete order');
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('Failed to delete order');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Kitchen Ticket (Print-friendly receipt) */}
      <div>
        <KitchenTicket order={order} restaurantName={restaurantName} />
      </div>

      {/* Right: Status, Actions, and Details */}
      <div className="space-y-6">
        {/* Status Controls */}
        <div className="bg-white rounded-2xl shadow-sm p-6" style={{ border: '1px solid #DEB887' }}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: '#654321' }}>
            Order Status
          </h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleStatusUpdate('new')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                status === 'new' ? 'text-white' : ''
              }`}
              style={{
                backgroundColor: status === 'new' ? '#DC143C' : '#FFF0C2',
                color: status === 'new' ? '#FFFFFF' : '#654321',
              }}
            >
              New
            </button>
            <button
              onClick={() => handleStatusUpdate('in_progress')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                status === 'in_progress' ? 'text-white' : ''
              }`}
              style={{
                backgroundColor: status === 'in_progress' ? '#FF8C42' : '#FFF0C2',
                color: status === 'in_progress' ? '#FFFFFF' : '#654321',
              }}
            >
              In Progress
            </button>
            <button
              onClick={() => handleStatusUpdate('completed')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                status === 'completed' ? 'text-white' : ''
              }`}
              style={{
                backgroundColor: status === 'completed' ? '#228B22' : '#FFF0C2',
                color: status === 'completed' ? '#FFFFFF' : '#654321',
              }}
            >
              Completed
            </button>
          </div>
        </div>

        {/* Call Playback */}
        {order.audio_url && (
          <AudioPlayer audioUrl={order.audio_url} title="Call Recording" />
        )}

        {/* Transcript */}
        {order.transcript_text && (
          <div className="bg-white rounded-2xl shadow-sm p-6" style={{ border: '1px solid #DEB887' }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: '#654321' }}>
              Transcript
            </h2>
            <div
              className="max-h-64 overflow-y-auto p-4 rounded-lg text-sm whitespace-pre-wrap"
              style={{
                backgroundColor: '#FFFDF7',
                color: '#654321',
                border: '1px solid #DEB887',
              }}
            >
              {order.transcript_text}
            </div>
          </div>
        )}

        {/* AI Summary */}
        {order.ai_summary && (
          <div className="bg-white rounded-2xl shadow-sm p-6" style={{ border: '1px solid #DEB887' }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: '#654321' }}>
              AI Summary
            </h2>
            <p className="text-sm" style={{ color: '#654321' }}>
              {order.ai_summary}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="bg-white rounded-2xl shadow-sm p-6" style={{ border: '1px solid #DEB887' }}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: '#654321' }}>
            Actions
          </h2>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors hover:bg-red-50 cursor-pointer"
            style={{ color: '#DC143C' }}
          >
            <Trash2 className="h-4 w-4" />
            Delete Order
          </button>
        </div>

        {/* Debug: Raw JSON (Collapsible) */}
        {process.env.NODE_ENV === 'development' && (
          <details className="bg-white rounded-2xl shadow-sm p-6" style={{ border: '1px solid #DEB887' }}>
            <summary className="text-sm font-semibold cursor-pointer mb-2" style={{ color: '#654321' }}>
              Debug: Raw JSON
            </summary>
            <pre className="text-xs overflow-auto p-4 rounded-lg" style={{ backgroundColor: '#FFFDF7', color: '#654321' }}>
              {JSON.stringify(order, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
