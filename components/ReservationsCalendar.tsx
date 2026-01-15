'use client';

import { useState, useMemo } from 'react';
import { Order } from '@/types';
import Link from 'next/link';

interface ReservationsCalendarProps {
  reservations: Order[];
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  reservations: Order[];
}

// Parse requested_time to extract date/time
function parseReservationTime(requestedTime: string | null, createdDate: string): Date | null {
  if (!requestedTime) return null;

  const created = new Date(createdDate);
  const now = new Date();
  
  // Try to parse common formats
  const lower = requestedTime.toLowerCase().trim();
  
  // Handle "ASAP" or "as soon as possible"
  if (lower.includes('asap') || lower.includes('as soon')) {
    return created;
  }
  
  // Handle "today at X" or "today X"
  if (lower.includes('today')) {
    const timeMatch = requestedTime.match(/(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?/i);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1]);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const period = timeMatch[3]?.toLowerCase();
      
      let hour24 = hours;
      if (period === 'pm' && hours !== 12) hour24 = hours + 12;
      if (period === 'am' && hours === 12) hour24 = 0;
      
      const date = new Date(now);
      date.setHours(hour24, minutes, 0, 0);
      return date;
    }
    return created;
  }
  
  // Handle "tomorrow at X"
  if (lower.includes('tomorrow')) {
    const timeMatch = requestedTime.match(/(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?/i);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1]);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const period = timeMatch[3]?.toLowerCase();
      
      let hour24 = hours;
      if (period === 'pm' && hours !== 12) hour24 = hours + 12;
      if (period === 'am' && hours === 12) hour24 = 0;
      
      const date = new Date(now);
      date.setDate(date.getDate() + 1);
      date.setHours(hour24, minutes, 0, 0);
      return date;
    }
    const date = new Date(now);
    date.setDate(date.getDate() + 1);
    return date;
  }
  
  // Handle specific dates like "January 15 at 7:30 PM" or "Sunday, January 18 at 7:00 PM"
  // Pattern handles: [Weekday, ]Month Day[, Year][, | at ]Time
  // Examples: "Sunday, January 18 at 7:00 PM" or "January 15 at 7:30 PM" or "Monday, January 15, 2026, 7:00 PM"
  const dateMatch = requestedTime.match(/(?:(\w+),\s+)?(\w+)\s+(\d{1,2})(?:,\s+(\d{4}))?(?:,\s+|\s+at\s+)(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?/i);
  if (dateMatch) {
    const weekday = dateMatch[1]; // Optional weekday (e.g., "Monday")
    const monthName = dateMatch[2]; // Month name
    const day = parseInt(dateMatch[3]);
    const year = dateMatch[4] ? parseInt(dateMatch[4]) : now.getFullYear();
    const hours = dateMatch[5] ? parseInt(dateMatch[5]) : 18;
    const minutes = dateMatch[6] ? parseInt(dateMatch[6]) : 0;
    const period = dateMatch[7]?.toLowerCase();
    
    let hour24 = hours;
    if (period === 'pm' && hours !== 12) hour24 = hours + 12;
    if (period === 'am' && hours === 12) hour24 = 0;
    
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 
                    'july', 'august', 'september', 'october', 'november', 'december'];
    const monthIndex = months.findIndex(m => m.startsWith(monthName.toLowerCase()));
    
    if (monthIndex !== -1) {
      const date = new Date(year, monthIndex, day, hour24, minutes);
      // Validate the date is reasonable (allow past dates up to 1 day, and future dates up to 2 years)
      const minDate = new Date(now);
      minDate.setDate(minDate.getDate() - 1);
      const maxDate = new Date(now);
      maxDate.setFullYear(maxDate.getFullYear() + 2);
      
      if (date >= minDate && date <= maxDate) {
        return date;
      }
      // If date is valid but outside the range, still return it (might be a test reservation)
      // This allows test reservations to show up even if they're further in the future
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }
  
  // Fallback: try to parse as ISO date or use created date
  const parsed = new Date(requestedTime);
  if (!isNaN(parsed.getTime())) {
    return parsed;
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
        const resDate = parseReservationTime(res.requested_time, res.created_at);
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
                    const resTime = parseReservationTime(reservation.requested_time, reservation.created_at);
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
                          {reservation.customer_name || 'Unknown'}
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

