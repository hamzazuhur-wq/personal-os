import React from 'react';

export interface KpiItem {
  label: string;
  value: number | string;
  hint?: string;
}

/**
 * Compact period KPI strip (§5) — restrained grouped metrics, not giant
 * cards. Values are prepared by the analytics service and rendered as-is.
 */
export const KpiStrip: React.FC<{ items: KpiItem[]; className?: string }> = ({ items, className }) => (
  <div
    className={
      'grid grid-cols-3 md:grid-cols-6 gap-px rounded-xl overflow-hidden bg-white/[0.06] border border-white/[0.08]' +
      (className ? ` ${className}` : '')
    }
    role="list"
    aria-label="Period summary"
  >
    {items.map((item) => (
      <div
        key={item.label}
        role="listitem"
        title={item.hint}
        className="bg-[#0b0d11]/80 backdrop-blur-xl px-3 py-3.5 sm:py-4 flex flex-col gap-1 min-w-0"
      >
        <span className="text-[10px] uppercase tracking-wider font-mono text-text-muted truncate">
          {item.label}
        </span>
        <span className="text-lg sm:text-xl font-extrabold text-[#fff4ec] leading-none tabular-nums">
          {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
        </span>
      </div>
    ))}
  </div>
);
