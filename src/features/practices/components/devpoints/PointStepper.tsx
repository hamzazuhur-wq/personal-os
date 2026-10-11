import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '../../../../utils/cn';

export interface PointStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}

const QUICK_VALUES = [1, 2, 3, 5];

/**
 * Module 08 Final — the single control for entering Development Point amounts.
 * Positive integers only; manual entry is the primary point flow.
 */
export const PointStepper: React.FC<PointStepperProps> = ({
  value,
  onChange,
  min = 1,
  max = 1000,
  disabled = false,
}) => {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  return (
    <div className={cn('space-y-2', disabled && 'opacity-50 pointer-events-none')}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Decrease points"
          onClick={() => onChange(clamp(value - 1))}
          className="w-10 h-10 shrink-0 rounded-xl border border-white/[0.09] bg-black/35 text-text-secondary hover:text-[#fff4ec] hover:border-white/25 transition-colors cursor-pointer flex items-center justify-center"
        >
          <Minus className="w-4 h-4" />
        </button>

        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={Number.isFinite(value) ? value : ''}
          onChange={(e) => {
            const parsed = parseInt(e.target.value, 10);
            onChange(Number.isNaN(parsed) ? min : clamp(parsed));
          }}
          className="flex-1 min-w-0 h-10 text-center text-lg font-bold font-mono text-[#fff4ec] bg-black/35 border border-white/[0.09] rounded-xl focus:outline-none focus:border-[#ff8a4a]/70 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />

        <button
          type="button"
          aria-label="Increase points"
          onClick={() => onChange(clamp(value + 1))}
          className="w-10 h-10 shrink-0 rounded-xl border border-white/[0.09] bg-black/35 text-text-secondary hover:text-[#fff4ec] hover:border-white/25 transition-colors cursor-pointer flex items-center justify-center"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        {QUICK_VALUES.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={cn(
              'px-3 h-7 rounded-lg text-xs font-mono font-bold border transition-colors cursor-pointer',
              value === v
                ? 'bg-[#ff6a2a]/20 text-[#ffb27a] border-[#ff8a4a]/40'
                : 'bg-white/[0.03] text-text-muted border-white/[0.06] hover:text-text-secondary hover:border-white/15'
            )}
          >
            +{v}
          </button>
        ))}
      </div>
    </div>
  );
};
