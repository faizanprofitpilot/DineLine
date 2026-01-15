'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/lib/clients/supabase';
import { Restaurant } from '@/types';

interface AIFirmKnowledgebaseProps {
  restaurant: Restaurant | null;
  onSave?: () => void;
}

export default function AIFirmKnowledgebase({ restaurant, onSave }: AIFirmKnowledgebaseProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [supabase, setSupabase] = useState<ReturnType<typeof createBrowserClient> | null>(null);
  const [knowledgeBase, setKnowledgeBase] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSupabase(createBrowserClient());
    }
  }, []);

  useEffect(() => {
    if (restaurant) {
      setKnowledgeBase(restaurant.ai_knowledge_base || '');
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

      const updateData = {
        ai_knowledge_base: knowledgeBase.trim() || null,
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
      console.error('Error saving knowledge base:', err);
      setError(err.message || 'Failed to save knowledge base');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2" style={{ color: '#8B4513' }}>
          Restaurant Knowledge Base
        </h3>
        <p className="text-sm mb-4" style={{ color: '#A0522D' }}>
          Add context about your restaurant to help the AI receptionist answer questions more effectively. 
          Include information like cuisine type, popular dishes, dietary options, location, hours, or anything else that would help the AI assist callers.
        </p>

        <div className="mb-4">
          <label htmlFor="knowledgeBase" className="block text-sm font-semibold mb-2 uppercase tracking-wide" style={{ color: '#A0522D' }}>
            Additional Context
          </label>
          <textarea
            id="knowledgeBase"
            value={knowledgeBase}
            onChange={(e) => setKnowledgeBase(e.target.value)}
            placeholder="Example: We're an Italian restaurant specializing in wood-fired pizzas and homemade pasta. We offer vegetarian, vegan, and gluten-free options. Located in downtown, open Tuesday-Sunday 5pm-10pm. Popular dishes include our Margherita pizza, Carbonara pasta, and Tiramisu..."
            rows={10}
            className="w-full px-3 py-2 rounded-lg border text-sm font-mono"
            style={{
              borderColor: '#DEB887',
              backgroundColor: '#FFFFFF',
              color: '#8B4513',
            }}
          />
          <p className="text-xs mt-2" style={{ color: '#A0522D', opacity: 0.7 }}>
            This information will be provided to the AI to help it better understand your restaurant and answer questions.
          </p>
        </div>

        <div className="p-4 rounded-lg border" style={{ backgroundColor: '#FFF8DC', borderColor: '#DEB887' }}>
          <p className="text-sm font-semibold mb-2" style={{ color: '#8B4513' }}>
            💡 Tips for effective knowledge base entries:
          </p>
          <ul className="text-sm space-y-1 list-disc list-inside" style={{ color: '#A0522D' }}>
            <li>List your cuisine type and popular dishes</li>
            <li>Include dietary options (vegetarian, vegan, gluten-free, etc.)</li>
            <li>Mention location, parking, and special features</li>
            <li>Note common questions about menu, hours, or reservations</li>
            <li>Keep it concise and factual</li>
          </ul>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-3 rounded-lg bg-green-50 border border-green-200">
          <p className="text-sm text-green-700">Knowledge base saved successfully!</p>
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 rounded-lg font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#8B4513', color: '#FFFFFF' }}
        >
          {loading ? 'Saving...' : 'Save Knowledge Base'}
        </button>
      </div>
    </form>
  );
}

