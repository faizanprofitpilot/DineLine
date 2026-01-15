'use client';

import { useState, useEffect } from 'react';
import { Restaurant } from '@/types';
import { createBrowserClient } from '@/lib/clients/supabase';
import PhoneNumberDisplay from './PhoneNumberDisplay';

interface SettingsFormProps {
  firm: Restaurant | null; // Keep 'firm' prop name for backward compatibility with PhoneNumberDisplay
  onSave: () => void;
}

const TIMEZONES = [
  { value: 'America/New_York', label: 'EST/EDT (Eastern)' },
  { value: 'America/Chicago', label: 'CST/CDT (Central)' },
  { value: 'America/Denver', label: 'MST/MDT (Mountain)' },
  { value: 'America/Los_Angeles', label: 'PST/PDT (Pacific)' },
  { value: 'America/Phoenix', label: 'MST (Arizona)' },
  { value: 'America/Anchorage', label: 'AKST/AKDT (Alaska)' },
  { value: 'Pacific/Honolulu', label: 'HST (Hawaii)' },
  { value: 'Europe/London', label: 'GMT/BST (London)' },
  { value: 'Europe/Paris', label: 'CET/CEST (Central European)' },
  { value: 'Europe/Berlin', label: 'CET/CEST (Berlin)' },
  { value: 'Europe/Madrid', label: 'CET/CEST (Madrid)' },
  { value: 'Europe/Rome', label: 'CET/CEST (Rome)' },
  { value: 'Asia/Dubai', label: 'GST (Dubai)' },
  { value: 'Asia/Tokyo', label: 'JST (Tokyo)' },
  { value: 'Asia/Shanghai', label: 'CST (Shanghai)' },
  { value: 'Asia/Hong_Kong', label: 'HKT (Hong Kong)' },
  { value: 'Australia/Sydney', label: 'AEST/AEDT (Sydney)' },
  { value: 'Australia/Melbourne', label: 'AEST/AEDT (Melbourne)' },
  { value: 'America/Toronto', label: 'EST/EDT (Toronto)' },
  { value: 'America/Vancouver', label: 'PST/PDT (Vancouver)' },
  { value: 'America/Mexico_City', label: 'CST/CDT (Mexico City)' },
  { value: 'America/Sao_Paulo', label: 'BRT/BRST (São Paulo)' },
];


