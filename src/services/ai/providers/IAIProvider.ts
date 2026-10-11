import {
  AIMessage,
  AIMessageType,
  AIActionProposalPayload,
  CreateAIMemoryDTO,
  ModelCapabilityMeta,
} from '../../../types/ai.types';
import { AIToolDefinition } from '../../../types/aiTool.types';

export interface AIProviderRequest {
  messages: AIMessage[];
  contextSummary: string;
  relevantStructuredData: Record<string, any>;
  relevantMemories: any[];
  availableTools: AIToolDefinition[];
}

export interface AIProviderResponse {
  content: string;
  type: AIMessageType;
  actionProposal?: AIActionProposalPayload;
  suggestedMemory?: CreateAIMemoryDTO;
  sourcesUsed?: string[];
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
  latency_ms?: number;
  fallback_used?: boolean;
  fallback_model?: string;
  model_used?: string;
  estimated_cost?: number;
}

/**
 * Pluggable AI Provider Abstraction.
 * Supported providers:
 * - DevelopmentMockProvider (Module 06 local development/testing)
 * - Remote LLM Providers (Gemini, OpenAI, Claude, Local LLM via backend proxy)
 */
export interface IAIProvider {
  id: string;
  name: string;
  isDevelopmentMock: boolean;
  generateResponse(
    request: AIProviderRequest,
    options?: { onChunk?: (partialText: string) => void; signal?: AbortSignal }
  ): Promise<AIProviderResponse>;
  getAvailableModels?(): Promise<{ models: ModelCapabilityMeta[]; isLive: boolean; error?: string }>;
}
