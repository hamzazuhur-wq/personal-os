// ============================================================
// MODULE 11 — IDEA COMPOSER MODAL (Home "+ Idea Capture" shortcut)
// ============================================================
// The SAME single IdeaComposer rendered inside a frosted overlay.
// This is NOT a second composer implementation — only a shell.
// ============================================================

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Lightbulb } from 'lucide-react';
import { IdeaComposer } from './IdeaComposer';
import { Goal } from '../../types/goal.types';
import { Project } from '../../types/project.types';
import { cn } from '../../utils/cn';

export interface IdeaComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCaptured?: () => void;
  goals?: Goal[];
  projects?: Project[];
}

export const IdeaComposerModal: React.FC<IdeaComposerModalProps> = ({
  isOpen,
  onClose,
  onCaptured,
  goals,
  projects,
}) => {
  useEffect(() => {
    if (!isOpen) return undefined;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-[6px]"
        onClick={onClose}
        data-testid="idea-composer-modal-backdrop"
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[420px] rounded-full bg-[#ff6a2a]/10 blur-[100px] pointer-events-none"
        aria-hidden="true"
      />
      <div
        className={cn(
          'relative z-10 w-full max-w-[620px] rounded-3xl overflow-hidden',
          'bg-gradient-to-b from-[rgba(26,29,37,0.72)] via-[rgba(14,17,23,0.82)] to-[rgba(9,11,15,0.88)]',
          'backdrop-blur-[40px]',
          'border border-white/[0.11]',
          'shadow-[0_32px_80px_rgba(0,0,0,0.66),inset_0_1px_0_0_rgba(255,255,255,0.17)]'
        )}
      >
        <div className="absolute top-0 left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-transparent via-[#ff8a4a]/50 to-transparent pointer-events-none" />
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <Lightbulb className="w-4 h-4 text-[#ff8a4a]" />
            <span className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-[#ff8a4a]">
              Idea Capture
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-7 h-7 flex items-center justify-center rounded-full bg-white/[0.06] border border-white/[0.08] text-text-muted hover:text-[#fff4ec] hover:bg-white/[0.12] transition-all cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="p-2 sm:p-3">
          <IdeaComposer autoFocus goals={goals} projects={projects} onCaptured={onCaptured} />
        </div>
      </div>
    </div>
  );
};
