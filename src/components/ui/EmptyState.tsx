import React from 'react';
import { Button } from './Button';
import { LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-2xl border border-dashed border-white/[0.09] bg-gradient-to-b from-white/[0.02] to-transparent backdrop-blur-xl my-3">
      {Icon && (
        <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-text-muted mb-3.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
          <Icon className="w-6 h-6 text-[#ff8a4a]" />
        </div>
      )}
      <h4 className="text-sm font-semibold text-text-primary mb-1">{title}</h4>
      <p className="text-xs text-text-muted max-w-sm mb-4 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
