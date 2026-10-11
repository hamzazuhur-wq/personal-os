import { useState, useEffect, useCallback, useRef } from 'react';
import {
  useAIRepo,
  useVisionRepo,
  useGoalRepo,
  useLevelRepo,
  useSkillRepo,
  useProjectRepo,
  useTaskRepo,
  useActivityRepo,
  useWeeklyFocusRepo,
} from '../app/providers/RepositoryProvider';
import { personalAgentCore } from '../services/ai/agent/agentCore';
import {
  AIConversation,
  AIConversationGroup,
  AIMessage,
  AIActionProposalPayload,
  ConversationFilter,
  AIConversationCategory,
  CreateAIConversationGroupDTO,
  UpdateAIConversationGroupDTO,
} from '../types/ai.types';

export function useAIAgent(initialConversationId?: string) {
  const aiRepo = useAIRepo();
  const visionRepo = useVisionRepo();
  const goalRepo = useGoalRepo();
  const levelRepo = useLevelRepo();
  const skillRepo = useSkillRepo();
  const projectRepo = useProjectRepo();
  const taskRepo = useTaskRepo();
  const activityRepo = useActivityRepo();
  const weeklyFocusRepo = useWeeklyFocusRepo();

  const allRepositories = {
    aiRepo,
    visionRepo,
    goalRepo,
    levelRepo,
    skillRepo,
    projectRepo,
    taskRepo,
    activityRepo,
    weeklyFocusRepo,
  };

  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [groups, setGroups] = useState<AIConversationGroup[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(initialConversationId || null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [streamingText, setStreamingText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filter, setFilter] = useState<ConversationFilter>({ status: 'active' });

  const abortControllerRef = useRef<AbortController | null>(null);

  // Load groups list
  const loadGroups = useCallback(async () => {
    try {
      const list = await aiRepo.getConversationGroups();
      setGroups(list);
    } catch (err) {
      console.error('Failed to load AI conversation groups:', err);
    }
  }, [aiRepo]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  // Load conversations list
  const loadConversations = useCallback(async () => {
    try {
      const list = await aiRepo.getConversations(filter);
      setConversations(list);
      if (!activeConversationId && list.length > 0) {
        setActiveConversationId(list[0].id);
      } else if (!activeConversationId && list.length === 0 && (!filter.searchQuery && (!filter.category || filter.category === 'all'))) {
        // Create initial default conversation
        const created = await aiRepo.createConversation({ title: 'General Intelligence', category: 'general' });
        setConversations([created]);
        setActiveConversationId(created.id);
      }
    } catch (err) {
      console.error('Failed to load AI conversations:', err);
    }
  }, [aiRepo, activeConversationId, filter]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load messages for active conversation
  const loadMessages = useCallback(async () => {
    if (!activeConversationId) return;
    try {
      setLoading(true);
      const msgs = await aiRepo.getMessages(activeConversationId);
      setMessages(msgs);
    } catch (err) {
      console.error('Failed to load messages:', err);
      setError('Unable to load message history.');
    } finally {
      setLoading(false);
    }
  }, [aiRepo, activeConversationId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Create new conversation
  const createNewConversation = async (title?: string, category: AIConversationCategory = 'general', groupId?: string | null): Promise<string> => {
    const created = await aiRepo.createConversation({
      title: title || 'New Conversation',
      category,
      group_id: groupId,
    });
    setConversations((prev) => [created, ...prev]);
    setActiveConversationId(created.id);
    setMessages([]);
    return created.id;
  };

  // Update conversation title
  const updateConversationTitle = async (id: string, newTitle: string) => {
    const updated = await aiRepo.updateConversationTitle(id, newTitle);
    setConversations((prev) => prev.map((c) => (c.id === id ? updated : c)));
  };

  // Update conversation category
  const setConversationCategory = async (id: string, category: AIConversationCategory) => {
    const updated = await aiRepo.setConversationCategory(id, category);
    setConversations((prev) => prev.map((c) => (c.id === id ? updated : c)));
  };

  // Assign conversation to group
  const setConversationGroup = async (id: string, groupId: string | null) => {
    const updated = await aiRepo.setConversationGroup(id, groupId);
    setConversations((prev) => prev.map((c) => (c.id === id ? updated : c)));
  };

  // Toggle pin
  const togglePinConversation = async (id: string) => {
    await aiRepo.togglePinConversation(id);
    await loadConversations();
  };

  // Archive conversation
  const archiveConversation = async (id: string) => {
    await aiRepo.archiveConversation(id);
    if (activeConversationId === id) {
      const remaining = conversations.filter((c) => c.id !== id);
      setActiveConversationId(remaining.length > 0 ? remaining[0].id : null);
    }
    await loadConversations();
  };

  // Restore archived conversation
  const restoreConversation = async (id: string) => {
    await aiRepo.restoreConversation(id);
    await loadConversations();
  };

  // Group Management
  const createGroup = async (dto: CreateAIConversationGroupDTO) => {
    const created = await aiRepo.createConversationGroup(dto);
    setGroups((prev) => [...prev, created]);
    return created;
  };

  const updateGroup = async (id: string, dto: UpdateAIConversationGroupDTO) => {
    const updated = await aiRepo.updateConversationGroup(id, dto);
    setGroups((prev) => prev.map((g) => (g.id === id ? updated : g)));
    return updated;
  };

  const archiveGroup = async (id: string) => {
    await aiRepo.archiveConversationGroup(id);
    await loadGroups();
  };

  // Send a user turn with streaming
  const sendMessage = async (text: string) => {
    if (!text.trim() || !activeConversationId || isProcessing) return;

    try {
      setIsProcessing(true);
      setError(null);
      setStreamingText('');

      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Optimistically show user message
      const optimisticMsg: AIMessage = {
        id: `opt-${Date.now()}`,
        conversation_id: activeConversationId,
        role: 'user',
        content: text,
        type: 'answer',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticMsg]);

      // Process through Agent Core with streaming callback
      await personalAgentCore.processUserTurn(
        activeConversationId,
        text,
        messages,
        allRepositories,
        {
          onChunk: (chunkText) => {
            setStreamingText(chunkText);
          },
          signal: controller.signal,
        }
      );

      // Refresh full persistent messages & conversations (for auto-title updates)
      await loadMessages();
      await loadConversations();
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('AI turn processing failed:', err);
        setError(err.message || 'AI turn failed.');
        await loadMessages();
      }
    } finally {
      setIsProcessing(false);
      setStreamingText('');
      abortControllerRef.current = null;
    }
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsProcessing(false);
      setStreamingText('');
    }
  };

  // Approve an action proposal
  const approveAction = async (messageId: string, proposal: AIActionProposalPayload) => {
    if (!activeConversationId) return;
    try {
      setIsProcessing(true);
      const result = await personalAgentCore.executeApprovedAction(
        proposal,
        allRepositories,
        activeConversationId
      );

      if (result.success) {
        await aiRepo.updateMessageActionStatus(messageId, 'approved');
        await aiRepo.addMessage(
          activeConversationId,
          'assistant',
          `✅ Action executed successfully: **${proposal.title}**.`,
          'action_result',
          ['Action Execution Pipeline']
        );
      } else {
        await aiRepo.updateMessageActionStatus(messageId, 'failed');
        await aiRepo.addMessage(
          activeConversationId,
          'assistant',
          `❌ Failed to execute action: ${result.error?.message || 'Unknown error'}.`,
          'error',
          ['Action Execution Pipeline']
        );
      }

      await loadMessages();
    } catch (err: any) {
      console.error('Failed to execute action:', err);
      setError(err.message || 'Action execution failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Reject an action proposal
  const rejectAction = async (messageId: string) => {
    if (!activeConversationId) return;
    try {
      await aiRepo.updateMessageActionStatus(messageId, 'rejected');
      await aiRepo.addMessage(
        activeConversationId,
        'assistant',
        `Action cancelled by user. No modifications were made.`,
        'action_result',
        ['User Decision']
      );
      await loadMessages();
    } catch (err: any) {
      console.error('Failed to reject action:', err);
    }
  };

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;

  return {
    conversations,
    groups,
    activeConversation,
    activeConversationId,
    setActiveConversationId,
    messages,
    loading,
    isProcessing,
    streamingText,
    error,
    filter,
    setFilter,
    sendMessage,
    stopGeneration,
    approveAction,
    rejectAction,
    createNewConversation,
    updateConversationTitle,
    setConversationCategory,
    setConversationGroup,
    togglePinConversation,
    archiveConversation,
    restoreConversation,
    createGroup,
    updateGroup,
    archiveGroup,
    refreshMessages: loadMessages,
    refreshConversations: loadConversations,
  };
}
