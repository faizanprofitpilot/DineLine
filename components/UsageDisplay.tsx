'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/clients/supabase';
import { getPlanLimit, getPlanDetails } from '@/lib/constants/plans';
import type { PlanName } from '@/lib/constants/plans';
import Link from 'next/link';

interface UsageDisplayProps {
  firmId: string;
  subscriptionPlan: PlanName | null;
  subscriptionStatus: string | null;
  subscriptionCurrentPeriodEnd: string | null;
}

export default function UsageDisplay({
  firmId,
  subscriptionPlan,
  subscriptionStatus,
  subscriptionCurrentPeriodEnd,
}: UsageDisplayProps) {
  const [usage, setUsage] = useState<{
    used: number;
    limit: number;
    remaining: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  useEffect(() => {
    const fetchUsage = async () => {
      if (!firmId || !subscriptionPlan) {
        setLoading(false);
        return;
      }

      try {
        const supabase = createBrowserClient();
        // @ts-ignore - Custom RPC function not in generated types
        const { data, error } = await supabase.rpc('get_current_period_usage_minutes', {
          p_restaurant_id: firmId, // firmId is actually restaurant_id now
        });

        if (error) {
          console.error('[Usage Display] Error fetching usage:', error);
          setLoading(false);
          return;
        }

        const used = Number(data) || 0;
        const limit = getPlanLimit(subscriptionPlan);
        const remaining = Math.max(0, limit - used);

        setUsage({ used, limit, remaining });
      } catch (error) {
        console.error('[Usage Display] Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsage();
  }, [firmId, subscriptionPlan]);

  useEffect(() => {
    if (subscriptionStatus === 'trialing' && subscriptionCurrentPeriodEnd) {
      const endDate = new Date(subscriptionCurrentPeriodEnd);
      const now = new Date();
      const diffTime = endDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setDaysRemaining(Math.max(0, diffDays));
    } else {
      setDaysRemaining(null);
    }
  }, [subscriptionStatus, subscriptionCurrentPeriodEnd]);

  if (!subscriptionPlan || !usage) {
    return null;
  }

  const usagePercentage = (usage.used / usage.limit) * 100;
  const isTrial = subscriptionStatus === 'trialing';
  const isTrialEnded = isTrial && daysRemaining !== null && daysRemaining === 0;
  const isOverLimit = usage.used >= usage.limit;

  return (
    <div className="space-y-4">
      {/* Trial Ended Banner */}
      {isTrialEnded && (
        <div className="bg-gradient-to-r from-[#FF8C42] to-[#FFA366] rounded-xl p-6 shadow-lg border-2 border-[#FF8C42]">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-2" style={{ color: '#8B4513' }}>
                Your Free Trial Has Ended
              </h3>
              <p className="text-sm mb-4" style={{ color: '#8B4513', opacity: 0.9 }}>
                Continue using DineLine by upgrading to a paid plan. Choose the plan that best fits your restaurant's needs.
              </p>
              <Link
                href="/billing"
                className="inline-block px-6 py-2 rounded-lg font-semibold text-sm transition-all duration-300 hover:scale-105 shadow-md"
                style={{ backgroundColor: '#8B4513', color: '#FFFFFF' }}
              >
                Upgrade Now
              </Link>
            </div>
            <svg
              className="w-8 h-8 flex-shrink-0"
              style={{ color: '#8B4513' }}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      )}

      {/* Usage Card */}
      <div className="bg-white rounded-xl shadow-sm p-6" style={{ boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold mb-1" style={{ color: '#A0522D' }}>
              Usage This Period
            </h3>
            {isTrial && daysRemaining !== null && daysRemaining > 0 && (
              <p className="text-sm" style={{ color: '#A0522D', opacity: 0.7 }}>
                {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining in free trial
              </p>
            )}
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold" style={{ color: isOverLimit ? '#EF4444' : '#8B4513' }}>
              {usage.used.toFixed(1)}
            </div>
            <div className="text-sm" style={{ color: '#A0522D', opacity: 0.7 }}>
              of {usage.limit} minutes
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="w-full rounded-full h-3 overflow-hidden" style={{ backgroundColor: '#DEB887', opacity: 0.3 }}>
            <div
              className="h-3 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(usagePercentage, 100)}%`,
                backgroundColor: isOverLimit
                  ? '#EF4444'
                  : usagePercentage >= 90
                  ? '#F59E0B'
                  : '#10B981',
              }}
            />
          </div>
        </div>

        {/* Usage Details */}
        <div className="flex items-center justify-between text-sm">
          <div style={{ color: '#A0522D', opacity: 0.7 }}>
            {usage.remaining > 0 ? (
              <span>{usage.remaining.toFixed(1)} minutes remaining</span>
            ) : (
              <span className="text-red-600 font-semibold">Limit reached</span>
            )}
          </div>
          <div style={{ color: '#A0522D', opacity: 0.7 }}>
            {getPlanDetails(subscriptionPlan).name} Plan
          </div>
        </div>

        {/* Over Limit Warning */}
        {isOverLimit && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">
              You've reached your plan limit. <Link href="/billing" className="font-semibold underline">Upgrade your plan</Link> to continue receiving calls.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

