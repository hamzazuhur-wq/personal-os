import React, { useState, useRef, useEffect } from 'react';
import {
  AIMessage,
  AIActionProposalPayload,
  AIConversation,
  AIConversationCategory,
  AISettings,
} from '../../../types/ai.types';
import { AIMessageItem } from './AIMessageItem';
import { AIModelIndicator } from './AIModelIndicator';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { Send, Sparkles, Loader2, Square, Edit2, Check, PanelRight, Bot } from 'lucide-react';
import { cn } from '../../../utils/cn';

export interface AIChatProps {
  conversation: AIConversation | null;
  messages: AIMessage[];
  isProcessing: boolean;
  streamingText?: string;
  settings: AISettings | null;
  onSendMessage: (text: string) => void;
  onStopGeneration?: () => void;
  onApproveAction: (messageId: string, proposal: AIActionProposalPayload) => void;
  onRejectAction: (messageId: string) => void;
  onUpdateTitle?: (title: string) => void;
  onUpdateCategory?: (category: AIConversationCategory) => void;
  onOpenSettings?: () => void;
  onToggleContextPanel?: () => void;
  isContextOpen?: boolean;
}

const QUICK_PROMPTS = [
  'What are my active goals?',
  'What is my current Professional Level?',
  'Which Projects are active?',
  'Why am I not progressing recently?',
  'Remember that I prefer weekly batch reviews',
];

const CATEGORY_OPTIONS: { value: AIConversationCategory; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'planning', label: 'Planning' },
  { value: 'goals', label: 'Goals' },
  { value: 'levels', label: 'Levels' },
  { value: 'skills', label: 'Skills' },
  { value: 'projects', label: 'Projects' },
  { value: 'analysis', label: 'Analysis' },
  { value: 'career', label: 'Career' },
  { value: 'personal', label: 'Personal' },
  { value: 'reflection', label: 'Reflection' },
];

