import { posDexieDb } from './posDexieDb';
import { APP_CONFIG } from '../../../config/app.config';
import { generateId } from '../../../utils/idGenerator';
import { IAIRepository } from '../../contracts/IAIRepository';
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
} from '../../../types/ai.types';
import { AIProviderConnection, CreateAIProviderConnectionDTO, UpdateAIProviderConnectionDTO, ConnectionTestResult } from '../../../types/aiProvider.types';
import { getDefaultCapabilities } from '../../../services/ai/settings/providerRegistry';

export const DEFAULT_AI_SETTINGS: AISettings = {
  id: 'default',
  user_id: APP_CONFIG.defaultUserId,

  // A. Provider
  provider: 'openrouter',
  endpoint: '/api/ai',

  // B. Model
  model_mode: 'manual',
  selected_model: 'meta-llama/llama-3.3-70b-instruct:free',
  fallback_model: 'google/gemini-2.0-flash-001',
  fallback_enabled: true,

  // C. Routing
  routing_profile: 'balanced',

  // D. Generation
  temperature: 0.3,
  max_output_tokens: 1500,
  streaming: true,

  // E. Context
  auto_context: true,
  context_depth: 'standard',
  max_retrieved_records: 20,
  include_activities: true,
  include_archived_data: false,
  include_memories: true,

  // F. Memory
  memory_retrieval_enabled: true,
  memory_candidate_detection: true,
  always_require_confirmation: true,

  // G. Actions & Safety
  action_policy: 'ask_before_write',
  never_allow_destructive: true,

  // H. Privacy
  show_context_sources: true,
  show_context_summary: false,
  minimize_context: false,
  conversation_retention_days: 0,

  // I. Usage & Metrics
  total_requests: 0,
  failed_requests: 0,
  fallback_count: 0,

  updated_at: new Date().toISOString(),
};

export class DexieAIRepository implements IAIRepository {
  // ─── Conversations ─────────────────────────────────────────

  async getConversations(filter?: ConversationFilter): Promise<AIConversation[]> {
    let results = await posDexieDb.ai_conversations.toArray();

    const status = filter?.status ?? 'active';
    if (status !== 'all') {
      results = results.filter((c) => (c.status ?? 'active') === status);
    }

    if (filter?.category && filter.category !== 'all') {
      results = results.filter((c) => c.category === filter.category);
    }

    if (filter?.group_id !== undefined && filter.group_id !== 'all') {
      if (filter.group_id === 'none') {
        results = results.filter((c) => !c.group_id);
      } else {
        results = results.filter((c) => c.group_id === filter.group_id);
      }
    }

    if (filter?.pinned !== undefined) {
      results = results.filter((c) => !!c.pinned === filter.pinned);
    }

    if (filter?.searchQuery && filter.searchQuery.trim()) {
      const q = filter.searchQuery.toLowerCase().trim();
      results = results.filter((c) =>
        (c.title || '').toLowerCase().includes(q) ||
        (c.category || '').toLowerCase().includes(q)
      );
    }

    // Sort: Pinned first, then updated_at descending
    return results.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }

  async getConversation(id: string): Promise<AIConversation | null> {
    return (await posDexieDb.ai_conversations.get(id)) ?? null;
  }

