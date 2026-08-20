import React from 'react';
import { cn } from '../../utils/cn';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, id, rows = 3, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-[11px] font-mono font-semibold uppercase tracking-[0.15em] text-text-muted">
            {label}
          </label>
        )}
        <textarea
          id={inputId}
          ref={ref}
          rows={rows}
          className={cn(
            'w-full bg-black/45 backdrop-blur-xl border border-white/[0.09] text-text-primary text-sm rounded-lg p-3 placeholder:text-text-muted/60 focus:border-[#ff8a4a]/70 focus:bg-black/60 focus:shadow-[0_0_20px_-3px_rgba(255,106,42,0.25),inset_0_1px_3px_rgba(0,0,0,0.5)] transition-all outline-none resize-y min-h-[80px]',
            error && 'border-red-500/50 focus:border-red-500',
            className
          )}
          {...props}
        />
        {error && <span className="text-xs text-red-400 font-medium">{error}</span>}
        {!error && helperText && <span className="text-xs text-text-muted">{helperText}</span>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
