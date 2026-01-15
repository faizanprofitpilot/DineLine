'use client';

import { useState, useEffect } from 'react';
import { Restaurant } from '@/types';
import { createBrowserClient } from '@/lib/clients/supabase';
import PhoneNumberDisplay from './PhoneNumberDisplay';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CompactPhoneRoutingProps {
  restaurant: Restaurant | null;
  onProvisioned?: () => void;
}

export default function CompactPhoneRouting({ restaurant, onProvisioned }: CompactPhoneRoutingProps) {
  const [areaCode, setAreaCode] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [supabase, setSupabase] = useState<ReturnType<typeof createBrowserClient> | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSupabase(createBrowserClient());
    }
  }, []);

  if (!restaurant) {
    return null;
  }

  // If number exists, show compact display
  if (restaurant.inbound_number_e164 || restaurant.vapi_phone_number_id || restaurant.twilio_phone_number_sid) {
    const formattedNumber = restaurant?.inbound_number_e164 && typeof restaurant.inbound_number_e164 === 'string'
      ? restaurant.inbound_number_e164.replace(/^\+?(\d{1})(\d{3})(\d{3})(\d{4})$/, '+$1 ($2) $3-$4')
      : restaurant?.vapi_phone_number_id
        ? 'Number being assigned...'
        : 'No number assigned';

    const handleCopy = async () => {
      if (restaurant.inbound_number_e164) {
        await navigator.clipboard.writeText(restaurant.inbound_number_e164);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
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
        <h3 className="text-base font-semibold mb-3" style={{ color: '#654321' }}>
          Phone number
        </h3>
        <div className="flex items-center gap-2">
          <div
            className="flex-1 px-3 py-2 rounded-lg border flex items-center justify-between"
            style={{
              borderColor: '#DEB887',
              backgroundColor: '#FFF8DC',
            }}
          >
            <span className="text-sm font-medium" style={{ color: '#654321' }}>
              {formattedNumber}
            </span>
            {restaurant.inbound_number_e164 && (
              <button
                onClick={handleCopy}
                className="p-1.5 rounded hover:bg-[#FFF0C2] transition-colors cursor-pointer"
                style={{ color: '#8B4513' }}
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
        </div>
        {restaurant?.vapi_phone_number_id && !restaurant.inbound_number_e164 && (
          <p className="text-xs mt-2" style={{ color: '#A0522D', opacity: 0.7 }}>
            Number is being assigned...
          </p>
        )}
      </div>
    );
  }

  // If no number exists, show compact generation UI
  const handleGenerate = async () => {
    if (!supabase || !restaurant) return;
    
    setGenerating(true);
    setError(null);
    setSuccess(false);
    
    try {
      const response = await fetch('/api/telephony/provision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          firmId: restaurant.id,
          areaCode: areaCode || undefined,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        let errorMsg = 'Failed to generate number';
        if (data.message) {
          errorMsg = Array.isArray(data.message) ? data.message.join(', ') : data.message;
        } else if (data.error) {
          errorMsg = data.error;
        }
        throw new Error(errorMsg);
      }

      setSuccess(true);
      setAreaCode('');
      setTimeout(() => {
        setSuccess(false);
        if (typeof window !== 'undefined') {
          window.location.reload();
        } else if (onProvisioned) {
          onProvisioned();
        }
      }, 2000);
    } catch (err: any) {
      console.error('Error generating number:', err);
      setError(err.message || 'Failed to generate number');
    } finally {
      setGenerating(false);
    }
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
      <h3 className="text-base font-semibold mb-2" style={{ color: '#654321' }}>
        Phone number
      </h3>
      <p className="text-xs mb-4" style={{ color: '#A0522D', opacity: 0.7 }}>
        Generate a phone number for your restaurant
      </p>

      {error && (
        <div className="mb-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">
          {error}
        </div>
      )}

      {success && (
        <div 
          className="mb-3 border rounded-lg px-3 py-2 text-xs font-medium"
          style={{ 
            backgroundColor: '#FFF8DC',
            borderColor: '#8B4513',
            color: '#8B4513'
          }}
        >
          Phone number generated successfully!
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <input
            type="text"
            value={areaCode}
            onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
            placeholder="Area code (optional)"
            className="w-full h-9 px-3 rounded-lg border text-sm"
            style={{
              borderColor: '#DEB887',
              backgroundColor: '#FFFFFF',
              color: '#8B4513',
            }}
            disabled={generating}
          />
        </div>
        <Button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="h-9 px-4 rounded-lg font-medium text-sm whitespace-nowrap cursor-pointer disabled:cursor-not-allowed"
          style={{ backgroundColor: '#8B4513', color: '#FFFFFF' }}
        >
          {generating ? 'Generating...' : 'Generate'}
        </Button>
      </div>
    </div>
  );
}

