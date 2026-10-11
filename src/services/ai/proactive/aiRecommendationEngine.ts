// ============================================================
// MODULE 11 PHASE 7 — AI RECOMMENDATION ENGINE
// ============================================================

import { type IAIProvider, type AIProviderRequest } from '../providers/IAIProvider.js';
import { type ProactiveCandidate } from '../../../types/recommendation.types.js';
import { type RecommendationContext } from './recommendationContextBuilder.js';
import { type AIMessage } from '../../../types/ai.types.js';
import { generateId } from '../../../utils/idGenerator.js';

// ============================================================
// RECOMMENDATION ENGINE RESULT
// ============================================================

/**
 * Structured recommendation output from AI (not yet persisted).
 * Maps to existing AIRecommendation schema but without persistence fields.
 */
export interface RecommendationDraft {
  type: string; // RecommendationType
  title: string;
  description: string;
  reason: string;
  confidence: number;
  targetType?: string;
  targetId?: string;
  suggestedActions: Array<{
    toolName: string;
    parameters: Record<string, unknown>;
    label: string;
  }>;
  evidenceSources: string[];
}

export type RecommendationEngineResult =
  | { status: 'success'; draft: RecommendationDraft }
  | { status: 'no_recommendation'; reason: string }
  | { status: 'validation_error'; errors: string[] }
  | { status: 'provider_error'; error: string }
  | { status: 'timeout'; error: string };

// ============================================================
// RECOMMENDATION ENGINE OPTIONS
// ============================================================
export interface RecommendationEngineOptions {
  timeoutMs?: number; // Default: 30000
}

// ============================================================
// VALIDATION ERRORS
// ============================================================
interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ============================================================
// AI RECOMMENDATION ENGINE
// ============================================================
export class AIRecommendationEngine {
  constructor(
    private readonly provider: IAIProvider,
    private readonly options: RecommendationEngineOptions = {}
  ) {}

  /**
   * Generate a recommendation for a given candidate and context.
   * Returns a validated recommendation draft or error status.
   */
  async generateRecommendation(
    candidate: ProactiveCandidate,
    context: RecommendationContext
  ): Promise<RecommendationEngineResult> {
    const timeoutMs = this.options.timeoutMs ?? 30000;

    try {
      // Build messages in correct AIMessage format
      const conversationId = generateId();
      const systemMessage: AIMessage = {
        id: generateId(),
        conversation_id: conversationId,
        role: 'system',
        content: this.buildSystemPrompt(context),
        type: 'analysis', // System context setup
        created_at: new Date().toISOString(),
      };
      
      const userMessage: AIMessage = {
        id: generateId(),
        conversation_id: conversationId,
        role: 'user',
        content: this.buildPrompt(candidate, context),
        type: 'recommendation', // Requesting recommendation
        created_at: new Date().toISOString(),
      };

      // Call AI provider with proper contract
      const providerRequest: AIProviderRequest = {
        messages: [systemMessage, userMessage],
        contextSummary: `Generate recommendation for ${candidate.signalType}`,
        relevantStructuredData: {},
        relevantMemories: [],
        availableTools: [],
      };

      const response = await Promise.race([
        this.provider.generateResponse(providerRequest),
        this.timeoutPromise(timeoutMs),
      ]);

      if (response === 'TIMEOUT') {
        return {
          status: 'timeout',
          error: `AI provider timed out after ${timeoutMs}ms`,
        };
      }

      // Parse response
      const parsed = this.parseResponse(response.content);
      if (!parsed) {
        return {
          status: 'validation_error',
          errors: ['Failed to parse AI response as valid JSON'],
        };
      }

      // Handle no_recommendation
      if (parsed.recommendation?.type === 'no_recommendation') {
        return {
          status: 'no_recommendation',
          reason: parsed.recommendation.reason || 'AI determined candidate not meaningful',
        };
      }

      // Validate structure
      const validation = this.validateRecommendation(parsed.recommendation, candidate, context);
      if (!validation.valid) {
        return {
          status: 'validation_error',
          errors: validation.errors,
        };
      }

      // Build draft (not persisted)
      const draft: RecommendationDraft = {
        type: parsed.recommendation.type,
        title: parsed.recommendation.title,
        description: parsed.recommendation.description,
        reason: parsed.recommendation.reason,
        confidence: parsed.recommendation.confidence,
        targetType: parsed.recommendation.target?.type,
        targetId: parsed.recommendation.target?.id,
        suggestedActions: parsed.recommendation.suggestedActions.map((a: any) => ({
          toolName: a.toolName,
          parameters: a.parameters,
          label: a.rationale || a.toolName,
        })),
        evidenceSources: parsed.recommendation.evidenceSources.map((e: any) => e.description),
      };

      return {
        status: 'success',
        draft,
      };
    } catch (error) {
      return {
        status: 'provider_error',
        error: error instanceof Error ? error.message : 'Unknown provider error',
      };
    }
  }

