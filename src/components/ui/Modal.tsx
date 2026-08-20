import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Click outside backdrop with ambient radial orange light */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#ff6a2a]/10 blur-[140px] pointer-events-none" />
      </div>

      {/* Modal Dialog Body */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cn(
          'relative w-full bg-gradient-to-b from-[#181d26]/90 to-[#0d1017]/95 backdrop-blur-3xl border border-white/[0.14] sm:rounded-2xl rounded-t-3xl shadow-[0_24px_64px_rgba(0,0,0,0.85),0_0_30px_-10px_rgba(255,106,42,0.25),inset_0_1px_0_0_rgba(255,255,255,0.18)] z-10 max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200',
          maxWidthStyles[maxWidth]
        )}
      >
        {/* Subtle orange top accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#ff8a4a] to-transparent opacity-80" />

        {/* Modal Header */}
        <div className="flex items-start justify-between p-4 sm:p-6 border-b border-white/[0.08] bg-white/[0.02]">
          <div>
            <h3 id="modal-title" className="text-base sm:text-lg font-bold text-[#fff4ec] tracking-tight">
              {title}
            </h3>
            {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="text-text-muted hover:text-[#fff4ec] p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer border border-transparent hover:border-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};
