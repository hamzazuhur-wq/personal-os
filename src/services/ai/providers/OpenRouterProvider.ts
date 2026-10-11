import {
  AIProviderRequest,
  AIProviderResponse,
  IAIProvider,
} from './IAIProvider';
import { AISettings, AIActionProposalPayload, ModelCapabilityMeta } from '../../../types/ai.types';
import { AIToolDefinition } from '../../../types/aiTool.types';
import { generateId } from '../../../utils/idGenerator';
import {
  calculateEstimatedCost,
  fetchLiveOpenRouterModels,
  supportsToolCalling,
  supportsStreaming,
} from '../settings/modelCatalog';

export interface OpenRouterStreamingCallbacks {
  onChunk: (partialText: string) => void;
  signal?: AbortSignal;
}

export class OpenRouterProvider implements IAIProvider {
  readonly id = 'openrouter-provider';
  readonly name = 'OpenRouter AI Provider';
  readonly isDevelopmentMock = false;

  private settings: AISettings;

  constructor(settings: AISettings) {
    this.settings = settings;
  }

  updateSettings(settings: AISettings) {
    this.settings = settings;
  }

  /**
   * Retrieves available models via the safe backend proxy endpoint (/api/ai/models).
   * The API key is NEVER exposed to the browser — it lives only in the server-side proxy.
   */
  async getAvailableModels(): Promise<{ models: ModelCapabilityMeta[]; isLive: boolean; error?: string }> {
    const res = await fetchLiveOpenRouterModels(this.settings.endpoint);
    return {
      models: res.models,
      isLive: res.isLive,
      error: res.isLive ? undefined : res.message,
    };
  }

