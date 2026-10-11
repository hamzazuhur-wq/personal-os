// ============================================================
// MODULE 11 PHASE 7 — RECOMMENDATION MOCK PROVIDER
// ============================================================

import {
  type IAIProvider,
  type AIProviderRequest,
  type AIProviderResponse,
} from './IAIProvider.js';

/**
 * Mock provider for Phase 7 testing.
 * Returns deterministic structured recommendations.
 */
export class RecommendationMockProvider implements IAIProvider {
  id = 'recommendation-mock';
  name = 'Recommendation Mock Provider';
  isDevelopmentMock = true;

  constructor(private readonly mockResponse?: string) {}

  async generateResponse(
    request: AIProviderRequest,
    _options?: { onChunk?: (partialText: string) => void; signal?: AbortSignal }
  ): Promise<AIProviderResponse> {
    // If custom mock response provided, use it
    if (this.mockResponse) {
      return {
        content: this.mockResponse,
        type: 'recommendation',
        usage: { total_tokens: 100 },
      };
    }

    // Default: extract signal type from user message
    const userMessage = request.messages.find((m) => m.role === 'user');
    const userContent = userMessage?.content || '';
    
    // Parse signal type
    const signalMatch = userContent.match(/Signal Type: (\w+)/);
    const signalType = signalMatch?.[1] || 'unknown';

    // Parse scope
    const scopeMatch = userContent.match(/Scope: (\w+) \(([^)]+)\)/);
    const scopeType = scopeMatch?.[1] || 'unknown';
    const scopeId = scopeMatch?.[2] || 'unknown';

    // Default structured response
    const response = {
      recommendation: {
        type: this.mapSignalToRecommendationType(signalType),
        title: `Take action on ${scopeType}`,
        description: `AI-generated recommendation for ${signalType}`,
        reason: `Based on evidence from candidate analysis`,
        confidence: 0.75,
        target: {
          type: this.mapScopeToTargetType(scopeType),
          id: scopeId,
        },
        suggestedActions: [],
        evidenceSources: [
          {
            type: 'candidate',
            description: 'Signal detection evidence',
          },
        ],
      },
    };

    return {
      content: JSON.stringify(response),
      type: 'recommendation',
      usage: { total_tokens: 100 },
    };
  }

  private mapSignalToRecommendationType(signalType: string): string {
    const mapping: Record<string, string> = {
      goal_inactive: 'next_action',
      goal_without_clear_next_action: 'next_action',
      goal_next_action: 'next_action',
      project_stalled: 'project_attention',
      project_next_action: 'next_action',
      skill_evidence_gap: 'learning_opportunity',
      life_area_attention: 'life_area_balance',
      execution_decline: 'next_action',
      learning_without_application: 'skill_application',
      completed_goal_followup: 'completion_followup',
      idea_opportunity: 'idea_integration',
    };
    return mapping[signalType] || 'exploration_prompt';
  }

  private mapScopeToTargetType(scopeType: string): string {
    const mapping: Record<string, string> = {
      goal: 'goal',
      project: 'project',
      skill: 'skill',
      life_area: 'life_area',
      idea: 'idea',
      global: 'global',
    };
    return mapping[scopeType] || 'global';
  }
}
