'use client';

import Link from 'next/link';
import { Settings, Mail, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CompactInfoCardProps {
  restaurant: any;
}

export default function CompactInfoCard({ restaurant }: CompactInfoCardProps) {
  const formatHours = (hoursOpen: string | null, hoursClose: string | null) => {
    if (!hoursOpen || !hoursClose) return 'Not set';
    
    const formatTime = (timeStr: string) => {
      const [hour, minute] = timeStr.split(':').map(Number);
      const date = new Date();
      date.setHours(hour, minute, 0, 0);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };
    
    return `${formatTime(hoursOpen)} - ${formatTime(hoursClose)}`;
  };

  return (
    <div
      className="bg-white rounded-2xl shadow-sm p-5 border"
      style={{
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        borderColor: '#DEB887',
        borderWidth: '1px',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold" style={{ color: '#654321' }}>
          Hours & Routing
        </h3>
        <Button asChild variant="outline" size="sm" className="h-8 px-3 rounded-md text-xs font-semibold border">
          <Link href="/settings" className="flex items-center gap-1.5">
            <Settings className="h-3.5 w-3.5" />
            Edit
          </Link>
        </Button>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-start gap-2.5">
          <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: '#8B4513' }} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium mb-0.5" style={{ color: '#A0522D', opacity: 0.8 }}>
              Operating Hours
            </p>
            <p className="text-sm font-medium" style={{ color: '#654321' }}>
              {formatHours(restaurant?.hours_open, restaurant?.hours_close)}
            </p>
            {restaurant?.after_hours_take_orders && (
              <p className="text-xs mt-1" style={{ color: '#A0522D', opacity: 0.7 }}>
                After-hours orders enabled
              </p>
            )}
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <Mail className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: '#8B4513' }} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium mb-0.5" style={{ color: '#A0522D', opacity: 0.8 }}>
              Kitchen Emails
            </p>
            <p className="text-sm font-medium truncate" style={{ color: '#654321' }}>
              {restaurant?.kitchen_emails?.length > 0
                ? restaurant.kitchen_emails.join(', ')
                : 'Not configured'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

