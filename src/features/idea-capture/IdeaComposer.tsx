// ============================================================
// MODULE 11 — THE SINGLE IDEA COMPOSER
// ============================================================
// ONE composer for the whole product (replaces QuickCaptureInput /
// QuickCaptureComposer lineages). Entry modes:
//   TEXT   → type → Save Idea            (no AI)
//   VOICE  → transcript → composer → user review → Save Idea (no AI)
//   AI VOICE → transcript → ONE AI organization call → preview
//             → explicit confirmation → Save Idea
// Every save creates exactly ONE Idea:
//   capture_type = 'idea', categorization via metadata.idea_category_id
// (user-defined categories from Settings — never legacy capture types).
// ============================================================

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useCaptures } from '../../hooks/useCaptures';
import { useIdeaCategories } from '../../hooks/useIdeaCategories';
import { useVoiceInput } from '../../hooks/useVoiceInput';
import { useAIRepo } from '../../app/providers/RepositoryProvider';
import { useSettings } from '../../app/providers/SettingsProvider';
import { personalAgentCore } from '../../services/ai/agent/agentCore';
import {
  organizeIdeaTranscript,
  IdeaOrganizationResult,
} from '../../services/ai/idea/ideaOrganizer';
import { IdeaAttachment } from '../../types/capture.types';
import { Button } from '../../components/ui/Button';
import { GoalProjectSelects } from '../../components/shared/GoalProjectSelects';
import { AttachmentPickerModal } from './AttachmentPickerModal';
import { Goal } from '../../types/goal.types';
import { Project } from '../../types/project.types';
import {
  Lightbulb,
  Send,
  CheckCircle2,
  Mic,
  Sparkles,
  Plus,
  ChevronDown,
  X,
  Link2,
  Image as ImageIcon,
  Paperclip,
} from 'lucide-react';
import { cn } from '../../utils/cn';

export function deriveIdeaTitle(content: string): string | undefined {
  const firstLine = content.split('\n').map((l) => l.trim()).find(Boolean);
  if (!firstLine) return undefined;
  return firstLine.length > 80 ? `${firstLine.slice(0, 79).trimEnd()}…` : firstLine;
}

interface AiVoiceState {
  phase: 'idle' | 'recording' | 'organizing' | 'review' | 'error';
  transcript: string;
  result: IdeaOrganizationResult | null;
  error: string | null;
}

export interface IdeaComposerProps {
  onCaptured?: () => void;
  className?: string;
  autoFocus?: boolean;
  goals?: Goal[];
  projects?: Project[];
}

