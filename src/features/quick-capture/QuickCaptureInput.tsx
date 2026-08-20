import React, { useState } from 'react';
import { useCaptures } from '../../hooks/useCaptures';
import { CAPTURE_TYPES } from '../../constants/categories';
import { CaptureType } from '../../types/capture.types';
import { Button } from '../../components/ui/Button';
import { Zap, Send, CheckCircle2, ChevronDown, Mic, Sparkles } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface QuickCaptureInputProps {
  onCaptured?: () => void;
  className?: string;
  autoFocus?: boolean;
}

export const QuickCaptureInput: React.FC<QuickCaptureInputProps> = ({
  onCaptured,
  className,
  autoFocus = false,
}) => {
  const { createCapture } = useCaptures();
  const [content, setContent] = useState('');
  const [selectedType, setSelectedType] = useState<CaptureType>('unclassified');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setError(null);

      await createCapture({
        content: content.trim(),
        capture_type: selectedType,
        source: 'manual',
      });

      setContent('');
      setSelectedType('unclassified');
      setIsExpanded(false);
      setShowConfirmation(true);

      if (onCaptured) {
        onCaptured();
      }

      setTimeout(() => {
        setShowConfirmation(false);
      }, 2500);
    } catch (err) {
      console.error('Capture failed:', err);
      setError('Failed to save capture. Your text is preserved.');
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

  return (
    <div
      className={cn(
        'relative p-4 sm:p-6 rounded-2xl bg-gradient-to-b from-white/[0.07] via-white/[0.03] to-white/[0.015] backdrop-blur-3xl border border-white/[0.1] shadow-[0_16px_48px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.12)] overflow-hidden luminous-bottom-glow group hover:border-white/[0.16] transition-all duration-300',
        className
      )}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 relative z-10">
        {/* Header line with minimal status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#ff6a2a]/15 text-[#ff8a4a] border border-[#ff8a4a]/30 shadow-[0_0_12px_rgba(255,106,42,0.2)]">
              <Zap className="w-4 h-4 stroke-[2]" />
            </div>
            <span className="text-[11px] font-mono font-bold uppercase tracking-[0.18em] text-[#fff4ec]">
              Quick Capture Engine
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              title="Voice Stream (Future Architecture)"
              className="text-text-muted hover:text-[#ff8a4a] p-1.5 rounded-lg hover:bg-white/[0.04] transition-colors cursor-not-allowed opacity-40"
              disabled
            >
              <Mic className="w-4 h-4" />
            </button>
            <button
              type="button"
              title="AI Classification (Future Architecture)"
              className="text-text-muted hover:text-[#ff8a4a] p-1.5 rounded-lg hover:bg-white/[0.04] transition-colors cursor-not-allowed opacity-40"
              disabled
            >
              <Sparkles className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Recessed Glass Textarea */}
        <div className="relative">
          <textarea
            autoFocus={autoFocus}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              if (e.target.value.length > 0 && !isExpanded) {
                setIsExpanded(true);
              }
            }}
            onFocus={() => setIsExpanded(true)}
            onKeyDown={handleKeyDown}
            rows={isExpanded ? 3 : 2}
            placeholder="Capture thought, reflection, or raw insight before it vanishes... (Ctrl+Enter to save)"
            className="w-full bg-black/55 backdrop-blur-xl border border-white/[0.08] text-text-primary text-sm rounded-xl p-3.5 placeholder:text-text-muted/50 focus:border-[#ff8a4a]/70 focus:bg-black/75 focus:shadow-[0_0_24px_-4px_rgba(255,106,42,0.3),inset_0_1px_3px_rgba(0,0,0,0.5)] transition-all outline-none resize-none leading-relaxed"
          />
        </div>

        {error && <div className="text-xs text-red-400 font-medium">{error}</div>}

        {/* Action Controls & Category Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as CaptureType)}
                aria-label="Classification category"
                className="appearance-none bg-black/40 backdrop-blur-xl border border-white/[0.09] text-text-secondary text-xs font-medium rounded-lg pl-3 pr-8 py-2 min-h-[38px] focus:border-[#ff8a4a]/60 focus:text-[#fff4ec] outline-none cursor-pointer hover:border-white/20 transition-colors"
              >
                {CAPTURE_TYPES.map((cat) => (
                  <option key={cat.id} value={cat.id} className="bg-[#0f1218] text-text-primary">
                    {cat.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-text-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <span className="text-[10px] font-mono text-text-muted hidden sm:inline uppercase tracking-wider">
              Defaults to Inbox
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {showConfirmation && (
              <div className="flex items-center gap-1.5 text-xs text-[#ff8a4a] font-mono animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" />
                <span>Captured to Inbox</span>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              disabled={!content.trim()}
              rightIcon={<Send className="w-3.5 h-3.5" />}
            >
              Capture
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};
