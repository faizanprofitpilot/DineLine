'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface OrdersFiltersProps {
  searchParams: { status?: string; type?: string; intent?: string; dateRange?: string };
}

export default function OrdersFilters({ searchParams }: OrdersFiltersProps) {
  const router = useRouter();
  const currentParams = useSearchParams();

  const handleFilter = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newParams = new URLSearchParams();
    
    // Preserve dateRange if it exists
    const dateRange = currentParams.get('dateRange');
    if (dateRange) {
      newParams.set('dateRange', dateRange);
    }
    
    // Add filter params
    if (formData.get('status')) newParams.set('status', formData.get('status') as string);
    if (formData.get('type')) newParams.set('type', formData.get('type') as string);
    if (formData.get('intent')) newParams.set('intent', formData.get('intent') as string);
    
    router.push(`/orders?${newParams.toString()}`);
  };

  const clearFilters = () => {
    const newParams = new URLSearchParams();
    const dateRange = currentParams.get('dateRange');
    if (dateRange) {
      newParams.set('dateRange', dateRange);
    }
    router.push(`/orders?${newParams.toString()}`);
  };

  const hasActiveFilters = !!(searchParams.status || searchParams.type || searchParams.intent);

  return (
    <div className="p-6 border-b bg-white rounded-t-2xl" style={{ borderColor: '#DEB887' }}>
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
              color: '#654321',
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
              color: '#654321',
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
              color: '#654321',
            }}
            defaultValue={searchParams.intent || ''}
          >
            <option value="">All</option>
            <option value="order">Order</option>
            <option value="reservation">Reservation</option>
            <option value="info">Info</option>
          </select>
        </div>
        <div className="flex gap-2">
          <Button 
            type="submit"
            className="h-10 px-4 rounded-lg font-semibold text-sm"
            style={{ backgroundColor: '#8B4513', color: '#FFFFFF' }}
          >
            Apply Filters
          </Button>
          {hasActiveFilters && (
            <Button 
              type="button"
              onClick={clearFilters}
              className="h-10 px-4 rounded-lg font-semibold text-sm border"
              style={{ 
                borderColor: '#DEB887',
                backgroundColor: '#FFFFFF',
                color: '#654321'
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
