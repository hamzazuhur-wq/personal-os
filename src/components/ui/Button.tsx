import React from 'react';
import { cn } from '../../utils/cn';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'secondary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-200 select-none rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#ff8a4a] disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98] cursor-pointer relative overflow-hidden';

    const sizeStyles = {
      sm: 'text-xs px-3 py-1.5 min-h-[36px] gap-1.5 tracking-wide',
      md: 'text-sm px-4 py-2 min-h-[42px] gap-2 tracking-wide font-medium',
      lg: 'text-base px-6 py-2.5 min-h-[48px] gap-2.5 font-semibold tracking-wide',
    };

    const variantStyles = {
      primary:
        'bg-gradient-to-r from-[#ff6a2a] via-[#ff8a4a] to-[#ff6a2a] text-[#090b0e] hover:brightness-110 font-bold shadow-[0_4px_24px_-4px_rgba(255,106,42,0.45),inset_0_1px_0_0_rgba(255,255,255,0.4)] border border-[#ff8a4a]/80 hover:-translate-y-0.5',
      accent:
        'bg-[#ff6a2a]/15 text-[#fff4ec] hover:bg-[#ff6a2a]/25 border border-[#ff8a4a]/40 shadow-[0_4px_18px_-4px_rgba(255,106,42,0.25)] hover:-translate-y-0.5',
      secondary:
        'bg-white/[0.04] text-text-primary hover:bg-white/[0.08] hover:text-[#fff4ec] border border-white/[0.09] hover:border-white/20 backdrop-blur-xl shadow-[0_4px_16px_rgba(0,0,0,0.2),inset_0_1px_0_0_rgba(255,255,255,0.05)] hover:-translate-y-0.5',
      ghost:
        'bg-transparent text-text-secondary hover:text-text-primary hover:bg-white/[0.04] border border-transparent hover:border-white/[0.05]',
      danger:
        'bg-red-500/10 text-red-300 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 shadow-[0_4px_16px_rgba(239,68,68,0.15)]',
    };

    return (
      <button
        ref={ref}
        type={type}
        className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-current" />
        ) : (
          leftIcon
        )}
        <span>{children}</span>
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
