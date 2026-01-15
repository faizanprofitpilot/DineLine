'use client';

import Link from 'next/link';
import { Settings, Mail, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HoursAndRoutingProps {
  restaurant: any;
}

export default function HoursAndRouting({ restaurant }: HoursAndRoutingProps) {
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
    <div className="space-y-4">
      {/* Hours */}
      <div className="flex items-start gap-3">
        <Clock className="h-5 w-5 mt-0.5" style={{ color: '#8B4513' }} />
        <div className="flex-1">
          <p className="text-sm font-semibold mb-1" style={{ color: '#654321' }}>
            Operating Hours
          </p>
          <p className="text-sm" style={{ color: '#A0522D' }}>
            {formatHours(restaurant?.hours_open, restaurant?.hours_close)}
          </p>
          {restaurant?.after_hours_take_orders && (
            <p className="text-xs mt-1" style={{ color: '#A0522D', opacity: 0.7 }}>
              After-hours orders enabled
            </p>
          )}
        </div>
      </div>

      {/* Kitchen Emails */}
      <div className="flex items-start gap-3">
        <Mail className="h-5 w-5 mt-0.5" style={{ color: '#8B4513' }} />
        <div className="flex-1">
          <p className="text-sm font-semibold mb-1" style={{ color: '#654321' }}>
            Kitchen Emails
          </p>
          <p className="text-sm" style={{ color: '#A0522D' }}>
            {restaurant?.kitchen_emails?.length > 0
              ? restaurant.kitchen_emails.join(', ')
              : 'Not configured'}
          </p>
        </div>
      </div>

      {/* Edit Button */}
      <div className="pt-2">
        <Button asChild variant="outline" size="sm" className="w-full">
          <Link href="/settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Edit Settings
          </Link>
        </Button>
      </div>
    </div>
  );
}

