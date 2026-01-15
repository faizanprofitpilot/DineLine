'use client';

import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}: EmptyStateProps) {
  return (
    <div className="text-center py-8">
      <div className="mb-4 flex justify-center">
        {icon}
      </div>
      <h3 className="text-base font-semibold mb-2" style={{ color: '#654321' }}>
        {title}
      </h3>
      <p className="text-sm mb-4" style={{ color: '#A0522D', opacity: 0.7 }}>
        {description}
      </p>
      {(actionLabel && onAction) && (
        <div className="flex items-center justify-center gap-3">
          {onAction && (
            <Button
              onClick={onAction}
              size="sm"
              className="h-9 px-4 rounded-lg font-medium text-sm"
              style={{ backgroundColor: '#8B4513', color: '#FFFFFF' }}
            >
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button
              onClick={onSecondaryAction}
              variant="outline"
              size="sm"
              className="h-9 px-4 rounded-lg font-medium text-sm border"
              style={{ borderColor: '#DEB887', color: '#8B4513' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FFF0C2'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