  /**
   * Build system prompt with policies
   */
  private buildSystemPrompt(context: RecommendationContext): string {
    const parts: string[] = [];

    // Include all policies from context
    const policies = [
      context.policy.soul,
      context.policy.personalOsRules,
      context.policy.recommendationRules,
    ];
    if (context.policy.domainKnowledge) {
      policies.push(context.policy.domainKnowledge);
    }

    for (const policy of policies) {
      parts.push(`# ${policy.name}\n\n${policy.content}\n`);
    }

    // Add structured output instructions
    parts.push(`
# STRUCTURED OUTPUT FORMAT

You must respond with valid JSON matching this exact schema:

{
  "recommendation": {
    "type": "next_action" | "learning_opportunity" | "exploration_prompt" | "skill_application" | "goal_refinement" | "project_attention" | "life_area_balance" | "idea_integration" | "completion_followup" | "no_recommendation",
    "title": "Short, actionable title (max 80 chars)",
    "description": "Brief description (max 200 chars)",
    "reason": "Evidence-based explanation (max 300 chars)",
    "confidence": 0.0 - 1.0,
    "target": {
      "type": "goal" | "project" | "skill" | "life_area" | "idea" | "global",
      "id": "entity ID from context or 'global'"
    },
    "suggestedActions": [
      {
        "toolName": "allowed tool name from action allowlist",
        "parameters": {},
        "rationale": "why this action"
      }
    ],
    "evidenceSources": [
      {
        "type": "candidate" | "metric" | "relationship",
        "description": "what evidence supports this"
      }
    ]
  }
}

CRITICAL RULES:
1. Use ONLY recommendation types from the list above
2. Use ONLY actions from the ACTION ALLOWLIST in context
3. Reference ONLY entities present in the context
4. Base ALL claims on evidence from context
5. If candidate is not meaningful, use type: "no_recommendation"
6. Keep all text concise and actionable
7. Confidence must be between 0.0 and 1.0
8. NO destructive actions (delete, archive, remove)
9. NO invented facts, dates, or relationships
10. NO speculative claims
`);

    return parts.join('\n---\n\n');
  }

  /**
   * Build user prompt with candidate and context
   */
  private buildPrompt(candidate: ProactiveCandidate, context: RecommendationContext): string {
    return `
# RECOMMENDATION REQUEST

Signal Type: ${candidate.signalType}
Scope: ${candidate.scopeType} (${candidate.scopeId})
Severity: ${candidate.severity}

## Evidence
${JSON.stringify(candidate.evidence, null, 2)}

## Context
${JSON.stringify(context, null, 2)}

## Action Allowlist
${context.allowedActions.length > 0 ? context.allowedActions.join(', ') : 'None (informational only)'}

---

Analyze this candidate and generate ONE high-quality recommendation.

Consider:
- Is the evidence meaningful enough for a recommendation?
- What is the smallest useful next action?
- What learning opportunity exists?
- What should the user explore?

If the candidate is not sufficiently meaningful, return type: "no_recommendation".

Otherwise, provide a concise, evidence-based recommendation that respects the action allowlist and uses only information present in the context.
`;
  }