  async getConversationByIdea(ideaId: string): Promise<AIConversation | null> {
    const rows = await posDexieDb.ai_conversations
      .where('idea_id')
      .equals(ideaId)
      .filter((c) => (c.status ?? 'active') === 'active')
      .toArray();
    if (rows.length === 0) return null;
    return rows.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];
  }

  async createConversation(dto?: CreateAIConversationDTO | string): Promise<AIConversation> {
    const now = new Date().toISOString();
    const title = typeof dto === 'string' ? dto : dto?.title || 'New Conversation';
    const category = typeof dto === 'object' && dto.category ? dto.category : 'general';

    const conv: AIConversation = {
      id: generateId(),
      user_id: APP_CONFIG.defaultUserId,
      title: title.trim(),
      category,
      group_id: typeof dto === 'object' ? dto.group_id ?? null : null,
      pinned: typeof dto === 'object' ? !!dto.pinned : false,
      status: 'active',
      provider: typeof dto === 'object' ? dto.provider : undefined,
      model: typeof dto === 'object' ? dto.model : undefined,
      message_count: 0,
      idea_id: typeof dto === 'object' ? (dto as { idea_id?: string | null }).idea_id ?? null : null,
      created_at: now,
      updated_at: now,
    };
    await posDexieDb.ai_conversations.add(conv);
    return conv;
  }

  async updateConversation(id: string, dto: UpdateAIConversationDTO): Promise<AIConversation> {
    const existing = await posDexieDb.ai_conversations.get(id);
    if (!existing) throw new Error(`Conversation ${id} not found`);
    const updated: AIConversation = {
      ...existing,
      ...dto,
      ...(dto.title ? { title: dto.title.trim() } : {}),
      updated_at: new Date().toISOString(),
    };
    await posDexieDb.ai_conversations.put(updated);
    return updated;
  }

  async updateConversationTitle(id: string, title: string): Promise<AIConversation> {
    return this.updateConversation(id, { title: title.trim() });
  }

  async setConversationCategory(id: string, category: AIConversationCategory): Promise<AIConversation> {
    return this.updateConversation(id, { category });
  }

  async setConversationGroup(id: string, groupId: string | null): Promise<AIConversation> {
    return this.updateConversation(id, { group_id: groupId });
  }

  async togglePinConversation(id: string): Promise<AIConversation> {
    const existing = await posDexieDb.ai_conversations.get(id);
    if (!existing) throw new Error(`Conversation ${id} not found`);
    return this.updateConversation(id, { pinned: !existing.pinned });
  }

  async archiveConversation(id: string): Promise<AIConversation> {
    return this.updateConversation(id, { status: 'archived' });
  }

  async restoreConversation(id: string): Promise<AIConversation> {
    return this.updateConversation(id, { status: 'active' });
  }

  // ─── Groups ────────────────────────────────────────────────

  async getConversationGroups(includeArchived?: boolean): Promise<AIConversationGroup[]> {
    let groups = await posDexieDb.ai_conversation_groups.toArray();
    if (!includeArchived) {
      groups = groups.filter((g) => (g.status ?? 'active') === 'active');
    }
    return groups.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }

  async createConversationGroup(dto: CreateAIConversationGroupDTO): Promise<AIConversationGroup> {
    const now = new Date().toISOString();
    const group: AIConversationGroup = {
      id: generateId(),
      user_id: APP_CONFIG.defaultUserId,
      name: dto.name.trim(),
      color: dto.color,
      sort_order: dto.sort_order ?? 0,
      status: dto.status ?? 'active',
      created_at: now,
      updated_at: now,
    };
    await posDexieDb.ai_conversation_groups.add(group);
    return group;
  }

  async updateConversationGroup(id: string, dto: UpdateAIConversationGroupDTO): Promise<AIConversationGroup> {
    const existing = await posDexieDb.ai_conversation_groups.get(id);
    if (!existing) throw new Error(`Group ${id} not found`);
    const updated: AIConversationGroup = {
      ...existing,
      ...dto,
      ...(dto.name ? { name: dto.name.trim() } : {}),
      updated_at: new Date().toISOString(),
    };
    await posDexieDb.ai_conversation_groups.put(updated);
    return updated;
  }

  async archiveConversationGroup(id: string): Promise<AIConversationGroup> {
    return this.updateConversationGroup(id, { status: 'archived' });
  }

  // ─── Messages ──────────────────────────────────────────────

  async getMessages(conversationId: string): Promise<AIMessage[]> {
    const msgs = await posDexieDb.ai_messages
      .where('conversation_id')
      .equals(conversationId)
      .sortBy('created_at');
    return msgs;
  }

  async addMessage(
    conversationId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    type: AIMessage['type'] = 'answer',
    contextSources?: string[],
    actionPayload?: AIMessage['action_payload'],
    metadata?: AIMessageMetadata
  ): Promise<AIMessage> {
    const now = new Date().toISOString();
    const msg: AIMessage = {
      id: generateId(),
      conversation_id: conversationId,
      role,
      content,
      type,
      context_sources: contextSources,
      action_payload: actionPayload,
      action_status: actionPayload ? 'pending' : undefined,
      metadata,
      created_at: now,
    };
    await posDexieDb.ai_messages.add(msg);

    // Update parent conversation timestamp and message count
    const conv = await posDexieDb.ai_conversations.get(conversationId);
    if (conv) {
      await posDexieDb.ai_conversations.update(conversationId, {
        updated_at: now,
        message_count: (conv.message_count ?? 0) + 1,
      });
    }

    return msg;
  }

  async updateMessageActionStatus(
    messageId: string,
    status: AIMessage['action_status']
  ): Promise<AIMessage> {
    const existing = await posDexieDb.ai_messages.get(messageId);
    if (!existing) throw new Error(`Message ${messageId} not found`);
    const updated: AIMessage = {
      ...existing,
      action_status: status,
    };
    await posDexieDb.ai_messages.put(updated);
    return updated;
  }

  // ─── Memory ────────────────────────────────────────────────

  async getMemories(type?: AIMemoryType | 'all', includeArchived?: boolean): Promise<AIMemory[]> {
    let list = await posDexieDb.ai_memories.toArray();

    if (!includeArchived) {
      list = list.filter((m) => (m.status ?? 'active') === 'active');
    }

    if (type && type !== 'all') {
      list = list.filter((m) => m.type === type);
    }

    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async saveMemory(dto: CreateAIMemoryDTO): Promise<AIMemory> {
    const now = new Date().toISOString();
    const memory: AIMemory = {
      id: generateId(),
      user_id: APP_CONFIG.defaultUserId,
      ...dto,
      status: dto.status || 'active',
      confidence: dto.confidence ?? 1.0,
      last_confirmed_at: now,
      created_at: now,
      updated_at: now,
    };
    await posDexieDb.ai_memories.add(memory);
    return memory;
  }

  async archiveMemory(id: string): Promise<AIMemory> {
    const existing = await posDexieDb.ai_memories.get(id);
    if (!existing) throw new Error(`Memory ${id} not found`);
    const now = new Date().toISOString();
    const updated: AIMemory = { ...existing, status: 'archived', updated_at: now };
    await posDexieDb.ai_memories.put(updated);
    return updated;
  }

  async deleteMemory(id: string): Promise<void> {
    await posDexieDb.ai_memories.delete(id);
  }

  // ─── Audit Log ─────────────────────────────────────────────

  async getAuditEvents(conversationId?: string, limit: number = 50): Promise<AIAuditEvent[]> {
    let query = posDexieDb.ai_audit_events.toCollection();
    if (conversationId) {
      query = posDexieDb.ai_audit_events.where('conversation_id').equals(conversationId);
    }
    const events = await query.sortBy('timestamp');
    return events.reverse().slice(0, limit);
  }

  async logAuditEvent(dto: CreateAIAuditEventDTO): Promise<AIAuditEvent> {
    const event: AIAuditEvent = {
      id: generateId(),
      ...dto,
      timestamp: new Date().toISOString(),
    };
    await posDexieDb.ai_audit_events.add(event);
    return event;
  }

  // ─── Settings ──────────────────────────────────────────────

  async getSettings(): Promise<AISettings> {
    const stored = await posDexieDb.ai_settings.get('default');
    if (!stored) {
      await posDexieDb.ai_settings.put(DEFAULT_AI_SETTINGS);
      return DEFAULT_AI_SETTINGS;
    }
    return {
      ...DEFAULT_AI_SETTINGS,
      ...stored,
    };
  }

  async updateSettings(dto: UpdateAISettingsDTO): Promise<AISettings> {
    const current = await this.getSettings();
    const updated: AISettings = {
      ...current,
      ...dto,
      updated_at: new Date().toISOString(),
    };
    await posDexieDb.ai_settings.put(updated);
    return updated;
  }

  // ─── Real Usage & Request Logs ─────────────────────────────

  async logRequest(log: Omit<AIRequestLog, 'id'>): Promise<AIRequestLog> {
    const record: AIRequestLog = {
      id: generateId(),
      ...log,
    };
    await posDexieDb.ai_request_logs.add(record);

    // Increment settings totals atomically
    const current = await this.getSettings();
    await this.updateSettings({
      total_requests: (current.total_requests || 0) + 1,
      failed_requests: log.status === 'failed' ? (current.failed_requests || 0) + 1 : current.failed_requests,
      fallback_count: log.fallback_used ? (current.fallback_count || 0) + 1 : current.fallback_count,
      last_used_provider: log.provider,
      last_used_model: log.model,
      last_connected_at: log.timestamp,
    });

    return record;
  }

  async getRequestLogs(filter?: { period?: 'today' | 'this_week' | 'this_month' | 'all'; conversationId?: string }): Promise<AIRequestLog[]> {
    let logs = await posDexieDb.ai_request_logs.toArray();

    if (filter?.conversationId) {
      logs = logs.filter((l) => l.conversation_id === filter.conversationId);
    }

    if (filter?.period && filter.period !== 'all') {
      const now = new Date();
      let startTime = 0;
      if (filter.period === 'today') {
        startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      } else if (filter.period === 'this_week') {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        startTime = today - 7 * 86400000;
      } else if (filter.period === 'this_month') {
        startTime = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      }
      logs = logs.filter((l) => new Date(l.timestamp).getTime() >= startTime);
    }

    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async getUsageSummary(period: 'today' | 'this_week' | 'this_month' | 'all' = 'today'): Promise<AIUsagePeriodSummary> {
    const logs = await this.getRequestLogs({ period });

    let successful_requests = 0;
    let failed_requests = 0;
    let fallback_requests = 0;
    let input_tokens = 0;
    let output_tokens = 0;
    let total_tokens = 0;
    let has_untracked_tokens = false;
    let total_cost = 0;
    let has_uncalculated_cost = false;

    for (const log of logs) {
      if (log.status === 'success') successful_requests++;
      if (log.status === 'failed') failed_requests++;
      if (log.fallback_used) fallback_requests++;

      if (typeof log.input_tokens === 'number') input_tokens += log.input_tokens;
      else has_untracked_tokens = true;

      if (typeof log.output_tokens === 'number') output_tokens += log.output_tokens;
      else has_untracked_tokens = true;

      if (typeof log.total_tokens === 'number') total_tokens += log.total_tokens;

      if (typeof log.estimated_cost === 'number') {
        total_cost += log.estimated_cost;
      } else if (log.status === 'success') {
        has_uncalculated_cost = true;
      }
    }

    return {
      period,
      total_requests: logs.length,
      successful_requests,
      failed_requests,
      fallback_requests,
      input_tokens,
      output_tokens,
      total_tokens,
      has_untracked_tokens,
      estimated_cost: has_uncalculated_cost && total_cost === 0 && logs.length > 0 ? null : total_cost,
      cost_unavailable: has_uncalculated_cost && total_cost === 0 && logs.length > 0,
    };
  }

  // ─── Provider Connections ──────────────────────────────────

  private static stripSecret(conn: AIProviderConnection): AIProviderConnection {
    return {
      ...conn,
      api_key: '',
      api_key_last_four: conn.api_key_last_four || (conn.api_key ? conn.api_key.slice(-4) : ''),
    };
  }

  async getProviderConnections(userId: string): Promise<AIProviderConnection[]> {
    const results = await posDexieDb.ai_provider_connections.where('user_id').equals(userId).toArray();
    return results.map(c => DexieAIRepository.stripSecret(c));
  }

  async getProviderConnection(id: string): Promise<AIProviderConnection | null> {
    const result = await posDexieDb.ai_provider_connections.get(id);
    return result ? DexieAIRepository.stripSecret(result) : null;
  }

  async getActiveProviderConnection(_userId: string): Promise<AIProviderConnection | null> {
    const settings = await this.getSettings();
    if (!settings.active_connection_id) return null;
    const result = await posDexieDb.ai_provider_connections.get(settings.active_connection_id);
    if (!result) {
      // Connection not in local cache — clear the stale settings reference
      // so the runtime does not keep retrying with a ghost ID.
      await this.updateSettings({ active_connection_id: undefined } as any).catch(() => {});
      return null;
    }
    return DexieAIRepository.stripSecret(result);
  }

  async createProviderConnection(dto: CreateAIProviderConnectionDTO, userId: string): Promise<AIProviderConnection> {
    const id = `conn-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const capabilities = dto.capabilities || getDefaultCapabilities(dto.provider_type);
    const connection: AIProviderConnection = {
      id,
      user_id: userId,
      name: dto.name,
      provider_type: dto.provider_type,
      base_url: dto.base_url,
      api_key: dto.api_key || '',
      api_key_last_four: dto.api_key ? dto.api_key.slice(-4) : undefined,
      enabled: dto.enabled ?? true,
      capabilities: capabilities as any,
      connection_status: 'not_tested',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await posDexieDb.ai_provider_connections.add(connection);
    return connection;
  }

  async updateProviderConnection(id: string, dto: UpdateAIProviderConnectionDTO): Promise<AIProviderConnection> {
    const existing = await posDexieDb.ai_provider_connections.get(id);
    if (!existing) throw new Error(`Provider connection ${id} not found`);

    const updated: AIProviderConnection = {
      ...existing,
      ...(dto as any),
      capabilities: { ...existing.capabilities, ...(dto.capabilities || {}) },
      updated_at: new Date().toISOString(),
    };

    if (dto.api_key !== undefined && dto.api_key !== existing.api_key && dto.api_key) {
      updated.api_key_last_four = dto.api_key.slice(-4);
    }

    await posDexieDb.ai_provider_connections.put(updated);
    return updated;
  }

  async deleteProviderConnection(id: string): Promise<void> {
    await posDexieDb.ai_provider_connections.delete(id);
  }

  async setActiveProviderConnection(userId: string, connectionId: string): Promise<AISettings> {
    const connection = await posDexieDb.ai_provider_connections.get(connectionId);
    if (!connection) throw new Error(`Provider connection ${connectionId} not found`);
    if (connection.user_id !== userId) throw new Error('Forbidden');

    const settings = await this.getSettings();
    await posDexieDb.ai_settings.update(settings.id, {
      active_connection_id: connectionId,
      provider: connection.provider_type as any,
      endpoint: connection.base_url,
      updated_at: new Date().toISOString(),
    });
    const updated = await posDexieDb.ai_settings.get(settings.id);
    if (!updated) throw new Error('Settings row not found after update');
    return updated;
  }

  async testProviderConnection(id: string): Promise<ConnectionTestResult> {
    const connection = await posDexieDb.ai_provider_connections.get(id);
    if (!connection) {
      return { success: false, status: 'configuration_error', latencyMs: 0, message: 'Connection not found' };
    }

    const start = performance.now();
    try {
      const baseUrl = connection.base_url.replace(/\/$/, '');
      const chatPath = connection.capabilities.chatEndpoint || '/chat/completions';
      const endpoint = `${baseUrl}${chatPath}`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (connection.capabilities.authMethod === 'bearer' && connection.api_key) {
        headers['Authorization'] = `Bearer ${connection.api_key}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'test',
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const latencyMs = Math.round(performance.now() - start);

      if (response.status === 401 || response.status === 403) {
        await this.updateProviderConnection(id, {
          connection_status: 'auth_failed',
          last_tested_at: new Date().toISOString(),
          last_tested_error: 'Authentication failed',
        });
        return { success: false, status: 'auth_failed', latencyMs, message: 'Authentication failed: invalid API key' };
      }

      if (!response.ok) {
        const errDetail = `HTTP ${response.status} ${response.statusText}`;
        await this.updateProviderConnection(id, {
          connection_status: 'endpoint_unavailable',
          last_tested_at: new Date().toISOString(),
          last_tested_error: errDetail,
        });
        return { success: false, status: 'endpoint_unavailable', latencyMs, message: `Endpoint unavailable: ${errDetail}` };
      }

      await this.updateProviderConnection(id, {
        connection_status: 'connected',
        last_tested_at: new Date().toISOString(),
        last_tested_error: undefined,
      });
      return { success: true, status: 'connected', latencyMs, message: `Connected to ${connection.name}` };
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - start);
      await this.updateProviderConnection(id, {
        connection_status: 'endpoint_unavailable',
        last_tested_at: new Date().toISOString(),
        last_tested_error: err.message,
      });
      return { success: false, status: 'endpoint_unavailable', latencyMs, message: `Connection unreachable: ${err.message}` };
    }
  }
}

