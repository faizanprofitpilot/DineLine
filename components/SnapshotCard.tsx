'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShoppingCart, Clock, CheckCircle, Calendar } from 'lucide-react';

interface SnapshotCardProps {
  totalOrders: number;
  newOrders: number;
  completedOrders: number;
  reservations: number;
  restaurantId: string;
}

type DateFilter = 'today' | 'week' | 'month' | 'custom';

export default function SnapshotCard({
  totalOrders,
  newOrders,
  completedOrders,
  reservations,
  restaurantId,
}: SnapshotCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dateFilter, setDateFilter] = useState<DateFilter>(
    (searchParams.get('dateFilter') as DateFilter) || 'today'
  );
  const [customStartDate, setCustomStartDate] = useState<string>(
    searchParams.get('startDate') || ''
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    searchParams.get('endDate') || ''
  );
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [stats, setStats] = useState({
    totalOrders,
    newOrders,
    completedOrders,
    reservations,
  });
  const [loading, setLoading] = useState(false);
  const customPickerRef = useRef<HTMLDivElement>(null);

  // Close custom picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customPickerRef.current && !customPickerRef.current.contains(event.target as Node)) {
        setShowCustomPicker(false);
      }
    };

    if (showCustomPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCustomPicker]);

  // Calculate date range based on filter
  const getDateRange = (filter: DateFilter, start?: string, end?: string) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (filter) {
      case 'today':
        return {
          start: today.toISOString(),
          end: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        };
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
        return {
          start: weekStart.toISOString(),
          end: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        };
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        return {
          start: monthStart.toISOString(),
          end: monthEnd.toISOString(),
        };
      case 'custom':
        if (start && end) {
          const startDate = new Date(start);
          startDate.setHours(0, 0, 0, 0);
          const endDate = new Date(end);
          endDate.setHours(23, 59, 59, 999);
          return {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
          };
        }
        return null;
      default:
        return null;
    }
  };

  // Track if this is the initial mount
  const isInitialMount = useRef(true);
  const lastFilterRef = useRef<string>(dateFilter);
  const lastStartDateRef = useRef<string>(customStartDate);
  const lastEndDateRef = useRef<string>(customEndDate);

  // Fetch stats when filter changes
  useEffect(() => {
    // Skip on initial mount if URL params match initial state
    if (isInitialMount.current) {
      const urlFilter = searchParams.get('dateFilter');
      if (!urlFilter && dateFilter === 'today') {
        // Initial load with default - use server-side data, no need to fetch
        isInitialMount.current = false;
        return;
      }
      isInitialMount.current = false;
    }

    // Only fetch if filter actually changed
    const filterChanged = lastFilterRef.current !== dateFilter;
    const datesChanged = lastStartDateRef.current !== customStartDate || lastEndDateRef.current !== customEndDate;
    
    if (!filterChanged && !datesChanged) {
      return; // No change, skip fetch
    }

    // Update refs
    lastFilterRef.current = dateFilter;
    lastStartDateRef.current = customStartDate;
    lastEndDateRef.current = customEndDate;

    const dateRange = getDateRange(dateFilter, customStartDate, customEndDate);
    
    if (!dateRange) {
      return;
    }

    setLoading(true);
    
    // Fetch stats
    const fetchStats = async () => {
      try {
        const params = new URLSearchParams({
          dateFilter,
          startDate: dateRange.start,
          endDate: dateRange.end,
        });

        const response = await fetch(`/api/dashboard/stats?restaurantId=${restaurantId}&${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    
    // Update URL params (only if they actually changed)
    const currentUrlFilter = searchParams.get('dateFilter');
    const currentUrlStart = searchParams.get('startDate');
    const currentUrlEnd = searchParams.get('endDate');
    
    const urlNeedsUpdate = 
      currentUrlFilter !== dateFilter ||
      (dateFilter === 'custom' && (currentUrlStart !== customStartDate || currentUrlEnd !== customEndDate)) ||
      (dateFilter !== 'custom' && (currentUrlStart || currentUrlEnd));

    if (urlNeedsUpdate) {
      const params = new URLSearchParams();
      params.set('dateFilter', dateFilter);
      if (dateFilter === 'custom' && customStartDate && customEndDate) {
        params.set('startDate', customStartDate);
        params.set('endDate', customEndDate);
      }
      router.replace(`/dashboard?${params.toString()}`, { scroll: false });
    }
  }, [dateFilter, customStartDate, customEndDate, restaurantId, router]);

  const handleDateFilterChange = (filter: DateFilter) => {
    setDateFilter(filter);
    if (filter === 'custom') {
      setShowCustomPicker(true);
    } else {
      setShowCustomPicker(false);
    }
  };

  const handleCustomDateApply = () => {
    if (customStartDate && customEndDate) {
      setShowCustomPicker(false);
    }
  };

  const getFilterLabel = () => {
    switch (dateFilter) {
      case 'today':
        return 'Today';
      case 'week':
        return 'This Week';
      case 'month':
        return 'This Month';
      case 'custom':
        if (customStartDate && customEndDate) {
          const start = new Date(customStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const end = new Date(customEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          return `${start} - ${end}`;
        }
        return 'Custom';
      default:
        return 'Today';
    }
  };
  const metrics = [
    {
      label: 'Total Orders',
      value: loading ? '...' : stats.totalOrders,
      icon: ShoppingCart,
      color: '#654321',
    },
    {
      label: 'New',
      value: loading ? '...' : stats.newOrders,
      icon: Clock,
      color: '#DC143C',
    },
    {
      label: 'Completed',
      value: loading ? '...' : stats.completedOrders,
      icon: CheckCircle,
      color: '#228B22',
    },
    {
      label: 'Reservations',
      value: loading ? '...' : stats.reservations,
      icon: Calendar,
      color: '#FF8C42',
    },
  ];

  return (
    <div
      className="bg-white rounded-2xl shadow-sm p-6 border"
      style={{
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        borderColor: '#DEB887',
        borderWidth: '1px',
      }}
    >
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold" style={{ color: '#654321' }}>
          Operations Snapshot
        </h2>
        <div className="relative">
          <div className="flex items-center gap-2">
            <select
              value={dateFilter}
              onChange={(e) => handleDateFilterChange(e.target.value as DateFilter)}
              className="text-xs font-medium uppercase tracking-wide px-3 py-1.5 rounded-lg border bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all"
              style={{
                borderColor: '#DEB887',
                color: '#A0522D',
                '--tw-ring-color': '#FF8C42',
              } as React.CSSProperties}
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          
          {showCustomPicker && (
            <div ref={customPickerRef} className="absolute right-0 top-full mt-2 p-4 bg-white rounded-lg border shadow-lg z-50" style={{ borderColor: '#DEB887', minWidth: '280px' }}>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: '#A0522D' }}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-offset-0"
                    style={{
                      borderColor: '#DEB887',
                      color: '#654321',
                      '--tw-ring-color': '#FF8C42',
                    } as React.CSSProperties}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: '#A0522D' }}>
                    End Date
                  </label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-offset-0"
                    style={{
                      borderColor: '#DEB887',
                      color: '#654321',
                      '--tw-ring-color': '#FF8C42',
                    } as React.CSSProperties}
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleCustomDateApply}
                    disabled={!customStartDate || !customEndDate}
                    className="flex-1 h-9 px-4 rounded-lg font-medium text-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: (!customStartDate || !customEndDate) ? '#A0522D' : '#8B4513',
                      color: '#FFFFFF',
                    }}
                  >
                    Apply
                  </button>
                  <button
                    onClick={() => {
                      setShowCustomPicker(false);
                      setDateFilter('today');
                    }}
                    className="h-9 px-4 rounded-lg font-medium text-sm border transition-colors cursor-pointer"
                    style={{
                      borderColor: '#DEB887',
                      color: '#8B4513',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FFF0C2'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.label}
              className="flex items-center gap-3 p-4 rounded-lg border"
              style={{
                borderColor: '#DEB887',
                backgroundColor: '#FFFDF7',
                borderWidth: '1px',
              }}
            >
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: '#FFF0C2' }}
              >
                <Icon className="h-5 w-5" style={{ color: metric.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: '#A0522D', opacity: 0.8 }}>
                  {metric.label}
                </p>
                <p className="text-2xl font-bold" style={{ color: metric.color }}>
                  {metric.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

