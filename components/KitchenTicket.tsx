'use client';

import { Order } from '@/types';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface KitchenTicketProps {
  order: Order;
  restaurantName: string;
}

export default function KitchenTicket({ order, restaurantName }: KitchenTicketProps) {
  const [copied, setCopied] = useState(false);

  const formatTime = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString([], {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getItemsText = () => {
    if (!order.items || !Array.isArray(order.items) || order.items.length === 0) {
      return 'No items specified';
    }
    return order.items.map((item, idx) => {
      if (typeof item === 'string') {
        return `  - ${item}`;
      }
      const qty = item.qty ? `${item.qty}x ` : '';
      const notes = item.notes ? ` (${item.notes})` : '';
      return `  - ${qty}${item.name}${notes}`;
    }).join('\n');
  };

  const kitchenTicketText = `${restaurantName}

Order Type: ${order.order_type ? order.order_type.charAt(0).toUpperCase() + order.order_type.slice(1) : 'N/A'}
Requested Time: ${order.requested_time || 'ASAP'}

Customer Information:
  Name: ${order.customer_name || 'N/A'}
  Phone: ${order.customer_phone || 'N/A'}

${order.order_type === 'delivery' && order.delivery_address ? `Delivery Address:\n  ${order.delivery_address}\n` : ''}Items:
${getItemsText()}

${order.special_instructions ? `Special Instructions:\n  ${order.special_instructions}\n` : ''}Call Details:
  Time: ${formatTime(order.created_at)}
  Status: ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}

${order.ai_summary ? `Summary:\n  ${order.ai_summary}\n` : ''}---`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(kitchenTicketText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6" style={{ border: '1px solid #DEB887' }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold" style={{ color: '#654321' }}>
          Kitchen Ticket
        </h2>
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer"
          style={{ color: '#8B4513' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FFF0C2'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copy
            </>
          )}
        </button>
      </div>
      <div
        className="rounded-lg p-6 font-mono text-sm whitespace-pre-wrap border"
        style={{
          backgroundColor: '#FFFDF7',
          borderColor: '#DEB887',
          color: '#654321',
          fontFamily: 'var(--font-sans), monospace',
          lineHeight: '1.6',
        }}
      >
        {kitchenTicketText}
      </div>
    </div>
  );
}

