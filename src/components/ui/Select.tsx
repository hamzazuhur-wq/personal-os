import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '../../utils/cn';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  subtext?: string;
  icon?: React.ReactNode;
}

export interface SelectProps {
  id?: string;
  name?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
  align?: 'left' | 'right';
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  'aria-label'?: string;
}

export const Select: React.FC<SelectProps> = ({
  id,
  name,
  label,
  value,
  onChange,
  options,
  placeholder = 'Select option...',
  error,
  disabled = false,
  size = 'md',
  align = 'left',
  className,
  triggerClassName,
  menuClassName,
  'aria-label': ariaLabel,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  const selectedOption = options.find((opt) => opt.value === value);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;

      if (e.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
        return;
      }

      if (e.key === 'Enter' || e.key === ' ') {
        if (!isOpen) {
          e.preventDefault();
          setIsOpen(true);
          const currentIndex = options.findIndex((opt) => opt.value === value);
          setFocusedIndex(currentIndex >= 0 ? currentIndex : 0);
        } else if (focusedIndex >= 0 && focusedIndex < options.length) {
          e.preventDefault();
          onChange(options[focusedIndex].value);
          setIsOpen(false);
          triggerRef.current?.focus();
        }
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setFocusedIndex(0);
        } else {
          setFocusedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
        }
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setFocusedIndex(options.length - 1);
        } else {
          setFocusedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
        }
        return;
      }

      if (e.key === 'Tab') {
        if (isOpen) {
          setIsOpen(false);
        }
      }
    },
    [disabled, isOpen, focusedIndex, options, value, onChange]
  );

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const sizeClasses = {
    sm: 'text-xs min-h-[34px] px-3 py-1.5 rounded-lg',
    md: 'text-xs sm:text-sm min-h-[42px] px-3.5 py-2.5 rounded-xl',
  };

  return (
    <div className={cn('relative w-full flex flex-col gap-1.5', className)} ref={containerRef}>
      {label && (
        <label
          htmlFor={selectId}
          className="text-[11px] font-mono font-semibold uppercase tracking-[0.15em] text-text-muted select-none"
        >
          {label}
        </label>
      )}

      {/* Hidden input for standard form serialization if name is provided */}
      {name && <input type="hidden" name={name} value={value} id={selectId} />}

      {/* Glass Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        id={selectId}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || label}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className={cn(
          'w-full flex items-center justify-between gap-2.5 text-left font-medium transition-colors duration-150 select-none cursor-pointer',
          'bg-gradient-to-b from-[rgba(18,21,28,0.75)] via-[rgba(14,17,23,0.85)] to-[rgba(10,12,16,0.9)]',
          'backdrop-blur-2xl border border-white/[0.09]',
          'shadow-[0_4px_16px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)]',
          isOpen
            ? 'border-[#ff8a4a]/70 shadow-[0_0_20px_-4px_rgba(255,106,42,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] text-[#fff4ec]'
            : 'text-text-primary hover:border-white/20 hover:text-[#fff4ec]',
          error && 'border-rose-500/60 focus:border-rose-500',
          disabled && 'opacity-40 cursor-not-allowed pointer-events-none',
          sizeClasses[size],
          triggerClassName
        )}
      >
        <span className={cn('truncate flex-1', !selectedOption && 'text-text-muted/60')}>
          {selectedOption ? (
            <span className="flex items-center gap-2">
              {selectedOption.icon && <span className="shrink-0">{selectedOption.icon}</span>}
              <span className="truncate">{selectedOption.label}</span>
            </span>
          ) : (
            placeholder
          )}
        </span>

        <ChevronDown
          className={cn(
            'w-4 h-4 text-text-muted shrink-0 transition-transform duration-200 pointer-events-none',
            isOpen && 'rotate-180 text-[#ff8a4a]'
          )}
        />
      </button>

      {/* Floating Glass Dropdown Menu — Attached 8px directly below trigger */}
      <div
        ref={menuRef}
        role="listbox"
        aria-activedescendant={focusedIndex >= 0 ? `option-${focusedIndex}` : undefined}
        className={cn(
          'absolute top-[calc(100%+8px)] z-50 min-w-full max-h-64 overflow-y-auto rounded-2xl p-1.5',
          'bg-gradient-to-b from-[rgba(18,22,30,0.96)] via-[rgba(14,17,24,0.98)] to-[rgba(10,12,17,0.99)]',
          'backdrop-blur-[32px]',
          'border border-white/[0.11]',
          'shadow-[0_20px_50px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.04),inset_0_1px_0_rgba(255,255,255,0.12)]',
          'transition-all duration-150 origin-top',
          align === 'right' ? 'right-0' : 'left-0',
          isOpen
            ? 'opacity-100 translate-y-0 pointer-events-auto scale-100'
            : 'opacity-0 -translate-y-1.5 pointer-events-none scale-[0.98]',
          menuClassName
        )}
      >
        {/* Top ambient hairline */}
        <div className="absolute top-0 left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-transparent via-[#ff8a4a]/40 to-transparent pointer-events-none" />

        <div className="space-y-1">
          {options.map((opt, index) => {
            const isSelected = opt.value === value;
            const isFocused = index === focusedIndex;

            return (
              <div
                key={opt.value}
                id={`option-${index}`}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(opt.value)}
                onMouseEnter={() => setFocusedIndex(index)}
                className={cn(
                  'w-full min-h-[40px] px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors duration-100 flex items-center justify-between gap-3 cursor-pointer select-none',
                  isSelected
                    ? 'bg-[#ff6a2a]/20 text-[#fff4ec] border border-[#ff8a4a]/40 shadow-[0_2px_12px_rgba(255,106,42,0.2)] font-semibold'
                    : isFocused
                    ? 'bg-white/[0.08] text-[#fff4ec] border border-white/[0.08]'
                    : 'text-text-secondary hover:bg-white/[0.06] hover:text-[#fff4ec] border border-transparent'
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                  <div className="truncate">
                    <span className="truncate block">{opt.label}</span>
                    {opt.subtext && (
                      <span className="text-[10px] font-mono text-text-muted truncate block">
                        {opt.subtext}
                      </span>
                    )}
                  </div>
                </div>

                {isSelected && (
                  <Check className="w-3.5 h-3.5 text-[#ff8a4a] shrink-0 stroke-[2.5]" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {error && <span className="text-xs text-rose-400 font-medium">{error}</span>}
    </div>
  );
};
