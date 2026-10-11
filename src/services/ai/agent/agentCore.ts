import { IAIProvider } from '../providers/IAIProvider';
import { DevelopmentMockProvider } from '../providers/DevelopmentMockProvider';
import { OpenRouterProvider } from '../providers/OpenRouterProvider';
import { ContextRouter } from './contextRouter';
import { ContextBuilder } from './contextBuilder';
import { ActionPolicy } from './actionPolicy';
import { ConversationTitleService } from '../conversations/conversationTitleService';
import { ConversationClassificationService } from '../conversations/conversationClassificationService';
import { AI_TOOL_DEFINITIONS } from '../tools/toolRegistry';
import {
  AIMessage,
  AIActionProposalPayload,
  AISettings,
} from '../../../types/ai.types';
import { AIToolResult, IToolExecutionContext } from '../../../types/aiTool.types';
import { APP_CONFIG } from '../../../config/app.config';
import { providerResolver } from '../providerResolver';
import { AIProviderConnection } from '../../../types/aiProvider.types';

export class PersonalAgentCore {
  private provider: IAIProvider;

  constructor(provider?: IAIProvider) {
    this.provider = provider || new DevelopmentMockProvider();
  }

  setProvider(provider: IAIProvider) {
    this.provider = provider;
  }

  getProvider(): IAIProvider {
    return this.provider;
  }

  /**
   * Configures provider from active connection via resolver.
   * The agent must not read raw UI state directly.
   */
  async configureFromSettings(settings: AISettings, repositories?: any): Promise<void> {
    if (!repositories) {
      // Backward-compatible fallback when repositories are not available
      if (settings.provider === 'openrouter') {
        if (!(this.provider instanceof OpenRouterProvider)) {
          this.provider = new OpenRouterProvider(settings);
        } else {
          this.provider.updateSettings(settings);
        }
      } else {
        if (!(this.provider instanceof DevelopmentMockProvider)) {
          this.provider = new DevelopmentMockProvider();
        }
      }
      return;
    }

    try {
      const connection: AIProviderConnection | null = await repositories.aiRepo.getActiveProviderConnection(settings.user_id).catch(() => null);

      // Safety net: if the active connection is missing and the stored ID is set,
      // the ID is stale (was removed from local cache / backend). Clear it so
      // the runtime falls back to DevelopmentMock instead of silently using
      // a ghost connection.
      if (!connection && settings.active_connection_id) {
        await repositories.aiRepo.updateSettings({ active_connection_id: null }).catch(() => {});
      }

      const resolved = providerResolver.resolveById(connection, settings);
      this.provider = resolved;
    } catch {
      this.provider = new DevelopmentMockProvider();
    }
  }

