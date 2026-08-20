import React from 'react';
import { cn } from '../../utils/cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'interactive' | 'accent-border' | 'active';
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  variant = 'default',
  header,
  footer,
  ...props
}) => {
  const variantStyles = {
    default:
      'bg-gradient-to-b from-white/[0.05] to-white/[0.015] backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.37),inset_0_1px_0_0_rgba(255,255,255,0.08)]',
    elevated:
      'bg-gradient-to-b from-white/[0.07] to-white/[0.02] backdrop-blur-2xl border border-white/[0.11] shadow-[0_16px_48px_rgba(0,0,0,0.45),inset_0_1px_0_0_rgba(255,255,255,0.12)]',
    interactive:
      'bg-gradient-to-b from-white/[0.05] to-white/[0.015] backdrop-blur-2xl border border-white/[0.07] hover:border-[#ff8a4a]/40 hover:bg-gradient-to-b hover:from-white/[0.08] hover:to-white/[0.03] transition-all duration-200 cursor-pointer shadow-[0_8px_32px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.07)] hover:shadow-[0_16px_48px_-8px_rgba(255,106,42,0.15),0_8px_24px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.14)] hover:-translate-y-0.5',
    'accent-border':
      'bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-2xl border border-white/[0.08] border-l-2 border-l-[#ff8a4a] shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.08)]',
    active:
      'bg-gradient-to-b from-[#ff6a2a]/15 via-white/[0.04] to-white/[0.015] backdrop-blur-2xl border border-[#ff8a4a]/40 shadow-[0_16px_48px_-10px_rgba(255,106,42,0.25),inset_0_1px_0_0_rgba(255,255,255,0.2)]',
  };

  return (
    <div
      className={cn(
        'rounded-xl p-4 sm:p-5 flex flex-col relative overflow-hidden',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {header && <div className="mb-4 pb-3 border-b border-white/[0.06]">{header}</div>}
      <div className="flex-1 relative z-10">{children}</div>
      {footer && <div className="mt-4 pt-3 border-t border-white/[0.06] relative z-10">{footer}</div>}
    </div>
  );
};
