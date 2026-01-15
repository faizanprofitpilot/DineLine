'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/lib/clients/supabase';
import { AITone, Restaurant } from '@/types';

interface AIReceptionistSettingsProps {
  restaurant: Restaurant | null;
  onSave?: () => void;
}

const DEFAULT_GREETING = "Thank you for calling {RESTAURANT_NAME}. I'm an automated assistant. I can help you place an order for pickup or delivery, make a reservation, or answer questions about our menu and hours. How can I help you today?";

const TONE_OPTIONS: Array<{ value: AITone; label: string; description: string }> = [
  {
    value: 'professional',
    label: 'Professional',
    description: 'Calm, clear, and businesslike',
  },
  {
    value: 'warm',
    label: 'Warm',
    description: 'Friendly and empathetic',
  },
  {
    value: 'friendly',
    label: 'Friendly',
    description: 'Conversational and approachable',
  },
  {
    value: 'formal',
    label: 'Formal',
    description: 'Reserved and respectful',
  },
];

export default function AIReceptionistSettings({ restaurant, onSave }: AIReceptionistSettingsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [supabase, setSupabase] = useState<ReturnType<typeof createBrowserClient> | null>(null);
  const [customGreeting, setCustomGreeting] = useState('');
  const [tone, setTone] = useState<AITone>('professional');
  const [useCustomGreeting, setUseCustomGreeting] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSupabase(createBrowserClient());
    }
  }, []);

  useEffect(() => {
    if (restaurant) {
      setCustomGreeting(restaurant.ai_greeting_custom || '');
      setTone(restaurant.ai_tone || 'professional');
      setUseCustomGreeting(!!restaurant.ai_greeting_custom);
    }
  }, [restaurant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !restaurant) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const updateData: any = {
        ai_tone: tone,
        ai_greeting_custom: useCustomGreeting && customGreeting.trim() ? customGreeting.trim() : null,
      };

      const { error: updateError } = await supabase
        .from('restaurants')
        // @ts-ignore - Supabase type inference issue with new fields
        .update(updateData)
        .eq('id', restaurant.id);

      if (updateError) throw updateError;

      // Update Vapi assistant if it exists
      if (restaurant.vapi_assistant_id) {
        try {
          const updateResponse = await fetch('/api/vapi/update-assistant', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ restaurantId: restaurant.id }),
          });

          if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            console.warn('Assistant update warning:', errorData);
            // Don't throw - settings are saved, assistant update is best-effort
          } else {
            console.log('Assistant updated successfully');
          }
        } catch (updateError) {
          console.warn('Error updating assistant (non-blocking):', updateError);
          // Don't throw - settings are saved, assistant update is best-effort
        }
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      if (onSave) onSave();
    } catch (err: any) {
      console.error('Error saving AI settings:', err);
      setError(err.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const displayGreeting = useCustomGreeting && customGreeting.trim()
    ? customGreeting.replace(/{RESTAURANT_NAME}/g, restaurant?.name || 'the restaurant')
    : DEFAULT_GREETING.replace(/{RESTAURANT_NAME}/g, restaurant?.name || 'the restaurant');

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4" style={{ color: '#8B4513' }}>
          Greeting Customization
        </h3>
        <p className="text-sm mb-4" style={{ color: '#A0522D' }}>
          Customize how the AI receptionist greets callers. Use {'{RESTAURANT_NAME}'} as a placeholder for your restaurant name.
        </p>

        <div className="mb-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useCustomGreeting}
              onChange={(e) => setUseCustomGreeting(e.target.checked)}
              className="w-4 h-4 rounded border-[#DEB887]"
              style={{ accentColor: '#8B4513' }}
            />
            <span className="text-sm font-medium" style={{ color: '#8B4513' }}>
              Use custom greeting
            </span>
          </label>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2 uppercase tracking-wide" style={{ color: '#A0522D' }}>
            Default Greeting (Preview)
          </label>
          <div
            className="p-3 rounded-lg border text-sm"
            style={{
              backgroundColor: '#FFF8DC',
              borderColor: '#DEB887',
              color: '#A0522D',
            }}
          >
            {DEFAULT_GREETING.replace(/{RESTAURANT_NAME}/g, restaurant?.name || 'the restaurant')}
          </div>
        </div>

        {useCustomGreeting && (
          <div className="mb-4">
            <label htmlFor="customGreeting" className="block text-sm font-semibold mb-2 uppercase tracking-wide" style={{ color: '#A0522D' }}>
              Custom Greeting
            </label>
            <textarea
              id="customGreeting"
              value={customGreeting}
              onChange={(e) => setCustomGreeting(e.target.value)}
              placeholder="Enter your custom greeting. Use {RESTAURANT_NAME} as a placeholder."
              rows={4}
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{
                borderColor: '#DEB887',
                backgroundColor: '#FFFFFF',
                color: '#8B4513',
              }}
            />
            {customGreeting.trim() && (
              <div className="mt-2">
                <p className="text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: '#A0522D' }}>
                  Preview:
                </p>
                <div
                  className="p-3 rounded-lg border text-sm"
                  style={{
                    backgroundColor: '#FFF8DC',
                    borderColor: '#DEB887',
                    color: '#8B4513',
                  }}
                >
                  {displayGreeting}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4" style={{ color: '#8B4513' }}>
          Tone Setting
        </h3>
        <p className="text-sm mb-4" style={{ color: '#A0522D' }}>
          Choose the communication style for your AI receptionist.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TONE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`relative flex items-start p-4 rounded-lg border cursor-pointer transition-colors ${
                tone === option.value
                  ? 'border-[#FF8C42] bg-[#FFF8DC]'
                  : 'border-gray-200 hover:border-[#DEB887]'
              }`}
            >
              <input
                type="radio"
                name="tone"
                value={option.value}
                checked={tone === option.value}
                onChange={(e) => setTone(e.target.value as AITone)}
                className="sr-only"
              />
              <div className="flex-1">
                <div className="flex items-center mb-1">
                  <div
                    className={`w-4 h-4 rounded-full border-2 mr-3 ${
                      tone === option.value
                        ? 'border-[#FF8C42] bg-[#FF8C42]'
                        : 'border-[#DEB887]'
                    }`}
                  >
                    {tone === option.value && (
                      <div className="w-full h-full rounded-full bg-white scale-50" />
                    )}
                  </div>
                  <span className="font-semibold" style={{ color: '#8B4513' }}>
                    {option.label}
                  </span>
                </div>
                <p className="text-sm ml-7" style={{ color: '#A0522D' }}>
                  {option.description}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-3 rounded-lg bg-green-50 border border-green-200">
          <p className="text-sm text-green-700">Settings saved successfully!</p>
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 rounded-lg font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#8B4513', color: '#FFFFFF' }}
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </form>
  );
}

