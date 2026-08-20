import React, { useState, useEffect, useRef } from 'react';
import { useCaptures } from '../../hooks/useCaptures';
import { CAPTURE_TYPES } from '../../constants/categories';
import { CaptureType } from '../../types/capture.types';
import { Mic, X, Plus, CheckCircle2, Send } from 'lucide-react';
import { cn } from '../../utils/cn';

// The capture type labels we expose in the floating menu
const MENU_TYPES = CAPTURE_TYPES.filter((t) => t.id !== 'unclassified');

export interface QuickCaptureComposerProps {
  isOpen: boolean;
  onClose: () => void;
  onCaptured?: () => void;
}

export const QuickCaptureComposer: React.FC<QuickCaptureComposerProps> = ({
  isOpen,
  onClose,
  onCaptured,
}) => {
  const { createCapture } = useCaptures();

  const [content, setContent] = useState('');
  const [selectedType, setSelectedType] = useState<CaptureType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const plusBtnRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Focus textarea when opened
  useEffect(() => {
    if (isOpen) {
      setContent('');
      setSelectedType(null);
      setError(null);
      setShowSuccess(false);
      setIsCategoryMenuOpen(false);
      setTimeout(() => textareaRef.current?.focus(), 80);
    }
  }, [isOpen]);

  // Close category menu on outside click
  useEffect(() => {
    if (!isCategoryMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        plusBtnRef.current &&
        !plusBtnRef.current.contains(e.target as Node)
      ) {
        setIsCategoryMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isCategoryMenuOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return;
    try {
      setIsSubmitting(true);
      setError(null);
      await createCapture({
        content: content.trim(),
        capture_type: selectedType ?? 'unclassified',
        source: 'manual',
      });
      setShowSuccess(true);
      onCaptured?.();
      setTimeout(() => {
        onClose();
        setShowSuccess(false);
      }, 900);
    } catch (err) {
      console.error('Capture failed:', err);
      setError('Could not save. Your text is preserved.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSelectType = (typeId: CaptureType) => {
    setSelectedType(typeId === selectedType ? null : typeId);
    setIsCategoryMenuOpen(false);
  };

  const handleClearType = () => setSelectedType(null);

  const selectedTypeMeta = selectedType
    ? CAPTURE_TYPES.find((t) => t.id === selectedType)
    : null;

  if (!isOpen) return null;

  return (
    /* Full-viewport frosted overlay */
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6"
      onClick={(e) => {
        // Close if clicking directly on the overlay backdrop, not the modal itself
        if (e.target === overlayRef.current) onClose();
      }}
    >
      {/* Backdrop: blurred + very dark */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[6px]" />

      {/* Ambient orange glow behind composer */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-[#ff6a2a]/10 blur-[100px] pointer-events-none" />

      {/* The composer panel */}
      <div
        className={cn(
          'relative z-10 w-full max-w-[580px] rounded-3xl overflow-hidden',
          'bg-gradient-to-b from-[rgba(18,21,28,0.88)] via-[rgba(14,17,23,0.92)] to-[rgba(10,12,16,0.96)]',
          'backdrop-blur-[40px]',
          'border border-white/[0.11]',
          'shadow-[0_32px_80px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.04),inset_0_1px_0_0_rgba(255,255,255,0.14)]',
        )}
        // Prevent overlay-click handler from firing when clicking inside
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top edge highlight line */}
        <div className="absolute top-0 left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-transparent via-[#ff8a4a]/50 to-transparent pointer-events-none" />

        {/* Subtle bottom ambient glow */}
        <div className="absolute bottom-0 left-0 right-0 h-[45%] bg-gradient-to-t from-[#ff6a2a]/[0.07] to-transparent pointer-events-none" />

        {/* ── Header ─────────────────────────────── */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.06] relative">
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-[#ff8a4a]">
              Quick Capture
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-white/[0.06] border border-white/[0.08] text-text-muted hover:text-[#fff4ec] hover:bg-white/[0.12] hover:border-white/15 transition-all cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ── Central Input Area ──────────────────── */}
        <div className="px-6 pt-5 pb-3 relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={5}
            placeholder="What's on your mind?"
            className={cn(
              'w-full resize-none outline-none bg-transparent',
              'text-[#fff4ec] text-[17px] font-medium leading-relaxed tracking-[-0.01em] placeholder:text-white/20',
              // We let the text look large & centered — no box border on the textarea itself
            )}
          />

          {error && (
            <p className="text-xs text-rose-400 mt-1">{error}</p>
          )}
        </div>

        {/* ── Bottom Bar ─────────────────────────── */}
        <div className="flex items-center justify-between px-6 pb-5 pt-3 border-t border-white/[0.05] relative">

          {/* Left: Category chip or + button */}
          <div className="flex items-center gap-3 relative">

            {/* + Category toggle button */}
            <div className="relative">
              <button
                ref={plusBtnRef}
                type="button"
                onClick={() => setIsCategoryMenuOpen((v) => !v)}
                className={cn(
                  'w-8 h-8 flex items-center justify-center rounded-xl border transition-all cursor-pointer text-sm font-bold',
                  isCategoryMenuOpen
                    ? 'bg-[#ff6a2a]/25 border-[#ff8a4a]/60 text-[#fff4ec] shadow-[0_0_14px_-2px_rgba(255,106,42,0.5)]'
                    : 'bg-white/[0.06] border-white/[0.1] text-text-muted hover:text-[#fff4ec] hover:bg-white/[0.1] hover:border-white/20'
                )}
                aria-label="Select category"
                title="Choose category"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
              </button>

              {/* Floating Category Menu */}
              <div
                ref={menuRef}
                className={cn(
                  'absolute bottom-[calc(100%+10px)] left-0 z-20 w-52 rounded-2xl overflow-hidden',
                  'bg-gradient-to-b from-[rgba(18,22,30,0.96)] to-[rgba(12,15,20,0.98)]',
                  'backdrop-blur-[32px]',
                  'border border-white/[0.1]',
                  'shadow-[0_16px_48px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.04),inset_0_1px_0_0_rgba(255,255,255,0.1)]',
                  'transition-all duration-150 origin-bottom-left',
                  isCategoryMenuOpen
                    ? 'opacity-100 translate-y-0 pointer-events-auto'
                    : 'opacity-0 translate-y-2 pointer-events-none'
                )}
              >
                {/* Menu top edge highlight */}
                <div className="absolute top-0 left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-transparent via-[#ff8a4a]/30 to-transparent pointer-events-none" />

                <div className="p-2">
                  <div className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-text-muted px-2.5 py-1.5">
                    Classify capture
                  </div>
                  {MENU_TYPES.map((type) => {
                    const isSelected = selectedType === type.id;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => handleSelectType(type.id as CaptureType)}
                        className={cn(
                          'w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer flex items-center justify-between gap-2',
                          isSelected
                            ? 'bg-[#ff6a2a]/20 text-[#fff4ec] border border-[#ff8a4a]/40 shadow-[0_2px_10px_rgba(255,106,42,0.2)]'
                            : 'text-text-secondary hover:bg-white/[0.06] hover:text-[#fff4ec]'
                        )}
                      >
                        <span>{type.label}</span>
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#ff8a4a] shadow-[0_0_6px_#ff6a2a] shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Selected category chip (shown when type is selected) */}
            {selectedTypeMeta && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#ff6a2a]/15 border border-[#ff8a4a]/35 text-[#ffb27a] text-xs font-mono font-medium">
                <span>{selectedTypeMeta.label}</span>
                <button
                  type="button"
                  onClick={handleClearType}
                  className="text-[#ff8a4a]/60 hover:text-[#ff8a4a] transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Future: Voice (disabled, visually subtle) */}
            <button
              type="button"
              disabled
              title="Voice capture (coming soon)"
              className="text-text-muted/30 p-1.5 cursor-not-allowed"
            >
              <Mic className="w-4 h-4" />
            </button>
          </div>

          {/* Right: Save button */}
          <div className="flex items-center gap-3">
            {showSuccess && (
              <div className="flex items-center gap-1.5 text-xs font-mono text-[#ff8a4a]">
                <CheckCircle2 className="w-4 h-4" />
                <span>Captured</span>
              </div>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!content.trim() || isSubmitting}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all',
                content.trim() && !isSubmitting
                  ? 'bg-gradient-to-r from-[#ff6a2a] to-[#ff8a4a] text-[#0a0c10] shadow-[0_4px_20px_rgba(255,106,42,0.45)] hover:shadow-[0_6px_28px_rgba(255,106,42,0.6)] hover:-translate-y-0.5 cursor-pointer'
                  : 'bg-white/[0.06] text-text-muted/40 border border-white/[0.06] cursor-not-allowed'
              )}
            >
              {isSubmitting ? (
                <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              Save to Inbox
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