export default function SettingsForm({ firm, onSave }: SettingsFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [supabase, setSupabase] = useState<ReturnType<typeof createBrowserClient> | null>(null);
  const [manualTwilioNumber, setManualTwilioNumber] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSupabase(createBrowserClient());
    }
  }, []);

  const [formData, setFormData] = useState({
    name: firm?.name || '',
    kitchen_emails: (firm as any)?.kitchen_emails?.join(', ') || '',
    timezone: firm?.timezone || 'America/New_York',
    hours_open: (firm as any)?.hours_open || '09:00',
    hours_close: (firm as any)?.hours_close || '17:00',
    after_hours_take_orders: (firm as any)?.after_hours_take_orders ?? true,
    reservations_enabled: (firm as any)?.reservations_enabled ?? false,
  });

  useEffect(() => {
    if (firm) {
      setFormData({
        name: firm.name,
        kitchen_emails: (firm as any).kitchen_emails?.join(', ') || '',
        timezone: firm.timezone,
        hours_open: (firm as any).hours_open || '09:00',
        hours_close: (firm as any).hours_close || '17:00',
        after_hours_take_orders: (firm as any).after_hours_take_orders ?? true,
        reservations_enabled: (firm as any).reservations_enabled ?? false,
      });
    }
  }, [firm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const kitchenEmailsArray = formData.kitchen_emails
        .split(',')
        .map((e: string) => e.trim())
        .filter((e: string) => e.length > 0);

      if (kitchenEmailsArray.length === 0) {
        throw new Error('At least one kitchen email is required');
      }

      const restaurantData = {
        name: formData.name,
        kitchen_emails: kitchenEmailsArray,
        timezone: formData.timezone,
        hours_open: formData.hours_open,
        hours_close: formData.hours_close,
        after_hours_take_orders: formData.after_hours_take_orders,
        reservations_enabled: formData.reservations_enabled,
      };

      let restaurantId: string;

      if (firm) {
        // Update existing restaurant
        restaurantId = firm.id;
        const { error: updateError } = await supabase
          .from('restaurants')
          // @ts-ignore - Supabase type inference issue
          .update(restaurantData)
          // @ts-ignore - Supabase type inference issue
          .eq('id', firm.id);

        if (updateError) throw updateError;
      } else {
        // Create new restaurant
        // @ts-ignore - Supabase type inference issue
        const { data: newRestaurantData, error: insertError } = await supabase.from('restaurants').insert({
          ...restaurantData,
          owner_user_id: user.id,
        }).select().single();

        if (insertError) throw insertError;
        if (!newRestaurantData) throw new Error('Failed to create restaurant');
        
        const newRestaurant = newRestaurantData as any;
        restaurantId = newRestaurant.id;
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onSave();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="w-full max-w-[900px] mx-auto">
      {/* Success Toast */}
      {success && (
        <div 
          className="mb-6 border rounded-xl px-4 py-3 flex items-center justify-between"
          style={{ 
            backgroundColor: '#FFF8DC',
            borderColor: '#8B4513',
            color: '#8B4513'
          }}
        >
          <span className="text-sm font-medium">Settings saved successfully</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <span className="text-sm">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-0">
        {/* Phone Number Display Section - Only show if number exists */}
        {firm && (firm.inbound_number_e164 || firm.vapi_phone_number_id || firm.twilio_phone_number_sid) && (
          <section className="pb-8 border-b border-[#DEB887]">
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-1" style={{ color: '#A0522D' }}>
                Phone Number
              </h2>
              <p className="text-sm" style={{ color: '#A0522D', opacity: 0.7 }}>
                Your generated phone number for receiving calls.
              </p>
            </div>

            <div className="space-y-5">
              {/* Display current number - matches dashboard display */}
              <PhoneNumberDisplay
                phoneNumber={
                  firm.inbound_number_e164 || null
                }
                formattedNumber={
                  firm.inbound_number_e164 
                    ? firm.inbound_number_e164.replace(/^\+?(\d{1})(\d{3})(\d{3})(\d{4})$/, '+$1 ($2) $3-$4')
                    : firm.vapi_phone_number_id
                      ? 'Number being assigned...'
                      : 'No number assigned'
                }
                isPending={!!firm.vapi_phone_number_id && !firm.inbound_number_e164}
              />
              {firm.vapi_phone_number_id && !firm.inbound_number_e164 && (
                <p className="text-sm" style={{ color: '#A0522D', opacity: 0.7 }}>
                  The number is being assigned. It will appear here automatically once ready.
                  {' '}
                  <a 
                    href={`https://dashboard.vapi.ai/phone-numbers/${firm.vapi_phone_number_id}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:underline"
                    style={{ color: '#8B4513' }}
                  >
                    View in Vapi Dashboard
                  </a>
                </p>
              )}
              {firm.inbound_number_e164 && firm.telephony_provider && (
                <p className="text-xs" style={{ color: '#A0522D', opacity: 0.7 }}>
                  Provider: {firm.telephony_provider === 'twilio_imported_into_vapi' ? 'Twilio + Vapi' : firm.telephony_provider}
                </p>
              )}


            </div>
          </section>
        )}

        {/* Restaurant Information Section */}
        <section className="pb-8 border-b border-[#DEB887] last:border-b-0">
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-1" style={{ color: '#A0522D' }}>
              Restaurant Information
            </h2>
            <p className="text-sm" style={{ color: '#A0522D', opacity: 0.7 }}>
              Basic details about your restaurant
            </p>
          </div>

          <div className="space-y-5">
      <div>
              <label 
                htmlFor="name" 
                className="block text-xs font-semibold uppercase tracking-wide mb-2"
                style={{ color: '#A0522D' }}
              >
          Restaurant Name
        </label>
        <input
          type="text"
          id="name"
          required
                className="w-full h-12 px-4 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-offset-0"
                style={{
                  borderColor: '#DEB887',
                  backgroundColor: '#FFFFFF',
                  fontSize: '14px',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#8B4513';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139, 69, 19, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#E5E7EB';
                  e.currentTarget.style.boxShadow = 'none';
                }}
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>

      <div>
              <label 
                htmlFor="kitchen_emails" 
                className="block text-xs font-semibold uppercase tracking-wide mb-2"
                style={{ color: '#A0522D' }}
              >
                Kitchen Notification Emails
        </label>
        <input
          type="text"
          id="kitchen_emails"
          required
                placeholder="kitchen@restaurant.com, manager@restaurant.com"
                className="w-full h-12 px-4 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-offset-0"
                style={{
                  borderColor: '#DEB887',
                  backgroundColor: '#FFFFFF',
                  fontSize: '14px',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#8B4513';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139, 69, 19, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#E5E7EB';
                  e.currentTarget.style.boxShadow = 'none';
                }}
          value={formData.kitchen_emails}
          onChange={(e) => setFormData({ ...formData, kitchen_emails: e.target.value })}
        />
              <p className="mt-1.5 text-xs" style={{ color: '#A0522D', opacity: 0.7 }}>
                Comma-separated list of email addresses where kitchen tickets will be sent
              </p>
      </div>

      <div>
              <label 
                htmlFor="timezone" 
                className="block text-xs font-semibold uppercase tracking-wide mb-2"
                style={{ color: '#A0522D' }}
              >
          Timezone
        </label>
        <select
          id="timezone"
                className="w-full h-12 px-4 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-offset-0"
                style={{
                  borderColor: '#DEB887',
                  backgroundColor: '#FFFFFF',
                  fontSize: '14px',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#8B4513';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139, 69, 19, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#E5E7EB';
                  e.currentTarget.style.boxShadow = 'none';
                }}
          value={formData.timezone}
          onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
        >
          {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
            </option>
          ))}
        </select>
      </div>

      <div>
              <label 
                htmlFor="hours_open" 
                className="block text-xs font-semibold uppercase tracking-wide mb-2"
                style={{ color: '#A0522D' }}
              >
          Opening Time
        </label>
        <input
          type="time"
          id="hours_open"
          required
                className="w-full h-12 px-4 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-offset-0"
                style={{
                  borderColor: '#DEB887',
                  backgroundColor: '#FFFFFF',
                  fontSize: '14px',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#8B4513';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139, 69, 19, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#E5E7EB';
                  e.currentTarget.style.boxShadow = 'none';
                }}
          value={formData.hours_open}
          onChange={(e) => setFormData({ ...formData, hours_open: e.target.value })}
        />
      </div>

      <div>
              <label 
                htmlFor="hours_close" 
                className="block text-xs font-semibold uppercase tracking-wide mb-2"
                style={{ color: '#A0522D' }}
              >
          Closing Time
        </label>
        <input
          type="time"
          id="hours_close"
          required
                className="w-full h-12 px-4 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-offset-0"
                style={{
                  borderColor: '#DEB887',
                  backgroundColor: '#FFFFFF',
                  fontSize: '14px',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#8B4513';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139, 69, 19, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#E5E7EB';
                  e.currentTarget.style.boxShadow = 'none';
                }}
          value={formData.hours_close}
          onChange={(e) => setFormData({ ...formData, hours_close: e.target.value })}
        />
      </div>

      <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.after_hours_take_orders}
                  onChange={(e) => setFormData({ ...formData, after_hours_take_orders: e.target.checked })}
                  className="w-4 h-4 rounded border-[#DEB887]"
                />
                <span className="text-sm" style={{ color: '#8B4513' }}>
                  Accept orders after hours (for next day)
                </span>
              </label>
              <p className="mt-1.5 text-xs ml-6" style={{ color: '#A0522D', opacity: 0.7 }}>
                If enabled, the AI will still take orders when the restaurant is closed
              </p>
      </div>

      <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.reservations_enabled}
                  onChange={(e) => setFormData({ ...formData, reservations_enabled: e.target.checked })}
                  className="w-4 h-4 rounded border-[#DEB887]"
                />
                <span className="text-sm" style={{ color: '#8B4513' }}>
                  Enable reservations
                </span>
              </label>
              <p className="mt-1.5 text-xs ml-6" style={{ color: '#A0522D', opacity: 0.7 }}>
                Allow customers to make reservations via phone
              </p>
      </div>
          </div>
        </section>


        {/* Save Button */}
        <div className="pt-6 border-t border-[#DEB887] sticky bottom-0 bg-white -mx-6 -mb-6 px-6 pb-6 rounded-b-lg">
        <button
          type="submit"
          disabled={loading}
            className="w-full h-12 rounded-lg font-semibold text-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: loading ? '#A0522D' : '#8B4513',
              color: '#FFFFFF',
            }}
            onMouseEnter={(e) => {
              if (!loading && !e.currentTarget.disabled) {
                e.currentTarget.style.backgroundColor = '#8B4513';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading && !e.currentTarget.disabled) {
                e.currentTarget.style.backgroundColor = '#8B4513';
              }
            }}
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </form>
    </div>
  );
}