  /**
   * Parse AI response
   */
  private parseResponse(content: string): { recommendation: any } | null {
    try {
      const parsed = JSON.parse(content);
      if (parsed.recommendation && typeof parsed.recommendation === 'object') {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Validate recommendation structure and content
   */
  private validateRecommendation(
    rec: any,
    _candidate: ProactiveCandidate,
    context: RecommendationContext
  ): ValidationResult {
    const errors: string[] = [];

    if (!rec || typeof rec !== 'object') {
      errors.push('Recommendation must be an object');
      return { valid: false, errors };
    }

    // Validate type
    const validTypes = [
      'next_action',
      'learning_opportunity',
      'exploration_prompt',
      'skill_application',
      'goal_refinement',
      'project_attention',
      'life_area_balance',
      'idea_integration',
      'completion_followup',
      'no_recommendation',
    ];
    if (!validTypes.includes(rec.type)) {
      errors.push(`Invalid recommendation type: ${rec.type}`);
    }

    // Validate required fields
    if (typeof rec.title !== 'string' || rec.title.length === 0) {
      errors.push('Title is required');
    }
    if (typeof rec.description !== 'string' || rec.description.length === 0) {
      errors.push('Description is required');
    }
    if (typeof rec.reason !== 'string' || rec.reason.length === 0) {
      errors.push('Reason is required');
    }

    // Validate confidence
    if (typeof rec.confidence !== 'number') {
      errors.push('Confidence must be a number');
    } else if (rec.confidence < 0 || rec.confidence > 1) {
      errors.push(`Confidence must be between 0 and 1, got ${rec.confidence}`);
    }

    // Validate target
    if (!rec.target || typeof rec.target !== 'object') {
      errors.push('Target is required');
    } else {
      const validTargetTypes = [
        'goal',
        'project',
        'skill',
        'life_area',
        'idea',
        'global',
      ];
      if (!validTargetTypes.includes(rec.target.type)) {
        errors.push(`Invalid target type: ${rec.target.type}`);
      }
      if (typeof rec.target.id !== 'string' || rec.target.id.length === 0) {
        errors.push('Target ID is required');
      } else {
        // Validate target ID exists in context (unless global)
        if (rec.target.id !== 'global' && !this.targetExists(rec.target, context)) {
          errors.push(`Target entity not found in context: ${rec.target.type}/${rec.target.id}`);
        }
      }
    }

    // Validate suggestedActions
    if (!Array.isArray(rec.suggestedActions)) {
      errors.push('suggestedActions must be an array');
    } else {
      for (const action of rec.suggestedActions) {
        if (typeof action.toolName !== 'string') {
          errors.push('Action toolName must be a string');
        } else {
          // Check allowlist
          if (!context.allowedActions.includes(action.toolName)) {
            errors.push(`Action not in allowlist: ${action.toolName}`);
          }
          // Check for destructive actions
          if (this.isDestructiveAction(action.toolName)) {
            errors.push(`Destructive action not allowed: ${action.toolName}`);
          }
        }
        if (typeof action.parameters !== 'object' || action.parameters === null) {
          errors.push('Action parameters must be an object');
        }
        if (typeof action.rationale !== 'string') {
          errors.push('Action rationale must be a string');
        }
      }
    }

    // Validate evidenceSources
    if (!Array.isArray(rec.evidenceSources)) {
      errors.push('evidenceSources must be an array');
    } else if (rec.evidenceSources.length === 0) {
      errors.push('At least one evidence source is required');
    } else {
      for (const source of rec.evidenceSources) {
        const validSourceTypes = ['candidate', 'metric', 'relationship'];
        if (!validSourceTypes.includes(source.type)) {
          errors.push(`Invalid evidence source type: ${source.type}`);
        }
        if (typeof source.description !== 'string' || source.description.length === 0) {
          errors.push('Evidence source description is required');
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Check if target entity exists in context
   */
  private targetExists(
    target: { type: string; id: string },
    context: RecommendationContext
  ): boolean {
    const data = context.domainData.data as any; // Use any for union type inspection

    switch (target.type) {
      case 'goal':
        // Check all possible goal fields in different domain data types
        if (data.targetGoal?.id === target.id) return true;
        if (data.completedGoal?.id === target.id) return true;
        if (data.relatedGoal?.id === target.id) return true;
        if (Array.isArray(data.relatedGoals) &&
            data.relatedGoals.some((g: any) => g.id === target.id)) return true;
        if (Array.isArray(data.subGoals) &&
            data.subGoals.some((g: any) => g.id === target.id)) return true;
        if (Array.isArray(data.childGoals) &&
            data.childGoals.some((g: any) => g.id === target.id)) return true;
        return false;
        
      case 'project':
        if (data.targetProject?.id === target.id) return true;
        if (data.linkedProject?.id === target.id) return true;
        if (data.relatedProject?.id === target.id) return true;
        if (Array.isArray(data.linkedProjects) &&
            data.linkedProjects.some((p: any) => p.id === target.id)) return true;
        if (Array.isArray(data.relatedProjects) &&
            data.relatedProjects.some((p: any) => p.id === target.id)) return true;
        return false;
        
      case 'skill':
        if (data.targetSkill?.id === target.id) return true;
        return false;
        
      case 'idea':
        if (data.targetIdea?.id === target.id) return true;
        return false;
        
      case 'life_area':
        // Life area is a string ID, not an object
        if (typeof data.lifeArea === 'string' && data.lifeArea === target.id) return true;
        return false;
        
      case 'global':
        // Global scope is always valid
        return true;
        
      default:
        return false;
    }
  }

  /**
   * Check if action is destructive
   */
  private isDestructiveAction(toolName: string): boolean {
    const destructiveKeywords = ['delete', 'remove', 'archive', 'destroy', 'purge'];
    return destructiveKeywords.some((keyword) => toolName.toLowerCase().includes(keyword));
  }

  /**
   * Timeout promise helper
   */
  private timeoutPromise(ms: number): Promise<'TIMEOUT'> {
    return new Promise((resolve) => setTimeout(() => resolve('TIMEOUT'), ms));
  }
}