export const IdeaComposer: React.FC<IdeaComposerProps> = ({
  onCaptured,
  className,
  autoFocus = false,
  goals = [],
  projects = [],
}) => {
  const { createCapture } = useCaptures();
  const { active: categories, loading: categoriesLoading } = useIdeaCategories();
  const aiRepo = useAIRepo();
  const { settings } = useSettings();
  // Arabic is the default recognition locale; user-configurable in Settings.
  const voiceLanguage = settings?.voice_language ?? 'ar-SA';

  const [content, setContent] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [relatedGoalId, setRelatedGoalId] = useState('');
  const [relatedProjectId, setRelatedProjectId] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<IdeaAttachment[]>([]);
  const [isAttachmentPickerOpen, setIsAttachmentPickerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiVoice, setAiVoice] = useState<AiVoiceState>({
    phase: 'idle',
    transcript: '',
    result: null,
    error: null,
  });

  const categoryMenuRef = useRef<HTMLDivElement>(null);
  const categoryControlRef = useRef<HTMLButtonElement>(null);
  const voiceModeRef = useRef<'text' | 'ai'>('text');

  // ── Voice (single recognition pipeline; mode decides routing) ──
  // Transcripts are used RAW as returned by the engine — mixed
  // Arabic/English is preserved, nothing is translated or rewritten.
  const voice = useVoiceInput((transcript) => {
    if (voiceModeRef.current === 'ai') {
      void runAiOrganization(transcript);
    } else {
      setContent((prev) => (prev ? `${prev} ${transcript}` : transcript));
    }
  }, voiceLanguage);

  useEffect(() => {
    if (!isCategoryMenuOpen) return;
    const closeMenu = (event: MouseEvent) => {
      if (
        !categoryMenuRef.current?.contains(event.target as Node) &&
        !categoryControlRef.current?.contains(event.target as Node)
      ) {
        setIsCategoryMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', closeMenu);
    return () => document.removeEventListener('mousedown', closeMenu);
  }, [isCategoryMenuOpen]);

  const handleAddAttachment = (att: Omit<IdeaAttachment, 'id' | 'created_at'>): boolean => {
    setPendingAttachments((prev) => [
      ...prev,
      {
        ...att,
        id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        created_at: new Date().toISOString(),
      },
    ]);
    return true;
  };

  const removePendingAttachment = (id: string) =>
    setPendingAttachments((prev) => prev.filter((a) => a.id !== id));

  const buildMetadata = (categoryId: string | null, attachments: IdeaAttachment[]) => {
    const metadata: Record<string, unknown> = {};
    if (categoryId) metadata.idea_category_id = categoryId;
    if (attachments.length > 0) metadata.attachments = attachments;
    return Object.keys(metadata).length > 0 ? metadata : undefined;
  };

  const doSubmit = useCallback(
    async (payload: {
      content: string;
      title?: string;
      categoryId: string | null;
      attachments: IdeaAttachment[];
      goalId?: string;
      projectId?: string;
    }): Promise<boolean> => {
      if (!payload.content.trim() || isSubmitting) return false;
      try {
        setIsSubmitting(true);
        setError(null);
        await createCapture({
          content: payload.content.trim(),
          title: payload.title?.trim() || deriveIdeaTitle(payload.content),
          capture_type: 'idea',
          source: 'manual',
          related_goal_id: payload.goalId || undefined,
          related_project_id: payload.projectId || undefined,
          metadata: buildMetadata(payload.categoryId, payload.attachments),
        });
        setShowConfirmation(true);
        onCaptured?.();
        setTimeout(() => setShowConfirmation(false), 2500);
        return true;
      } catch (err) {
        console.error('Idea capture failed:', err);
        setError('Failed to save idea. Your text is preserved.');
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [createCapture, isSubmitting, onCaptured]
  );

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const ok = await doSubmit({
      content,
      categoryId: selectedCategoryId,
      attachments: pendingAttachments,
      goalId: relatedGoalId,
      projectId: relatedProjectId,
    });
    if (ok) {
      setContent('');
      setSelectedCategoryId(null);
      setRelatedGoalId('');
      setRelatedProjectId('');
      setPendingAttachments([]);
      setIsExpanded(false);
    }
  };

  // ── AI VOICE: transcription → exactly ONE organization call ──
  const runAiOrganization = async (transcript: string) => {
    setAiVoice({ phase: 'organizing', transcript, result: null, error: null });
    try {
      const settings = await aiRepo.getSettings().catch(() => null);
      if (settings) await personalAgentCore.configureFromSettings(settings);
      const result = await organizeIdeaTranscript({
        transcript,
        activeCategories: categories,
      });
      setAiVoice({ phase: 'review', transcript, result, error: null });
    } catch (err: any) {
      setAiVoice({
        phase: 'error',
        transcript,
        result: null,
        error:
          err?.message === 'Nothing recorded.'
            ? 'Nothing was recorded.'
            : 'AI organization failed. You can still save the original transcript.',
      });
    }
  };

  const startVoice = (mode: 'text' | 'ai') => {
    voiceModeRef.current = mode;
    if (mode === 'ai') setAiVoice({ phase: 'recording', transcript: '', result: null, error: null });
    else setAiVoice({ phase: 'idle', transcript: '', result: null, error: null });
    voice.toggleListening();
  };

  const stopVoice = () => voice.stopListening();
  const closeAiReview = () => setAiVoice({ phase: 'idle', transcript: '', result: null, error: null });

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  const categoryTriggerLabel = selectedCategory
    ? selectedCategory.name
    : categoriesLoading
      ? 'Categories…'
      : 'Uncategorized';

  return (
    <div
      className={cn(
        'capture-input relative p-4 sm:p-6 lg:p-7 rounded-[1.35rem] overflow-visible group transition-all duration-300',
        className
      )}
      data-testid="idea-composer"
    >
      <div className="capture-input__ambient" aria-hidden="true" />
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#ff6a2a]/15 text-[#ff8a4a] border border-[#ff8a4a]/30 shadow-[0_0_12px_rgba(255,106,42,0.2)]">
              <Lightbulb className="w-4 h-4 stroke-[2]" />
            </div>
            <span className="text-[11px] font-mono font-bold uppercase tracking-[0.18em] text-[#fff4ec]">
              Capture an Idea
            </span>
          </div>

          {/* Voice entry modes — two distinct labeled actions */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              data-testid="composer-voice-btn"
              title={
                !voice.isSupported
                  ? 'Voice input not supported in this browser'
                  : voice.isListening && voiceModeRef.current === 'text'
                    ? 'Stop voice transcription'
                    : 'Transcribe speech into the composer (no AI)'
              }
              onClick={() => (voice.isListening && voiceModeRef.current === 'text' ? stopVoice() : startVoice('text'))}
              disabled={!voice.isSupported}
              className={cn(
                'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border',
                voice.isListening && voiceModeRef.current === 'text'
                  ? 'bg-red-500/20 text-red-300 border-red-400/40 animate-pulse'
                  : 'bg-black/30 border-white/[0.08] text-text-secondary hover:text-[#ffb27a] hover:border-[#ff8a4a]/35',
                !voice.isSupported && 'cursor-not-allowed opacity-40'
              )}
            >
              <Mic className="w-3.5 h-3.5" />
              <span className="flex flex-col items-start leading-tight">
                <span>Voice</span>
                <span className="text-[9px] font-normal text-text-muted">Transcribe</span>
              </span>
            </button>
            <button
              type="button"
              data-testid="composer-ai-voice-btn"
              title={
                !voice.isSupported
                  ? 'Voice input not supported in this browser'
                  : voice.isListening && voiceModeRef.current === 'ai'
                    ? 'Finish recording & organize with AI'
                    : 'Transcribe speech then organize it with ONE AI call'
              }
              onClick={() => (voice.isListening && voiceModeRef.current === 'ai' ? stopVoice() : startVoice('ai'))}
              disabled={!voice.isSupported}
              className={cn(
                'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border',
                voice.isListening && voiceModeRef.current === 'ai'
                  ? 'bg-[#ff6a2a]/25 text-[#ffb27a] border-[#ff8a4a]/50 animate-pulse'
                  : 'bg-black/30 border-white/[0.08] text-text-secondary hover:text-[#ffb27a] hover:border-[#ff8a4a]/35',
                !voice.isSupported && 'cursor-not-allowed opacity-40'
              )}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="flex flex-col items-start leading-tight">
                <span>AI Voice</span>
                <span className="text-[9px] font-normal text-text-muted">Transcribe + Organize</span>
              </span>
            </button>
          </div>
        </div>

        {(voice.isListening || voice.interimTranscript) && (
          <div className="text-xs text-text-muted flex items-center gap-2" data-testid="voice-status">
            <span className={cn('w-2 h-2 rounded-full', voice.isListening ? 'bg-red-400 animate-pulse' : 'bg-white/20')} />
            {voice.isListening ? 'Listening…' : ''} {voice.interimTranscript}
          </div>
        )}
        {voice.error && <div className="text-xs text-red-400">{voice.error}</div>}

        <div className="capture-input__field relative">
          <textarea
            autoFocus={autoFocus}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              if (e.target.value.length > 0 && !isExpanded) setIsExpanded(true);
            }}
            onFocus={() => setIsExpanded(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            rows={isExpanded ? 3 : 2}
            placeholder="What's the idea? (First line becomes its title)"
            data-testid="idea-composer-input"
            className="w-full min-h-[112px] bg-black/30 backdrop-blur-xl border border-white/[0.07] text-text-primary text-[15px] rounded-xl p-4 sm:p-5 placeholder:text-text-muted/55 focus:border-[#ff8a4a]/55 focus:bg-black/40 focus:shadow-[0_0_28px_-8px_rgba(255,106,42,0.38),inset_0_1px_3px_rgba(0,0,0,0.38)] transition-all outline-none resize-none leading-relaxed"
          />
        </div>

        {error && <div className="text-xs text-red-400 font-medium">{error}</div>}

        {/* Goal / Project nesting — always visible, never expand the card */}
        <GoalProjectSelects
          goals={goals}
          projects={projects}
          goalId={relatedGoalId}
          projectId={relatedProjectId}
          onGoalChange={setRelatedGoalId}
          onProjectChange={setRelatedProjectId}
          size="sm"
          showLabels={false}
        />

        {/* Attachments — single compact action; picker is a centered modal */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAttachmentPickerOpen(true)}
            data-testid="composer-add-attachment"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-black/30 border border-white/[0.08] text-text-secondary hover:text-[#ffb27a] hover:border-[#ff8a4a]/35 transition-colors cursor-pointer"
          >
            <Paperclip className="w-3.5 h-3.5" /> Add Attachment
          </button>
          {pendingAttachments.map((a) => {
            const isEmbedded = typeof a.url === 'string' && a.url.startsWith('data:');
            return (
              <span
                key={a.id}
                className="inline-flex items-center gap-1 max-w-[240px] px-2 py-0.5 rounded-md bg-[#ff6a2a]/10 border border-[#ff8a4a]/25 text-[11px] text-[#ffb27a]"
                data-testid={`composer-pending-attachment-${a.id}`}
              >
                {a.type === 'image' ? <ImageIcon className="w-3 h-3 shrink-0" /> : <Link2 className="w-3 h-3 shrink-0" />}
                <a
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate hover:underline"
                  title={a.label || a.url}
                >
                  {a.label || (isEmbedded ? 'embedded image' : a.url)}
                </a>
                <button type="button" onClick={() => removePendingAttachment(a.id)} className="hover:text-red-300 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
        <AttachmentPickerModal
          isOpen={isAttachmentPickerOpen}
          onClose={() => setIsAttachmentPickerOpen(false)}
          onAdd={handleAddAttachment}
        />

        {/* Category selector + submit */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="relative">
            <button
              ref={categoryControlRef}
              type="button"
              data-testid="composer-category-trigger"
              onClick={() => setIsCategoryMenuOpen((isOpen) => !isOpen)}
              aria-expanded={isCategoryMenuOpen}
              aria-haspopup="menu"
              className={cn(
                'capture-category-trigger flex items-center gap-2 min-h-[38px] px-3 rounded-xl text-xs font-medium transition-all duration-150 ease-out cursor-pointer',
                isCategoryMenuOpen || selectedCategoryId
                  ? 'bg-[#ff6a2a]/16 border border-[#ff8a4a]/40 text-[#fff4ec] shadow-[0_8px_20px_-12px_rgba(255,106,42,0.55),inset_0_1px_0_rgba(255,255,255,0.12)]'
                  : 'bg-black/30 border border-white/[0.08] text-text-secondary hover:text-[#fff4ec] hover:bg-white/[0.055] hover:border-white/[0.16]'
              )}
            >
              {!selectedCategoryId ? <Plus className="w-3.5 h-3.5 text-[#ff8a4a]" /> : null}
              <span>{categoryTriggerLabel}</span>
              <ChevronDown className={cn('w-3.5 h-3.5 text-text-muted transition-transform duration-150', isCategoryMenuOpen && 'rotate-180')} />
            </button>

            {isCategoryMenuOpen && (
              <div
                ref={categoryMenuRef}
                role="menu"
                data-testid="composer-category-menu"
                className="absolute top-[calc(100%+8px)] left-0 z-50 w-60 max-h-64 overflow-y-auto p-1.5 rounded-2xl bg-gradient-to-b from-[#181d26]/95 to-[#0d1017]/98 backdrop-blur-3xl border border-white/[0.14] shadow-[0_24px_64px_rgba(0,0,0,0.85),0_0_30px_-10px_rgba(255,106,42,0.25),inset_0_1px_0_0_rgba(255,255,255,0.18)]"
              >
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#ff8a4a] to-transparent opacity-80 pointer-events-none" />
                {categoriesLoading ? (
                  <div className="px-2.5 py-2 text-xs text-text-muted">Loading…</div>
                ) : categories.length === 0 ? (
                  <div className="px-2.5 py-2 text-xs text-text-muted">No categories yet.</div>
                ) : (
                  categories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      role="menuitem"
                      data-testid={`composer-category-option-${category.name}`}
                      onClick={() => {
                        setSelectedCategoryId(selectedCategoryId === category.id ? null : category.id);
                        setIsCategoryMenuOpen(false);
                      }}
                      className={cn(
                        'w-full min-h-[36px] flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl text-left text-xs font-medium transition-[background-color,color,box-shadow] duration-150 ease-out',
                        selectedCategoryId === category.id
                          ? 'bg-[#ff6a2a]/16 border border-[#ff8a4a]/35 text-[#fff4ec] shadow-[0_2px_12px_rgba(255,106,42,0.18)]'
                          : 'text-text-secondary hover:bg-gradient-to-r hover:from-[#e85b22]/70 hover:to-[#ff8a4a]/45 hover:text-[#fffaf6]'
                      )}
                    >
                      {category.name}
                      {selectedCategoryId === category.id && <span className="w-1.5 h-1.5 rounded-full bg-[#ff8a4a]" />}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {showConfirmation && (
              <div className="flex items-center gap-1.5 text-xs text-[#ff8a4a] font-mono animate-in fade-in" data-testid="idea-saved-confirmation">
                <CheckCircle2 className="w-4 h-4" />
                <span>Idea saved</span>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              disabled={!content.trim()}
              rightIcon={<Send className="w-3.5 h-3.5" />}
              className="capture-calm-button"
            >
              Add Idea
            </Button>
          </div>
        </div>
      </form>

      {/* AI Voice review modal (RAW vs ORGANIZED) */}
      {(aiVoice.phase === 'recording' || aiVoice.phase === 'organizing') && (
        <AiVoiceInlineStatus
          phase={aiVoice.phase}
          onCancel={() => {
            stopVoice();
            closeAiReview();
          }}
        />
      )}
      {aiVoice.phase === 'review' && aiVoice.result && (
        <IdeaAiVoiceReviewModal
          transcript={aiVoice.transcript}
          result={aiVoice.result}
          categories={categories}
          onClose={closeAiReview}
          onUseOrganized={async (categoryId) => {
            const ok = await doSubmit({
              content: aiVoice.result!.body,
              title: aiVoice.result!.title,
              categoryId,
              attachments: pendingAttachments,
            });
            if (ok) {
              closeAiReview();
              setContent('');
              setSelectedCategoryId(null);
              setPendingAttachments([]);
              setIsExpanded(false);
            }
          }}
          onKeepOriginal={async (categoryId) => {
            const ok = await doSubmit({
              content: aiVoice.transcript,
              categoryId,
              attachments: pendingAttachments,
            });
            if (ok) {
              closeAiReview();
              setSelectedCategoryId(null);
              setPendingAttachments([]);
              setIsExpanded(false);
            }
          }}
          onEditOrganized={(categoryId) => {
            setContent(aiVoice.result!.body);
            if (categoryId) setSelectedCategoryId(categoryId);
            setIsExpanded(true);
            closeAiReview();
          }}
        />
      )}
      {aiVoice.phase === 'error' && (
        <IdeaAiVoiceErrorModal
          message={aiVoice.error ?? 'AI organization failed.'}
          transcript={aiVoice.transcript}
          onClose={closeAiReview}
          onSaveOriginal={async () => {
            const ok = await doSubmit({
              content: aiVoice.transcript,
              categoryId: selectedCategoryId,
              attachments: pendingAttachments,
            });
            if (ok) {
              closeAiReview();
              setSelectedCategoryId(null);
              setPendingAttachments([]);
              setIsExpanded(false);
            }
          }}
        />
      )}
    </div>
  );
};

/** Compact recording/organizing status overlay anchored over the page. */
const AiVoiceInlineStatus: React.FC<{ phase: 'recording' | 'organizing'; onCancel: () => void }> = ({ phase, onCancel }) => (
  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9998]" data-testid="ai-voice-status">
    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-b from-[#181d26]/95 to-[#0d1017]/98 backdrop-blur-3xl border border-[#ff8a4a]/35 shadow-[0_24px_64px_rgba(0,0,0,0.85)]">
      <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-pulse" />
      <span className="text-sm text-[#fff4ec]">
        {phase === 'recording' ? 'Recording… tap AI Voice again or Cancel to finish.' : 'Organizing your idea with AI…'}
      </span>
      <button
        type="button"
        onClick={onCancel}
        className="ml-2 w-7 h-7 flex items-center justify-center rounded-full bg-white/[0.06] border border-white/[0.08] text-text-muted hover:text-[#fff4ec] cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
);

// ============================================================
// AI VOICE REVIEW MODAL — RAW TRANSCRIPT vs AI ORGANIZED
// ============================================================
interface ReviewModalProps {
  transcript: string;
  result: IdeaOrganizationResult;
  categories: { id: string; name: string }[];
  onClose: () => void;
  onUseOrganized: (categoryId: string | null) => void;
  onKeepOriginal: (categoryId: string | null) => void;
  onEditOrganized: (categoryId: string | null) => void;
}

export const IdeaAiVoiceReviewModal: React.FC<ReviewModalProps> = ({
  transcript,
  result,
  categories,
  onClose,
  onUseOrganized,
  onKeepOriginal,
  onEditOrganized,
}) => {
  const suggestedValid =
    !!result.suggested_category_id && categories.some((c) => c.id === result.suggested_category_id);
  const [applySuggested, setApplySuggested] = useState(suggestedValid);

  const chosenCategoryId = applySuggested && suggestedValid ? result.suggested_category_id : null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-[6px]" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-[860px] max-h-[86vh] overflow-hidden rounded-3xl bg-gradient-to-b from-[rgba(26,29,37,0.92)] to-[rgba(9,11,15,0.96)] backdrop-blur-[40px] border border-white/[0.11] shadow-[0_32px_80px_rgba(0,0,0,0.66)] flex flex-col"
        data-testid="ai-voice-review-modal"
      >
        <div className="absolute top-0 left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-transparent via-[#ff8a4a]/50 to-transparent pointer-events-none" />
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-[#ff8a4a]" />
            <span className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-[#ff8a4a]">
              AI Voice — Review before saving
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-white/[0.06] border border-white/[0.08] text-text-muted hover:text-[#fff4ec] cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4 px-6 py-5 overflow-auto">
          <section className="rounded-2xl border border-white/[0.07] bg-black/25 p-4">
            <h3 className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted mb-2">
              Raw Transcript
            </h3>
            <p className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed" data-testid="raw-transcript">
              {transcript}
            </p>
          </section>
          <section className="rounded-2xl border border-[#ff8a4a]/25 bg-[#ff6a2a]/[0.05] p-4">
            <h3 className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-[#ffb27a] mb-2">
              AI Organized
            </h3>
            <p className="text-base font-semibold text-[#fff4ec] mb-2" data-testid="organized-title">
              {result.title}
            </p>
            <p className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed max-h-[240px] overflow-auto" data-testid="organized-body">
              {result.body}
            </p>
            {result.key_points.length > 0 && (
              <ul className="mt-3 space-y-1 list-disc list-inside">
                {result.key_points.slice(0, 6).map((kp, i) => (
                  <li key={i} className="text-xs text-text-muted truncate">{kp}</li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="px-6 pb-5 pt-3 border-t border-white/[0.05] flex flex-wrap items-center justify-between gap-3">
          <label
            className={cn(
              'flex items-center gap-2 text-xs',
              suggestedValid ? 'text-text-secondary cursor-pointer' : 'text-text-muted/60'
            )}
          >
            <input
              type="checkbox"
              checked={applySuggested}
              disabled={!suggestedValid}
              onChange={(e) => setApplySuggested(e.target.checked)}
              data-testid="apply-suggested-category"
              className="accent-[#ff6a2a]"
            />
            {suggestedValid
              ? `Apply suggested category: “${result.suggested_category_name}”`
              : 'No confident category suggestion'}
          </label>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => onKeepOriginal(chosenCategoryId)} data-testid="keep-original">
              Keep Original
            </Button>
            <Button variant="secondary" size="sm" onClick={() => onEditOrganized(chosenCategoryId)} data-testid="edit-organized">
              Edit Before Saving
            </Button>
            <Button variant="primary" size="sm" onClick={() => onUseOrganized(chosenCategoryId)} data-testid="use-organized">
              Use Organized &amp; Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const IdeaAiVoiceErrorModal: React.FC<{
  message: string;
  transcript: string;
  onClose: () => void;
  onSaveOriginal: () => void;
}> = ({ message, transcript, onClose, onSaveOriginal }) => (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/65 backdrop-blur-[6px]" onClick={onClose} />
    <div
      className="relative z-10 w-full max-w-[520px] rounded-3xl bg-gradient-to-b from-[rgba(26,29,37,0.94)] to-[rgba(9,11,15,0.97)] backdrop-blur-[40px] border border-red-400/25 shadow-[0_32px_80px_rgba(0,0,0,0.66)] p-6"
      data-testid="ai-voice-error-modal"
    >
      <h3 className="text-sm font-bold text-red-300 mb-2">AI organization failed</h3>
      <p className="text-xs text-text-muted mb-4">{message}</p>
      {transcript && (
        <p className="text-xs text-text-secondary bg-black/30 rounded-xl p-3 mb-4 max-h-[140px] overflow-auto whitespace-pre-wrap">
          {transcript}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onClose}>
          Discard
        </Button>
        <Button variant="primary" size="sm" onClick={onSaveOriginal} data-testid="save-original-transcript">
          Save Original Transcript
        </Button>
      </div>
    </div>
  </div>
);