  /**
   * Translates Personal OS tool definitions to standard OpenAI/OpenRouter function schema.
   */
  private mapToolsToOpenAISchema(tools: AIToolDefinition[]) {
    return tools.map((t) => {
      const properties: Record<string, any> = {};
      const required: string[] = [];

      t.parameters.forEach((p) => {
        properties[p.name] = {
          type: p.type,
          description: p.description,
          ...(p.enum ? { enum: p.enum } : {}),
        };
        if (p.required) required.push(p.name);
      });

      return {
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: {
            type: 'object',
            properties,
            required,
          },
        },
      };
    });
  }

  /**
   * Formulates the system prompt embedding the bounded Personal OS context and guidelines.
   */
  private buildSystemPrompt(contextSummary: string, relevantMemories: any[]): string {
    const memorySection = relevantMemories && relevantMemories.length > 0
      ? `\n### Confirmed User Preferences & Constraints:\n` +
        relevantMemories.map((m: any) => `- [${m.type.toUpperCase()}]: ${m.content}`).join('\n')
      : '';

    return `You are the Aura Leveling (AURA) AI Intelligence Layer.
You assist the user in managing their Strategic Vision, Goals, Development Levels, Skill Matrix, Active Projects, Tasks, and Daily Execution.

### BOUNDED APPLICATION CONTEXT:
${contextSummary}
${memorySection}

### OPERATING PRINCIPLES:
1. Ground answers strictly in the user's structured Personal OS data provided above.
2. If data is missing or incomplete, transparently state that rather than making up entities.
3. For write modifications (creating/updating/archiving goals, projects, skills, tasks, or saving durable preferences), call the appropriate tool.
4. Keep answers concise, actionable, and structured with clear Markdown.
5. All write operations will be presented to the user for explicit confirmation before execution.`;
  }

  /**
   * Main completion method.
   */
  async generateResponse(
    request: AIProviderRequest,
    streamingCallbacks?: OpenRouterStreamingCallbacks
  ): Promise<AIProviderResponse> {
    const startTime = performance.now();
    const model = this.settings.selected_model || 'meta-llama/llama-3.3-70b-instruct:free';
    const endpoint = this.settings.endpoint.endsWith('/')
      ? `${this.settings.endpoint}chat/completions`
      : this.settings.endpoint.includes('/chat/completions')
      ? this.settings.endpoint
      : `${this.settings.endpoint}/chat/completions`;

    const systemPrompt = this.buildSystemPrompt(
      request.contextSummary,
      request.relevantMemories
    );

    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...request.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    // Check model capabilities before sending — do not assume tools/streaming are always supported
    const canUseTools = supportsToolCalling(model);
    const canStream = supportsStreaming(model) && !!(this.settings.streaming && streamingCallbacks?.onChunk);

    // Filter tools based on policy AND model capability
    let filteredTools: AIToolDefinition[] = [];
    if (canUseTools) {
      filteredTools = this.settings.action_policy === 'read_only'
        ? request.availableTools.filter((t) => t.classification === 'read' || t.classification === 'analysis')
        : request.availableTools;
    }

    const openAITools = this.mapToolsToOpenAISchema(filteredTools);

    const requestBody: any = {
      model,
      messages: formattedMessages,
      temperature: this.settings.temperature ?? 0.3,
      max_tokens: this.settings.max_output_tokens ?? 1500,
      tools: openAITools.length > 0 ? openAITools : undefined,
      stream: canStream,
      stream_options: canStream ? { include_usage: true } : undefined,
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Provider-Connection': this.settings.active_connection_id || 'default',
          ...(this.settings.custom_headers || {}),
        },
        body: JSON.stringify(requestBody),
        signal: streamingCallbacks?.signal,
      });

      if (!response.ok) {
        let errDetail = `HTTP ${response.status} ${response.statusText}`;
        try {
          const errJson = await response.json();
          if (errJson?.error?.message) {
            errDetail = errJson.error.message;
          }
        } catch {
          // ignore
        }

        if (response.status === 429) {
          throw new Error(`OpenRouter rate limit reached: ${errDetail}. Please retry in a moment.`);
        }
        if (response.status === 401 || response.status === 403) {
          throw new Error(`Authentication error: Ensure OPENROUTER_API_KEY is configured in backend environment.`);
        }
        throw new Error(`OpenRouter API error: ${errDetail}`);
      }

      // Handle Streaming
      if (requestBody.stream && response.body) {
        let accumulatedText = '';
        let toolCallAccumulator: any = null;
        let streamedUsage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | undefined = undefined;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(':')) continue;
            if (trimmed === 'data: [DONE]') break;

            if (trimmed.startsWith('data: ')) {
              try {
                const data = JSON.parse(trimmed.slice(6));

                // Capture OpenRouter streaming usage chunk if present
                if (data.usage) {
                  streamedUsage = {
                    prompt_tokens: data.usage.prompt_tokens,
                    completion_tokens: data.usage.completion_tokens,
                    total_tokens: data.usage.total_tokens,
                  };
                }

                const delta = data.choices?.[0]?.delta;

                if (delta?.content) {
                  accumulatedText += delta.content;
                  streamingCallbacks?.onChunk(accumulatedText);
                }

                if (delta?.tool_calls && delta.tool_calls.length > 0) {
                  const tc = delta.tool_calls[0];
                  if (!toolCallAccumulator) {
                    toolCallAccumulator = {
                      id: tc.id || generateId(),
                      name: tc.function?.name || '',
                      arguments: tc.function?.arguments || '',
                    };
                  } else {
                    if (tc.function?.name) toolCallAccumulator.name += tc.function.name;
                    if (tc.function?.arguments) toolCallAccumulator.arguments += tc.function.arguments;
                  }
                }
              } catch {
                // partial json line, continue
              }
            }
          }
        }

        const latencyMs = Math.round(performance.now() - startTime);
        const parsedUsage = streamedUsage ? {
          input_tokens: streamedUsage.prompt_tokens,
          output_tokens: streamedUsage.completion_tokens,
          total_tokens: streamedUsage.total_tokens,
        } : undefined;

        const result = this.parseCompletionResult(accumulatedText, toolCallAccumulator, request);
        result.model_used = model;
        result.latency_ms = latencyMs;
        result.usage = parsedUsage;
        // calculateEstimatedCost returns null when pricing unknown, undefined goes in metadata
        const streamedCost = calculateEstimatedCost(model, parsedUsage?.input_tokens, parsedUsage?.output_tokens);
        result.estimated_cost = streamedCost !== null ? streamedCost : undefined;
        return result;
      }

      // Handle Standard Non-Streaming JSON Response
      const data = await response.json();
      const latencyMs = Math.round(performance.now() - startTime);
      const choice = data.choices?.[0];
      const content = choice?.message?.content || '';
      const toolCall = choice?.message?.tool_calls?.[0];

      const rawUsage = data.usage;
      const parsedUsage = rawUsage ? {
        input_tokens: rawUsage.prompt_tokens,
        output_tokens: rawUsage.completion_tokens,
        total_tokens: rawUsage.total_tokens,
      } : undefined;

      const result = this.parseCompletionResult(
        content,
        toolCall
          ? {
              id: toolCall.id || generateId(),
              name: toolCall.function?.name,
              arguments: toolCall.function?.arguments,
            }
          : null,
        request
      );

      result.model_used = model;
      result.latency_ms = latencyMs;
      result.usage = parsedUsage;
      // calculateEstimatedCost returns null when pricing unknown, undefined goes in metadata
      const nonStreamCost = calculateEstimatedCost(model, parsedUsage?.input_tokens, parsedUsage?.output_tokens);
      result.estimated_cost = nonStreamCost !== null ? nonStreamCost : undefined;

      return result;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw err;
      }

      // Fallback Model invocation if enabled and this wasn't already the fallback
      if (
        this.settings.fallback_enabled &&
        this.settings.fallback_model &&
        this.settings.selected_model !== this.settings.fallback_model
      ) {
        console.warn(`Primary model ${model} failed, attempting fallback to ${this.settings.fallback_model}:`, err.message);
        const originalModel = this.settings.selected_model;
        this.settings.selected_model = this.settings.fallback_model;
        try {
          const fallbackResponse = await this.generateResponse(request, streamingCallbacks);
          fallbackResponse.fallback_used = true;
          fallbackResponse.fallback_model = this.settings.fallback_model;
          fallbackResponse.sourcesUsed = [
            `Fallback: ${this.settings.fallback_model}`,
            ...(fallbackResponse.sourcesUsed || []),
          ];
          return fallbackResponse;
        } finally {
          this.settings.selected_model = originalModel;
        }
      }

      throw err;
    }
  }

  /**
   * Parses output text and tool calls into the strongly-typed AIProviderResponse.
   */
  private parseCompletionResult(
    content: string,
    toolCall: any,
    request: AIProviderRequest
  ): AIProviderResponse {
    let actionProposal: AIActionProposalPayload | undefined;

    if (toolCall && toolCall.name) {
      let parsedArgs: Record<string, any> = {};
      try {
        parsedArgs = typeof toolCall.arguments === 'string'
          ? JSON.parse(toolCall.arguments)
          : toolCall.arguments || {};
      } catch {
        parsedArgs = {};
      }

      actionProposal = {
        id: generateId(),
        tool_name: toolCall.name,
        action_type: this.mapToolNameToActionType(toolCall.name),
        title: this.generateActionTitle(toolCall.name, parsedArgs),
        description: `Execute action via ${toolCall.name}`,
        parameters: parsedArgs,
        confirmation_required: true,
      };
    }

    return {
      content: content || (actionProposal ? `I've prepared an action proposal for: **${actionProposal.title}**.` : ''),
      type: actionProposal ? 'action_proposal' : 'answer',
      actionProposal,
      sourcesUsed: ['OpenRouter Intelligence', ...(request.relevantMemories?.length ? [`Durable Memory (${request.relevantMemories.length})`] : [])],
    };
  }

  private mapToolNameToActionType(toolName: string): AIActionProposalPayload['action_type'] {
    const map: Record<string, AIActionProposalPayload['action_type']> = {
      createGoal: 'create_goal',
      updateGoal: 'update_goal',
      archiveGoal: 'archive_goal',
      createProject: 'create_project',
      updateProject: 'update_project',
      archiveProject: 'archive_project',
      createSkill: 'create_skill',
      updateSkillProficiency: 'update_skill_proficiency',
      createTask: 'create_task',
      completeTask: 'complete_task',
      logActivity: 'log_activity',
      saveMemory: 'save_memory',
      archiveMemory: 'archive_memory',
      // Module 10: scoped Idea edit operations
      updateIdeaTitle: 'update_idea_title',
      appendToIdea: 'append_to_idea',
      insertIntoIdea: 'insert_into_idea',
      replaceIdeaSection: 'replace_idea_section',
      removeIdeaSection: 'remove_idea_section',
      reorderIdeaSection: 'reorder_idea_section',
      renameIdeaSection: 'rename_idea_section',
      createIdeaSection: 'create_idea_section',
      rewriteIdeaContent: 'rewrite_idea_content',
    };
    return map[toolName] || 'create_goal';
  }

  private generateActionTitle(toolName: string, params: any): string {
    if (params?.title) return `Create: ${params.title}`;
    if (params?.name) return `Skill: ${params.name}`;
    if (params?.content) return `Save Preference: ${params.content.slice(0, 40)}`;
    return `Action: ${toolName}`;
  }
}