export const AIChat: React.FC<AIChatProps> = ({
  conversation,
  messages,
  isProcessing,
  streamingText,
  settings,
  onSendMessage,
  onStopGeneration,
  onApproveAction,
  onRejectAction,
  onUpdateTitle,
  onUpdateCategory,
  onOpenSettings,
  onToggleContextPanel,
  isContextOpen = true,
}) => {
  const [input, setInput] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(conversation?.title || '');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTitleInput(conversation?.title || 'New Conversation');
  }, [conversation?.title]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText, isProcessing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleSaveTitle = () => {
    if (titleInput.trim() && onUpdateTitle) {
      onUpdateTitle(titleInput.trim());
    }
    setIsEditingTitle(false);
  };

  return (
    <div className="flex flex-col h-[760px] max-h-[85vh] rounded-3xl border border-white/[0.08] bg-black/40 backdrop-blur-3xl shadow-[0_24px_64px_rgba(0,0,0,0.6)] overflow-hidden">
      {/* ─── Chat Header ────────────────────────────────────────── */}
      <div className="px-5 py-3.5 border-b border-white/[0.08] bg-black/40 flex items-center justify-between gap-3 shrink-0">
        {/* Title & Category */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {isEditingTitle ? (
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                className="bg-black/60 border border-[#ff8a4a] text-xs text-[#fff4ec] rounded-lg px-2.5 py-1 outline-none w-full"
                autoFocus
              />
              <button
                onClick={handleSaveTitle}
                className="p-1 text-emerald-400 hover:text-emerald-300"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-xs sm:text-sm font-bold text-[#fff4ec] truncate">
                {conversation?.title || 'New Conversation'}
              </h2>
              <button
                onClick={() => setIsEditingTitle(true)}
                className="p-1 text-text-muted hover:text-text-primary transition-colors"
                title="Rename Conversation"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Category Dropdown */}
          <div className="hidden sm:block w-28">
            <Select
              size="sm"
              value={conversation?.category || 'general'}
              onChange={(val) => onUpdateCategory?.(val as AIConversationCategory)}
              options={CATEGORY_OPTIONS}
            />
          </div>
        </div>

        {/* Right Tools: Model Indicator + Context Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <AIModelIndicator settings={settings} onOpenSettings={onOpenSettings} />
          {onToggleContextPanel && (
            <button
              onClick={onToggleContextPanel}
              className={cn(
                'p-2 rounded-xl border text-xs font-mono transition-colors',
                isContextOpen
                  ? 'bg-[#ff6a2a]/15 border-[#ff8a4a]/30 text-[#fff4ec]'
                  : 'bg-white/[0.02] border-white/[0.06] text-text-muted hover:text-text-secondary'
              )}
              title="Toggle Context Panel"
            >
              <PanelRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ─── Messages Stream Area ──────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="p-3.5 rounded-2xl bg-gradient-to-b from-[#ff6a2a]/20 to-[#ff8a4a]/05 border border-[#ff8a4a]/30 text-[#ff8a4a]">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="space-y-1.5 max-w-md">
              <h3 className="text-base font-bold text-[#fff4ec]">Personal Intelligence Center</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Ask questions about your goals, evaluate level progression, review active projects, or record personal operating constraints.
              </p>
            </div>

            {/* Quick Prompt Chips */}
            <div className="flex items-center justify-center gap-2 flex-wrap max-w-lg pt-2">
              {QUICK_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => onSendMessage(prompt)}
                  className="text-xs font-mono px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-[#ff6a2a]/10 hover:border-[#ff8a4a]/30 border border-white/[0.06] text-text-secondary hover:text-[#fff4ec] transition-colors text-left"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <AIMessageItem
              key={msg.id}
              message={msg}
              onApproveAction={onApproveAction}
              onRejectAction={onRejectAction}
              isProcessing={isProcessing}
            />
          ))
        )}

        {/* Live Streaming Response Bubble */}
        {isProcessing && streamingText && (
          <div className="flex gap-3 sm:gap-4 select-text flex-row animate-in fade-in duration-150">
            <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center border shadow-sm mt-0.5 bg-gradient-to-b from-[#ff6a2a]/20 to-[#ff8a4a]/05 border-[#ff8a4a]/30 text-[#ff8a4a]">
              <Bot className="w-4 h-4 animate-pulse" />
            </div>
            <div className="space-y-2 max-w-[88%] sm:max-w-[80%] items-start text-left">
              <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl border backdrop-blur-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap bg-black/60 border-white/[0.08] text-[#fff4ec] rounded-tl-none shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                {streamingText}
                <span className="inline-block w-1.5 h-3.5 ml-1 bg-[#ff8a4a] animate-pulse align-middle" />
              </div>
            </div>
          </div>
        )}

        {/* Thinking Indicator */}
        {isProcessing && !streamingText && (
          <div className="flex items-center gap-3 text-text-muted text-xs font-mono pl-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#ff8a4a]" />
            <span>Analyzing Personal OS context...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ─── Input Form Bar ────────────────────────────────────── */}
      <div className="p-4 sm:p-5 border-t border-white/[0.08] bg-black/60 backdrop-blur-2xl">
        <form onSubmit={handleSubmit} className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Ask about goals, levels, projects, or say 'Remember that...'..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isProcessing}
            className="flex-1 bg-black/40 border border-white/[0.1] text-xs sm:text-sm text-text-primary rounded-2xl px-4 py-3 outline-none focus:border-[#ff8a4a] transition-colors placeholder:text-text-muted/50"
          />

          {isProcessing && onStopGeneration ? (
            <Button
              variant="danger"
              size="md"
              type="button"
              onClick={onStopGeneration}
              className="rounded-2xl px-4 gap-1.5 shrink-0"
              title="Stop Generation"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span className="hidden sm:inline">Stop</span>
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              type="submit"
              disabled={!input.trim() || isProcessing}
              className="rounded-2xl px-5 gap-2 shrink-0 shadow-[0_0_20px_rgba(255,106,42,0.25)] font-semibold"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </Button>
          )}
        </form>
      </div>
    </div>
  );
};
