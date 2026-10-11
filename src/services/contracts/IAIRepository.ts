import {
  AIConversation,
  AIConversationGroup,
  AIMessage,
  AIMemory,
  AIAuditEvent,
  AISettings,
  AIRequestLog,
  AIUsagePeriodSummary,
  CreateAIMemoryDTO,
  CreateAIAuditEventDTO,
  CreateAIConversationGroupDTO,
  UpdateAIConversationGroupDTO,
  UpdateAISettingsDTO,
  CreateAIConversationDTO,
  UpdateAIConversationDTO,
  ConversationFilter,
  AIMemoryType,
  AIConversationCategory,
  AIMessageMetadata,
} from '../../types/ai.types';
import { AIProviderConnection, CreateAIProviderConnectionDTO, UpdateAIProviderConnectionDTO, ConnectionTestResult } from '../../types/aiProvider.types';

export interface IAIRepository {
  // ─── Conversations ─────────────────────────────────────────
  getConversations(filter?: ConversationFilter): Promise<AIConversation[]>;
  getConversation(id: string): Promise<AIConversation | null>;
  /** Module 10: the single active conversation scoped to an Idea (capture id). */
  getConversationByIdea(ideaId: string): Promise<AIConversation | null>;
  createConversation(dto?: CreateAIConversationDTO | string): Promise<AIConversation>;
  updateConversation(id: string, dto: UpdateAIConversationDTO): Promise<AIConversation>;
  updateConversationTitle(id: string, title: string): Promise<AIConversation>;
  setConversationCategory(id: string, category: AIConversationCategory): Promise<AIConversation>;
  setConversationGroup(id: string, groupId: string | null): Promise<AIConversation>;
  togglePinConversation(id: string): Promise<AIConversation>;
  archiveConversation(id: string): Promise<AIConversation>;
  restoreConversation(id: string): Promise<AIConversation>;

  // ─── Groups ────────────────────────────────────────────────
  getConversationGroups(includeArchived?: boolean): Promise<AIConversationGroup[]>;
  createConversationGroup(dto: CreateAIConversationGroupDTO): Promise<AIConversationGroup>;
  updateConversationGroup(id: string, dto: UpdateAIConversationGroupDTO): Promise<AIConversationGroup>;
  archiveConversationGroup(id: string): Promise<AIConversationGroup>;

  // ─── Messages ──────────────────────────────────────────────
  getMessages(conversationId: string): Promise<AIMessage[]>;
  addMessage(
    conversationId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    type?: AIMessage['type'],
    contextSources?: string[],
    actionPayload?: AIMessage['action_payload'],
    metadata?: AIMessageMetadata
  ): Promise<AIMessage>;
  updateMessageActionStatus(messageId: string, status: AIMessage['action_status']): Promise<AIMessage>;

  // ─── Memory ────────────────────────────────────────────────
  getMemories(type?: AIMemoryType | 'all', includeArchived?: boolean): Promise<AIMemory[]>;
  saveMemory(dto: CreateAIMemoryDTO): Promise<AIMemory>;
  archiveMemory(id: string): Promise<AIMemory>;
  deleteMemory(id: string): Promise<void>;

  // ─── Audit Log ─────────────────────────────────────────────
  getAuditEvents(conversationId?: string, limit?: number): Promise<AIAuditEvent[]>;
  logAuditEvent(dto: CreateAIAuditEventDTO): Promise<AIAuditEvent>;

  // ─── Settings ──────────────────────────────────────────────
  getSettings(): Promise<AISettings>;
  updateSettings(dto: UpdateAISettingsDTO): Promise<AISettings>;

  // ─── Real Usage & Request Logs ─────────────────────────────
  logRequest(log: Omit<AIRequestLog, 'id'>): Promise<AIRequestLog>;
  getRequestLogs(filter?: { period?: 'today' | 'this_week' | 'this_month' | 'all'; conversationId?: string }): Promise<AIRequestLog[]>;
  getUsageSummary(period: 'today' | 'this_week' | 'this_month' | 'all'): Promise<AIUsagePeriodSummary>;

  // ─── Provider Connections ──────────────────────────────────
  getProviderConnections(userId: string): Promise<AIProviderConnection[]>;
  getProviderConnection(id: string): Promise<AIProviderConnection | null>;
  getActiveProviderConnection(userId: string): Promise<AIProviderConnection | null>;
  createProviderConnection(dto: CreateAIProviderConnectionDTO, userId: string): Promise<AIProviderConnection>;
  updateProviderConnection(id: string, dto: UpdateAIProviderConnectionDTO): Promise<AIProviderConnection>;
  deleteProviderConnection(id: string): Promise<void>;
  setActiveProviderConnection(userId: string, connectionId: string): Promise<AISettings>;
  testProviderConnection(id: string): Promise<ConnectionTestResult>;
}
