// ============================================================
// MODULE 10 — IDEA ASSISTANT PANEL
// ============================================================
// The scoped chat for ONE Idea. Discussion stays conversational;
// edits arrive as structured proposals that must be approved before
// the ActionPolicy executes them against this idea only.
// Voice input feeds the SAME composer as typing (§10).
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import { useIdeaAssistant } from '../../hooks/useIdeaAssistant';
import { useVoiceInput } from '../../hooks/useVoiceInput';
import { AIMessage, AIActionProposalPayload } from '../../types/ai.types';
import { Mic, MicOff, Send, Check, X, Loader2, AlertTriangle, Sparkles } from 'lucide-react';
import { cn } from '../../utils/cn';

interface IdeaAssistantPanelProps {
  ideaId: string;
  /** Bumped after a successful AI edit so the canvas can reload. */
  onIdeaEdited?: () => void;
}

const EDIT_TOOL_LABELS: Record<string, string> = {
  updateIdeaTitle: 'Rename Idea',
  appendToIdea: 'Append to Idea',
  insertIntoIdea: 'Insert into Idea',
  replaceIdeaSection: 'Replace Section',
  removeIdeaSection: 'Remove Section',
  reorderIdeaSection: 'Reorder Section',
  renameIdeaSection: 'Rename Section',
  createIdeaSection: 'Create Section',
  rewriteIdeaContent: 'Rewrite Content',
};

function ProposalSummary({ proposal }: { proposal: AIActionProposalPayload }) {
  const entries = Object.entries(proposal.parameters).filter(
    ([k]) => k !== 'idea_id'
  );
  return (
    <div className="mt-2 rounded-lg border border-[#ff8a4a]/25 bg-black/40 p-3 text-xs space-y-1.5">
      <p className="font-mono uppercase tracking-wider text-[#ffb27a]">
        {EDIT_TOOL_LABELS[proposal.tool_name] || proposal.tool_name}
      </p>
      <ul className="space-y-1 text-text-secondary">
        {entries.map(([key, value]) => (
          <li key={key} className="flex gap-2">
            <span className="font-mono text-text-muted shrink-0">{key}:</span>
            <span className="whitespace-pre-wrap break-all line-clamp-4">
              {String(value ?? '')}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-[10px] text-text-muted font-mono pt-1">
        Target: this Idea only · previous state kept as revision
      </p>
    </div>
  );
}

export const IdeaAssistantPanel: React.FC<IdeaAssistantPanelProps> = ({ ideaId, onIdeaEdited }) => {
  const {
    messages,
    loading,
    isProcessing,
    error,
    lastEditAt,
    sendMessage,
    approveAction,
    rejectAction,
  } = useIdeaAssistant(ideaId);

  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const voice = useVoiceInput((transcript) => {
    setDraft((prev) => (prev ? `${prev} ${transcript}` : transcript));
  });

  useEffect(() => {
    if (lastEditAt > 0) onIdeaEdited?.();
  }, [lastEditAt, onIdeaEdited]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length, isProcessing]);

  const handleSend = () => {
    const text = draft.trim();
    if (!text || isProcessing) return;
    setDraft('');
    sendMessage(text);
  };

  const pendingProposalOf = (msg: AIMessage) =>
    msg.role === 'assistant' &&
    msg.type === 'action_proposal' &&
    msg.action_payload &&
    (!msg.action_status || msg.action_status === 'pending')
      ? msg.action_payload
      : null;

  return (
    <div className="flex flex-col h-full rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl overflow-hidden" data-testid="idea-assistant-panel">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
        <Sparkles className="w-4 h-4 text-[#ffb27a]" />
        <div>
          <p className="text-sm font-semibold text-[#fff4ec]">Idea Assistant</p>
          <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted">
            Scoped to this idea · edits need approval
          </p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[240px] max-h-[520px]" data-testid="idea-chat-messages">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-text-muted text-sm gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading conversation…
          </div>
        ) : messages.length === 0 ? (
          <div className="py-10 text-center text-sm text-text-muted space-y-1" data-testid="idea-chat-empty">
            <p>Ask questions, request suggestions, or describe an exact edit.</p>
            <p className="text-xs">Discussion never changes your Idea — edits always wait for your approval.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const proposal = pendingProposalOf(msg);
            return (
              <div
                key={msg.id}
                className={cn(
                  'rounded-lg px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words',
                  msg.role === 'user'
                    ? 'ml-8 bg-[#ff6a2a]/12 border border-[#ff8a4a]/25 text-[#ffe9dc]'
                    : 'mr-4 bg-white/[0.05] border border-white/[0.07] text-text-secondary'
                )}
              >
                <div>{msg.content}</div>
                {proposal && (
                  <div data-testid="idea-proposal-card">
                    <ProposalSummary proposal={proposal} />
                    <div className="flex items-center gap-2 mt-2.5">
                      <button
                        onClick={() => approveAction(msg.id, proposal)}
                        disabled={isProcessing}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/25 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" /> Apply Edit
                      </button>
                      <button
                        onClick={() => rejectAction(msg.id)}
                        disabled={isProcessing}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.1] text-text-muted text-xs hover:text-text-primary transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
        {isProcessing && (
          <div className="flex items-center gap-2 text-text-muted text-xs px-1" data-testid="idea-chat-processing">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking…
          </div>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-4 mb-2 flex items-start gap-2 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200" data-testid="idea-chat-error">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Composer */}
      <div className="border-t border-white/[0.06] p-3">
        {voice.isListening && (
          <p className="mb-2 text-[11px] font-mono text-[#ffb27a]" data-testid="voice-interim">
            ● Listening{voice.interimTranscript ? `: ${voice.interimTranscript}` : '…'}
          </p>
        )}
        {voice.error && <p className="mb-2 text-[11px] text-rose-300">{voice.error}</p>}
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={2}
            placeholder="Discuss or instruct… (e.g. add “…” to the end / what do you think?)"
            className="flex-1 resize-none bg-black/50 border border-white/[0.09] focus:border-[#ff8a4a]/45 rounded-lg px-3 py-2 text-sm text-text-primary outline-none"
            data-testid="idea-composer-input"
          />
          <div className="flex flex-col gap-1.5">
            <button
              onClick={voice.toggleListening}
              title={voice.isListening ? 'Stop voice input' : 'Start voice input'}
              className={cn(
                'p-2 rounded-lg border transition-colors cursor-pointer',
                voice.isListening
                  ? 'bg-rose-500/20 border-rose-400/40 text-rose-300 animate-pulse'
                  : 'bg-white/[0.05] border-white/[0.09] text-text-muted hover:text-[#ffb27a]'
              )}
              data-testid="voice-mic-button"
            >
              {voice.isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <button
              onClick={handleSend}
              disabled={!draft.trim() || isProcessing}
              className="p-2 rounded-lg bg-[#ff6a2a]/90 text-white disabled:opacity-40 hover:bg-[#ff7d47] transition-colors cursor-pointer"
              title="Send"
              data-testid="idea-send-button"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
        {!voice.isSupported && (
          <p className="mt-1.5 text-[10px] text-text-muted">Voice input is not supported in this browser.</p>
        )}
      </div>
    </div>
  );
};
