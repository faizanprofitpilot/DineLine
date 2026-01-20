'use client';

import { useState, useMemo } from 'react';
import { Order } from '@/types';
import Link from 'next/link';
import { getCustomerName } from '@/lib/utils/extract-customer-info';

interface ReservationsCalendarProps {
  reservations: Order[];
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  reservations: Order[];
}

// Parse a reservation date/time from multiple sources on the order.
// We prefer explicit date+time; if only time is present, we anchor it to the created_at date.
function parseReservationTime(order: Order): Date | null {
  const created = new Date(order.created_at);
  const now = new Date();

  const rawPayload = (order.raw_payload && typeof order.raw_payload === 'object') ? (order.raw_payload as any) : undefined;
  const candidates: Array<string> = [
    order.requested_time || '',
    rawPayload?.requested_time || '',
    order.ai_summary || '',
    order.transcript_text || '',
  ].map((s) => (typeof s === 'string' ? s.trim() : '')).filter(Boolean);

  if (candidates.length === 0) return null;

  const text = candidates.join(' | ');
  const lower = text.toLowerCase();

  // Handle ASAP
  if (lower.includes('asap') || lower.includes('as soon')) {
    return created;
  }

  // Helper: extract time (h[:mm] am/pm)
  const timeMatch = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  const toHour24 = (h: number, period?: string) => {
    const p = period?.toLowerCase();
    if (p === 'pm' && h !== 12) return h + 12;
    if (p === 'am' && h === 12) return 0;
    return h;
  };

  const parsedTime = timeMatch
    ? {
        hour24: toHour24(parseInt(timeMatch[1], 10), timeMatch[3]),
        minutes: timeMatch[2] ? parseInt(timeMatch[2], 10) : 0,
      }
    : null;

  // Relative dates
  if (lower.includes('today')) {
    const base = new Date(now);
    if (parsedTime) base.setHours(parsedTime.hour24, parsedTime.minutes, 0, 0);
    return base;
  }
  if (lower.includes('tomorrow')) {
    const base = new Date(now);
    base.setDate(base.getDate() + 1);
    if (parsedTime) base.setHours(parsedTime.hour24, parsedTime.minutes, 0, 0);
    return base;
  }

  // Month Day [Year] (allow ordinals: 20th)
  const monthDayMatch = text.match(
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,\s*(\d{4}))?/i
  );
  if (monthDayMatch) {
    const monthName = monthDayMatch[1].toLowerCase();
    const day = parseInt(monthDayMatch[2], 10);
    const year = monthDayMatch[3] ? parseInt(monthDayMatch[3], 10) : now.getFullYear();
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    const monthIndex = months.indexOf(monthName);
    if (monthIndex !== -1) {
      const d = new Date(year, monthIndex, day, 0, 0, 0, 0);
      if (parsedTime) d.setHours(parsedTime.hour24, parsedTime.minutes, 0, 0);
      return d;
    }
  }

  // If we only have a time (e.g. "3:00 PM"), anchor it to created_at date.
  if (parsedTime) {
    const d = new Date(created);
    d.setHours(parsedTime.hour24, parsedTime.minutes, 0, 0);
    return d;
  }

  // Fallback: try Date() parsing on requested_time specifically
  const primary = order.requested_time || rawPayload?.requested_time;
  if (primary && typeof primary === 'string') {
    const parsed = new Date(primary);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  return created;
}

export default function ReservationsCalendar({ reservations }: ReservationsCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Start from the first day of the week that contains the first day of the month
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    
    // End on the last day of the week that contains the last day of the month
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
    
    const days: CalendarDay[] = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const dayReservations = reservations.filter(res => {
        const resDate = parseReservationTime(res);
        if (!resDate) return false;
        
        return resDate.getFullYear() === current.getFullYear() &&
               resDate.getMonth() === current.getMonth() &&
               resDate.getDate() === current.getDate();
      });
      
      days.push({
        date: new Date(current),
        isCurrentMonth: current.getMonth() === month,
        reservations: dayReservations,
      });
      
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }, [currentDate, reservations]);

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
  
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={goToPreviousMonth}
            className="p-2 rounded-lg hover:bg-[#FFF0C2] transition-colors cursor-pointer"
            style={{ color: '#8B4513' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-2xl font-bold" style={{ color: '#8B4513' }}>
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <button
            onClick={goToNextMonth}
            className="p-2 rounded-lg hover:bg-[#FFF0C2] transition-colors cursor-pointer"
            style={{ color: '#8B4513' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <button
          onClick={goToToday}
          className="px-4 py-2 rounded-lg font-semibold text-sm transition-colors"
          style={{ backgroundColor: '#8B4513', color: '#FFFFFF' }}
        >
          Today
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)' }}>
        {/* Week Day Headers */}
        <div className="grid grid-cols-7 border-b" style={{ borderColor: '#DEB887' }}>
          {weekDays.map(day => (
            <div
              key={day}
              className="p-3 text-center text-sm font-semibold uppercase tracking-wide"
              style={{ color: '#A0522D' }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => {
            const isToday = day.date.toDateString() === new Date().toDateString();
            
            return (
              <div
                key={index}
                className={`min-h-[100px] p-2 border-r border-b ${
                  !day.isCurrentMonth ? 'opacity-40' : ''
                }`}
                style={{ borderColor: '#DEB887' }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-sm font-semibold ${
                      isToday ? 'px-2 py-1 rounded-full' : ''
                    }`}
                    style={{
                      backgroundColor: isToday ? '#FF8C42' : 'transparent',
                      color: isToday ? '#FFFFFF' : (day.isCurrentMonth ? '#8B4513' : '#A0522D'),
                    }}
                  >
                    {day.date.getDate()}
                  </span>
                </div>
                
                {/* Reservations for this day */}
                <div className="space-y-1">
                  {day.reservations.slice(0, 3).map(reservation => {
                    const resTime = parseReservationTime(reservation);
                    const timeStr = resTime ? resTime.toLocaleTimeString('en-US', { 
                      hour: 'numeric', 
                      minute: '2-digit',
                      hour12: true 
                    }) : reservation.requested_time || 'Time TBD';
                    
                    return (
                      <Link
                        key={reservation.id}
                        href={`/orders/${reservation.id}`}
                        className="block p-1.5 rounded text-xs hover:opacity-80 transition-opacity cursor-pointer"
                        style={{
                          backgroundColor: '#FFF8DC',
                          borderLeft: '3px solid #FF8C42',
                          color: '#8B4513',
                        }}
                      >
                        <div className="font-semibold truncate">
                          {getCustomerName(reservation)}
                        </div>
                        <div className="text-xs opacity-75">{timeStr}</div>
                        {reservation.special_instructions && (
                          <div className="text-xs opacity-60 truncate mt-0.5">
                            {reservation.special_instructions}
                          </div>
                        )}
                      </Link>
                    );
                  })}
                  {day.reservations.length > 3 && (
                    <div className="text-xs p-1.5 rounded" style={{ color: '#A0522D', backgroundColor: '#FFF8DC' }}>
                      +{day.reservations.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm" style={{ color: '#A0522D' }}>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#FF8C42' }}></div>
          <span>Today</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border-2" style={{ borderColor: '#FF8C42', backgroundColor: '#FFF8DC' }}></div>
          <span>Reservation</span>
        </div>
      </div>
    </div>
  );
}

