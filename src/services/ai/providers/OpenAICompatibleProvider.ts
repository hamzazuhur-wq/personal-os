import {
  AIProviderRequest,
  AIProviderResponse,
  IAIProvider,
} from './IAIProvider';
import { AISettings, ModelCapabilityMeta } from '../../../types/ai.types';
import { AIToolDefinition } from '../../../types/aiTool.types';
import { generateId } from '../../../utils/idGenerator';
import { ProviderCapabilities } from '@/types/aiProvider.types';

export class OpenAICompatibleProvider implements IAIProvider {
  readonly id: string;
  readonly name: string;
  readonly isDevelopmentMock = false;

  private settings: AISettings;
  private capabilities: ProviderCapabilities;

  constructor(
    settings: AISettings,
    capabilities: ProviderCapabilities,
    id: string,
    name: string
  ) {
    this.settings = settings;
    this.capabilities = capabilities;
    this.id = id;
    this.name = name;
  }

  updateSettings(settings: AISettings) {
    this.settings = settings;
  }

  async generateResponse(
    request: AIProviderRequest,
    options?: { onChunk?: (partialText: string) => void; signal?: AbortSignal }
  ): Promise<AIProviderResponse> {
    const startTime = performance.now();
    const baseUrl = this.settings.endpoint.replace(/\/$/, '');
    const model = this.settings.selected_model || '';
    const endpoint = `${baseUrl}${this.capabilities.chatEndpoint || '/chat/completions'}`;

    const systemPrompt = this.buildSystemPrompt(request.contextSummary, request.relevantMemories);
    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...request.messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const canUseTools = this.capabilities.supportsTools && this.settings.action_policy !== 'read_only';
    let filteredTools: AIToolDefinition[] = [];
    if (canUseTools) {
      filteredTools = request.availableTools;
    }

    const openAITools = this.mapToolsToOpenAISchema(filteredTools);
    const canStream = this.capabilities.supportsStreaming && !!(this.settings.streaming && options?.onChunk);

    const requestBody: any = {
      model,
      messages: formattedMessages,
      temperature: this.settings.temperature ?? 0.3,
      max_tokens: this.settings.max_output_tokens ?? 1500,
      tools: openAITools.length > 0 ? openAITools : undefined,
      stream: canStream,
      stream_options: canStream ? { include_usage: true } : undefined,
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Provider-Connection': this.settings.active_connection_id || 'default',
      ...(this.settings.custom_headers || {}),
    };
    if (this.capabilities.authMethod === 'bearer' && this.settings.endpoint) {
      // API key is handled via custom_headers or injected by proxy
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: options?.signal,
    });

    if (!response.ok) {
      let errDetail = `HTTP ${response.status} ${response.statusText}`;
      try {
        const errJson = await response.json();
        if (errJson?.error?.message) errDetail = errJson.error.message;
      } catch {
        // ignore
      }
      throw new Error(`Provider error: ${errDetail}`);
    }

