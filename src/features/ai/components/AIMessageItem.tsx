import React, { useState } from 'react';
import { AIMessage, AIActionProposalPayload } from '../../../types/ai.types';
import { AIActionProposalCard } from './AIActionProposalCard';
import { Bot, User, ChevronDown, ChevronUp, Database, Sparkles, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '../../../utils/cn';

export interface AIMessageItemProps {
  message: AIMessage;
  onApproveAction: (messageId: string, proposal: AIActionProposalPayload) => void;
  onRejectAction: (messageId: string) => void;
  isProcessing?: boolean;
}

export const AIMessageItem: React.FC<AIMessageItemProps> = ({
  message,
  onApproveAction,
  onRejectAction,
  isProcessing = false,
}) => {
  const isUser = message.role === 'user';
  const [showSources, setShowSources] = useState(false);

  const meta = message.metadata;

  return (
    <div
      className={cn(
        'flex gap-3 sm:gap-4 select-text',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar Icon */}
      <div
        className={cn(
          'w-8 h-8 rounded-xl shrink-0 flex items-center justify-center border shadow-sm mt-0.5',
          isUser
            ? 'bg-white/[0.08] border-white/20 text-[#fff4ec]'
            : 'bg-gradient-to-b from-[#ff6a2a]/20 to-[#ff8a4a]/05 border-[#ff8a4a]/30 text-[#ff8a4a]'
        )}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Message Bubble Container */}
      <div
        className={cn(
          'space-y-2 max-w-[88%] sm:max-w-[80%]',
          isUser ? 'items-end text-right' : 'items-start text-left'
        )}
      >
        {/* Bubble */}
        <div
          className={cn(
            'p-4 sm:p-5 rounded-2xl sm:rounded-3xl border backdrop-blur-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap',
            isUser
              ? 'bg-gradient-to-r from-[#ff6a2a]/20 to-[#ff8a4a]/10 border-[#ff8a4a]/30 text-[#fff4ec] rounded-tr-none shadow-[0_4px_20px_rgba(255,106,42,0.1)]'
              : 'bg-black/60 border-white/[0.08] text-[#fff4ec] rounded-tl-none shadow-[0_8px_32px_rgba(0,0,0,0.4)]'
          )}
        >
          {message.content}

          {/* Action Proposal Card (if attached) */}
          {message.action_payload && (
            <AIActionProposalCard
              proposal={message.action_payload}
              status={message.action_status}
              onApprove={() => onApproveAction(message.id, message.action_payload!)}
              onReject={() => onRejectAction(message.id)}
              isProcessing={isProcessing}
            />
          )}
        </div>

        {/* Real Response Metadata Bar (Assistant Only) */}
        {!isUser && meta && (
          <div className="flex items-center gap-2 flex-wrap pl-1 text-[10px] font-mono text-text-muted">
            {meta.model_used && (
              <span className="flex items-center gap-1 text-[#ff8a4a]/90">
                <Sparkles className="w-2.5 h-2.5" />
                <span>{meta.model_used.split('/').pop()}</span>
              </span>
            )}

            {meta.fallback_used && (
              <span className="flex items-center gap-1 text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                <AlertTriangle className="w-2.5 h-2.5" />
                <span>Fallback: {meta.fallback_model?.split('/').pop()}</span>
              </span>
            )}

            {meta.total_tokens !== undefined ? (
              <span>• {meta.total_tokens} tokens ({meta.input_tokens || 0} in / {meta.output_tokens || 0} out)</span>
            ) : (
              <span>• Usage unavailable</span>
            )}

            {meta.latency_ms !== undefined && meta.latency_ms > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                <span>{meta.latency_ms}ms</span>
              </span>
            )}
          </div>
        )}

        {/* Transparency Sources Tag (Assistant Only) */}
        {!isUser && message.context_sources && message.context_sources.length > 0 && (
          <div className="pl-1">
            <button
              onClick={() => setShowSources((prev) => !prev)}
              className="inline-flex items-center gap-1.5 text-[11px] font-mono text-text-muted hover:text-text-secondary transition-colors"
            >
              <Database className="w-3 h-3 text-[#ff8a4a]/70" />
              <span>{message.context_sources.length} Context Sources</span>
              {showSources ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showSources && (
              <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                {message.context_sources.map((src, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.06] text-text-muted"
                  >
                    {src}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
