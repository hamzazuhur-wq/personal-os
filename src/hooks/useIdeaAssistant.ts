// ============================================================
// MODULE 10 — IDEA ASSISTANT HOOK
// ============================================================
// Mirrors useAIAgent but bound to ONE idea:
// - conversation resolved via aiRepo.getConversationByIdea (created on
//   demand with idea_id set) → chat history survives refreshes.
// - turns processed by ideaAgentCore (restricted tools, scoped context).
// - approved edits run through the shared ActionPolicy with the session-
//   fixed ideaId; after success the workspace idea is reloaded.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import {
  useAIRepo,
  useCaptureRepo,
  useIdeaRevisionRepo,
} from '../app/providers/RepositoryProvider';
import { ideaAgentCore } from '../services/ai/agent/ideaAgentCore';
import { AIMessage, AIActionProposalPayload } from '../types/ai.types';

export function useIdeaAssistant(ideaId: string | undefined) {
  const aiRepo = useAIRepo();
  const captureRepo = useCaptureRepo();
  const revisionRepo = useIdeaRevisionRepo();

  // The Idea agent physically cannot reach other domains: its repository
  // bundle only contains capture / revision / ai storage.
  const repositories = { captureRepo, ideaRevisionRepo: revisionRepo, aiRepo };

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastEditAt, setLastEditAt] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      if (!ideaId) return;
      try {
        setLoading(true);
        setError(null);
        let conv = await aiRepo.getConversationByIdea(ideaId);
        if (!conv) {
          conv = await aiRepo.createConversation({
            title: 'Idea Workspace',
            category: 'general',
            idea_id: ideaId,
          });
        }
        if (cancelled) return;
        setConversationId(conv.id);
        setMessages(await aiRepo.getMessages(conv.id));
      } catch (err) {
        console.error('Failed to init idea assistant:', err);
        setError('Unable to load the Idea chat.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    init();
    return () => {
      cancelled = true;
    };
  }, [aiRepo, ideaId]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || !conversationId || !ideaId || isProcessing) return;
    try {
      setIsProcessing(true);
      setError(null);

      const optimistic: AIMessage = {
        id: `opt-${Date.now()}`,
        conversation_id: conversationId,
        role: 'user',
        content: text,
        type: 'answer',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);

      await ideaAgentCore.processIdeaUserTurn({
        ideaId,
        conversationId,
        userPrompt: text,
        historyMessages: messages.filter((m) => !m.id.startsWith('opt-')),
        repositories,
      });

      setMessages(await aiRepo.getMessages(conversationId));
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('Idea AI turn failed:', err);
        setError(err.message || 'AI is currently unavailable. Your Idea is safe.');
      }
      if (conversationId) setMessages(await aiRepo.getMessages(conversationId));
    } finally {
      setIsProcessing(false);
    }
  }, [aiRepo, conversationId, ideaId, isProcessing, messages, repositories]);

  const approveAction = useCallback(async (messageId: string, proposal: AIActionProposalPayload) => {
    if (!conversationId || !ideaId) return;
    try {
      setIsProcessing(true);
      setError(null);
      const result = await ideaAgentCore.executeApprovedIdeaAction(
        proposal,
        repositories,
        conversationId,
        ideaId
      );

      if (result.success) {
        await aiRepo.updateMessageActionStatus(messageId, 'approved');
        await aiRepo.addMessage(
          conversationId,
          'assistant',
          `✅ Edit applied to your Idea: **${proposal.title}**. You can undo it from the workspace history.`,
          'action_result',
          ['Idea Edit Pipeline']
        );
        setLastEditAt(Date.now());
      } else {
        await aiRepo.updateMessageActionStatus(messageId, 'failed');
        await aiRepo.addMessage(
          conversationId,
          'assistant',
          `❌ The edit was not applied: ${result.error?.message || 'Unknown error'}. Your Idea is unchanged.`,
          'error',
          ['Idea Edit Pipeline']
        );
      }
      setMessages(await aiRepo.getMessages(conversationId));
    } catch (err: any) {
      console.error('Failed to execute idea action:', err);
      setError(err.message || 'The edit could not be applied. Your Idea is unchanged.');
    } finally {
      setIsProcessing(false);
    }
  }, [aiRepo, conversationId, ideaId, repositories]);

  const rejectAction = useCallback(async (messageId: string) => {
    if (!conversationId) return;
    try {
      await aiRepo.updateMessageActionStatus(messageId, 'rejected');
      await aiRepo.addMessage(
        conversationId,
        'assistant',
        'Edit rejected. Nothing was changed.',
        'action_result',
        ['User Decision']
      );
      setMessages(await aiRepo.getMessages(conversationId));
    } catch (err) {
      console.error('Failed to reject idea action:', err);
    }
  }, [aiRepo, conversationId]);

  return {
    conversationId,
    messages,
    loading,
    isProcessing,
    error,
    lastEditAt,
    sendMessage,
    approveAction,
    rejectAction,
  };
}