    if (canStream && response.body) {
      let accumulatedText = '';
      let toolCallAccumulator: any = null;
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
              if (data.usage) {
                // captured if needed
              }
              const delta = data.choices?.[0]?.delta;
              if (delta?.content) {
                accumulatedText += delta.content;
                options?.onChunk?.(accumulatedText);
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
              // partial json line
            }
          }
        }
      }

      const latencyMs = Math.round(performance.now() - startTime);
      const result = this.parseCompletionResult(accumulatedText, toolCallAccumulator, request);
      result.model_used = model;
      result.latency_ms = latencyMs;
      return result;
    }

    const data = await response.json();
    const latencyMs = Math.round(performance.now() - startTime);
    const choice = data.choices?.[0];
    const content = choice?.message?.content || '';
    const toolCall = choice?.message?.tool_calls?.[0];
    const parsedUsage = data.usage
      ? { input_tokens: data.usage.prompt_tokens, output_tokens: data.usage.completion_tokens, total_tokens: data.usage.total_tokens }
      : undefined;

    const result = this.parseCompletionResult(
      content,
      toolCall
        ? { id: toolCall.id || generateId(), name: toolCall.function?.name, arguments: toolCall.function?.arguments }
        : null,
      request
    );
    result.model_used = model;
    result.latency_ms = latencyMs;
    result.usage = parsedUsage;
    return result;
  }

  async getAvailableModels(): Promise<{ models: ModelCapabilityMeta[]; isLive: boolean; error?: string }> {
    // Generic OpenAI-compatible model discovery
    try {
      const baseUrl = this.settings.endpoint.replace(/\/$/, '');
      const modelsPath = this.capabilities.discoveryEndpoint || '/models';
      const modelsUrl = `${baseUrl}${modelsPath}`;
      const res = await fetch(modelsUrl, { headers: { Accept: 'application/json' } });
      if (!res.ok) return { models: [], isLive: false, error: `HTTP ${res.status}` };
      const json = await res.json();
      const data: any[] = Array.isArray(json?.data) ? json.data : [];
      const models: ModelCapabilityMeta[] = data
        .filter((m) => m && m.id && typeof m.id === 'string')
        .map((m) => ({
          id: m.id,
          name: m.name || m.id,
          provider: this.name,
          contextWindow: m.context_length || 128000,
          isFree: false,
          supportsTools: this.capabilities.supportsTools,
          supportsStructuredOutput: this.capabilities.supportsStructuredOutput,
          supportsStreaming: this.capabilities.supportsStreaming,
        }));
      return { models, isLive: true };
    } catch (err: any) {
      return { models: [], isLive: false, error: err.message };
    }
  }

  private buildSystemPrompt(contextSummary: string, relevantMemories: any[]): string {
    const memorySection = relevantMemories?.length > 0
      ? `\n### Confirmed User Preferences & Constraints:\n` + relevantMemories.map((m: any) => `- [${m.type.toUpperCase()}]: ${m.content}`).join('\n')
      : '';
    return `You are the Aura Leveling (AURA) AI Intelligence Layer.
You assist the user in managing their Strategic Vision, Goals, Development Levels, Skill Matrix, Active Projects, Tasks, and Daily Execution.

### BOUNDED APPLICATION CONTEXT:
${contextSummary}
${memorySection}

### OPERATING PRINCIPLES:
1. Ground answers strictly in the user's structured Personal OS data provided above.
2. If data is missing or incomplete, transparently state that rather than making up entities.
3. For write modifications, call the appropriate tool.
4. Keep answers concise, actionable, and structured with clear Markdown.
5. All write operations will be presented to the user for explicit confirmation before execution.`;
  }

  private mapToolsToOpenAISchema(tools: AIToolDefinition[]) {
    return tools.map((t) => {
      const properties: Record<string, any> = {};
      const required: string[] = [];
      t.parameters.forEach((p) => {
        properties[p.name] = { type: p.type, description: p.description, ...(p.enum ? { enum: p.enum } : {}) };
        if (p.required) required.push(p.name);
      });
      return {
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: { type: 'object', properties, required },
        },
      };
    });
  }

  private parseCompletionResult(
    content: string,
    toolCall: any,
    request: AIProviderRequest
  ): AIProviderResponse {
    let actionProposal;
    if (toolCall && toolCall.name) {
      let parsedArgs: Record<string, any> = {};
      try {
        parsedArgs = typeof toolCall.arguments === 'string' ? JSON.parse(toolCall.arguments) : toolCall.arguments || {};
      } catch {
        parsedArgs = {};
      }
      actionProposal = {
        id: generateId(),
        tool_name: toolCall.name,
        action_type: 'create_goal' as any,
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
      sourcesUsed: [this.name, ...(request.relevantMemories?.length ? [`Durable Memory (${request.relevantMemories.length})`] : [])],
    };
  }

  private generateActionTitle(toolName: string, params: any): string {
    if (params?.title) return `Create: ${params.title}`;
    if (params?.name) return `Skill: ${params.name}`;
    if (params?.content) return `Save Preference: ${params.content.slice(0, 40)}`;
    return `Action: ${toolName}`;
  }
}
