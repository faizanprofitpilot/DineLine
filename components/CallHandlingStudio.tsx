'use client';

import { useState, useEffect } from 'react';
import { Restaurant } from '@/types';
import { CheckCircle2, Circle, Clock, Phone, MessageSquare } from 'lucide-react';
import AIReceptionistSettings from './AIReceptionistSettings';

interface CallHandlingStudioProps {
  restaurant: Restaurant | null;
  onSave: () => void;
}

export default function CallHandlingStudio({ restaurant, onSave }: CallHandlingStudioProps) {
  const [selectedFlow, setSelectedFlow] = useState<'order' | 'reservation' | 'faq'>('order');

  const callFlows = [
    {
      id: 'order' as const,
      title: 'Order Flow',
      steps: [
        { title: 'Greet Customer', description: 'Welcome caller and identify intent' },
        { title: 'Collect Details', description: 'Name, phone, order type, items, time, address' },
        { title: 'Confirm Order', description: 'Repeat order back to customer' },
        { title: 'Send Kitchen Ticket', description: 'Email sent automatically to kitchen' },
      ],
      icon: Phone,
    },
    {
      id: 'reservation' as const,
      title: 'Reservation Flow',
      steps: [
        { title: 'Greet Customer', description: 'Welcome caller and identify intent' },
        { title: 'Collect Details', description: 'Name, phone, party size, date, time' },
        { title: 'Confirm Reservation', description: 'Repeat details back to customer' },
        { title: 'Notify Staff', description: 'Reservation added to calendar' },
      ],
      icon: MessageSquare,
    },
    {
      id: 'faq' as const,
      title: 'FAQ Flow',
      steps: [
        { title: 'Greet Customer', description: 'Welcome caller' },
        { title: 'Identify Question', description: 'Listen for common questions' },
        { title: 'Answer', description: 'Provide information from knowledge base' },
        { title: 'Follow Up', description: 'Check if more help needed' },
      ],
      icon: MessageSquare,
    },
  ];

  const selectedFlowData = callFlows.find(f => f.id === selectedFlow)!;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Call Flow Steps */}
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-sm p-6" style={{ border: '1px solid #DEB887' }}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: '#654321' }}>
            Call Flows
          </h2>
          <div className="space-y-2 mb-6">
            {callFlows.map((flow) => {
              const Icon = flow.icon;
              return (
                <button
                  key={flow.id}
                  onClick={() => setSelectedFlow(flow.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors cursor-pointer ${
                    selectedFlow === flow.id ? 'border-2' : 'border'
                  }`}
                  style={{
                    borderColor: selectedFlow === flow.id ? '#FF8C42' : '#DEB887',
                    backgroundColor: selectedFlow === flow.id ? '#FFF8DC' : '#FFFFFF',
                  }}
                >
                  <Icon className="h-5 w-5" style={{ color: '#8B4513' }} />
                  <span className="font-medium" style={{ color: '#654321' }}>
                    {flow.title}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="space-y-4">
            <h3 className="text-base font-semibold" style={{ color: '#654321' }}>
              {selectedFlowData.title} Steps
            </h3>
            {selectedFlowData.steps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {idx === selectedFlowData.steps.length - 1 ? (
                    <CheckCircle2 className="h-5 w-5" style={{ color: '#228B22' }} />
                  ) : (
                    <Circle className="h-5 w-5" style={{ color: '#DEB887' }} />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1" style={{ color: '#654321' }}>
                    {idx + 1}. {step.title}
                  </p>
                  <p className="text-xs" style={{ color: '#A0522D', opacity: 0.8 }}>
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Settings Panel */}
      <div>
        <div className="bg-white rounded-2xl shadow-sm p-6" style={{ border: '1px solid #DEB887' }}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: '#654321' }}>
            Receptionist Settings
          </h2>
          <AIReceptionistSettings restaurant={restaurant} onSave={onSave} />
        </div>
      </div>
    </div>
  );
}