  /**
   * Main turn handler: processes a user prompt, retrieves relevant context,
   * invokes the AI provider, and stores message history.
   */
  async processUserTurn(
    conversationId: string,
    userPrompt: string,
    historyMessages: AIMessage[],
    repositories: any,
    options?: { onChunk?: (partialText: string) => void; signal?: AbortSignal }
  ): Promise<AIMessage> {
    const ctx: IToolExecutionContext = {
      conversationId,
      userId: APP_CONFIG.defaultUserId,
      repositories,
    };

    // Load active settings
    const settings: AISettings = await repositories.aiRepo.getSettings().catch(() => null);
    if (settings) {
      await this.configureFromSettings(settings, repositories);
    }

    // 1. Save user message to durable storage
    await repositories.aiRepo.addMessage(
      conversationId,
      'user',
      userPrompt,
      'answer'
    );

    // 2. Metadata automation on Turn 1 (Title + Category)
    const existingConv = await repositories.aiRepo.getConversation(conversationId);
    if (existingConv && (!existingConv.title || existingConv.title === 'New Conversation' || existingConv.title === 'Untitled Session')) {
      const generatedTitle = ConversationTitleService.generateTitleFromPrompt(userPrompt);
      const generatedCategory = ConversationClassificationService.classify(userPrompt);

      await repositories.aiRepo.updateConversation(conversationId, {
        title: generatedTitle,
        category: existingConv.category === 'general' ? generatedCategory : existingConv.category,
        provider: settings?.provider || 'openrouter',
        model: settings?.selected_model,
      }).catch(console.error);
    }

    // 3. Fetch known Life Area names for router keyword matching
    const lifeAreas = await repositories.visionRepo.getLifeAreas().catch(() => []);
    const areaNames = lifeAreas.map((la: any) => la.name);

    // 4. Route Context
    const route = ContextRouter.route(userPrompt, areaNames);

    // 5. Build Bounded Context Payload with active settings
    const contextPayload = await ContextBuilder.buildContext(route, ctx, settings);

    // 6. Invoke Pluggable AI Provider
    let providerResponse: any;
    let requestError: string | undefined;

    try {
      providerResponse = await this.provider.generateResponse({
        messages: [...historyMessages, {
          id: 'current-turn',
          conversation_id: conversationId,
          role: 'user',
          content: userPrompt,
          type: 'answer',
          created_at: new Date().toISOString(),
        }],
        contextSummary: contextPayload.summary,
        relevantStructuredData: contextPayload.rawStructuredData,
        relevantMemories: contextPayload.relevantMemories,
        availableTools: AI_TOOL_DEFINITIONS,
      }, options);
    } catch (err: any) {
      requestError = err.message || 'AI request failed';
      // Record failed request in real usage logs
      await repositories.aiRepo.logRequest({
        conversation_id: conversationId,
        timestamp: new Date().toISOString(),
        provider: settings?.provider || 'openrouter',
        model: settings?.selected_model || 'unknown',
        latency_ms: 0,
        status: 'failed',
        error_message: requestError,
        fallback_used: false,
      }).catch(console.error);

      throw err;
    }

    // 7. Record successful request log with measured tokens and latency
    await repositories.aiRepo.logRequest({
      conversation_id: conversationId,
      timestamp: new Date().toISOString(),
      provider: settings?.provider || 'openrouter',
      model: providerResponse.model_used || settings?.selected_model || 'unknown',
      input_tokens: providerResponse.usage?.input_tokens,
      output_tokens: providerResponse.usage?.output_tokens,
      total_tokens: providerResponse.usage?.total_tokens,
      latency_ms: providerResponse.latency_ms || 0,
      status: 'success',
      fallback_used: !!providerResponse.fallback_used,
      fallback_model: providerResponse.fallback_model,
      estimated_cost: providerResponse.estimated_cost,
    }).catch(console.error);

    // 8. Persist and return Assistant response with metadata
    const assistantMessage = await repositories.aiRepo.addMessage(
      conversationId,
      'assistant',
      providerResponse.content,
      providerResponse.type,
      providerResponse.sourcesUsed || contextPayload.sourcesUsed,
      providerResponse.actionProposal,
      {
        model_used: providerResponse.model_used || settings?.selected_model,
        provider_used: settings?.provider,
        input_tokens: providerResponse.usage?.input_tokens,
        output_tokens: providerResponse.usage?.output_tokens,
        total_tokens: providerResponse.usage?.total_tokens,
        latency_ms: providerResponse.latency_ms,
        fallback_used: providerResponse.fallback_used,
        fallback_model: providerResponse.fallback_model,
        estimated_cost: providerResponse.estimated_cost,
      }
    );

    return assistantMessage;
  }

  /**
   * Executes a user-confirmed action proposal.
   */
  async executeApprovedAction(
    proposal: AIActionProposalPayload,
    repositories: any,
    conversationId?: string
  ): Promise<AIToolResult> {
    const ctx: IToolExecutionContext = {
      conversationId,
      userId: APP_CONFIG.defaultUserId,
      repositories,
    };

    return ActionPolicy.executeApprovedAction(proposal, ctx);
  }
}

// Global Agent Instance
export const personalAgentCore = new PersonalAgentCore();
