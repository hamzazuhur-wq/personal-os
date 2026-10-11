import { ModelCapabilityMeta, AIRoutingProfile } from '../../../types/ai.types';

// ============================================================
// A. SAFE STATIC FALLBACK CATALOG
// ============================================================
export const STATIC_OPENROUTER_MODELS: ModelCapabilityMeta[] = [
  // ─── Free Models ──────────────────────────────────────────
  {
    id: 'meta-llama/llama-3.3-70b-instruct:free',
    name: 'Llama 3.3 70B Instruct (Free)',
    provider: 'Meta',
    contextWindow: 131072,
    isFree: true,
    supportsTools: true,
    supportsStructuredOutput: true,
    supportsStreaming: true,
    pricingDescription: 'Free Tier ($0.00 / M tokens)',
    pricing: {
      promptPerMillion: 0,
      completionPerMillion: 0,
    },
  },
  {
    id: 'google/gemini-2.0-flash-thinking-exp:free',
    name: 'Gemini 2.0 Flash Thinking (Free Exp)',
    provider: 'Google',
    contextWindow: 1048576,
    isFree: true,
    supportsTools: true,
    supportsStructuredOutput: true,
    supportsStreaming: true,
    pricingDescription: 'Free Experimental Tier ($0.00 / M tokens)',
    pricing: {
      promptPerMillion: 0,
      completionPerMillion: 0,
    },
  },
  {
    id: 'qwen/qwen-2.5-coder-32b-instruct:free',
    name: 'Qwen 2.5 Coder 32B (Free)',
    provider: 'Alibaba',
    contextWindow: 32768,
    isFree: true,
    supportsTools: true,
    supportsStructuredOutput: true,
    supportsStreaming: true,
    pricingDescription: 'Free Coding Tier ($0.00 / M tokens)',
    pricing: {
      promptPerMillion: 0,
      completionPerMillion: 0,
    },
  },

  // ─── Balanced / Cost-Optimized Models ─────────────────────
  {
    id: 'google/gemini-2.0-flash-001',
    name: 'Gemini 2.0 Flash',
    provider: 'Google',
    contextWindow: 1048576,
    isFree: false,
    supportsTools: true,
    supportsStructuredOutput: true,
    supportsStreaming: true,
    pricingDescription: '$0.10/M prompt, $0.40/M completion',
    pricing: {
      promptPerMillion: 0.10,
      completionPerMillion: 0.40,
    },
  },
  {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'OpenAI',
    contextWindow: 128000,
    isFree: false,
    supportsTools: true,
    supportsStructuredOutput: true,
    supportsStreaming: true,
    pricingDescription: '$0.15/M prompt, $0.60/M completion',
    pricing: {
      promptPerMillion: 0.15,
      completionPerMillion: 0.60,
    },
  },
  {
    id: 'deepseek/deepseek-chat',
    name: 'DeepSeek V3',
    provider: 'DeepSeek',
    contextWindow: 64000,
    isFree: false,
    supportsTools: true,
    supportsStructuredOutput: true,
    supportsStreaming: true,
    pricingDescription: '$0.14/M prompt, $0.28/M completion',
    pricing: {
      promptPerMillion: 0.14,
      completionPerMillion: 0.28,
    },
  },
  {
    id: 'anthropic/claude-3.5-haiku',
    name: 'Claude 3.5 Haiku',
    provider: 'Anthropic',
    contextWindow: 200000,
    isFree: false,
    supportsTools: true,
    supportsStructuredOutput: true,
    supportsStreaming: true,
    pricingDescription: '$0.80/M prompt, $4.00/M completion',
    pricing: {
      promptPerMillion: 0.80,
      completionPerMillion: 4.00,
    },
  },

  // ─── Quality First / Flagship Reasoning ───────────────────
  {
    id: 'anthropic/claude-3.7-sonnet',
    name: 'Claude 3.7 Sonnet',
    provider: 'Anthropic',
    contextWindow: 200000,
    isFree: false,
    supportsTools: true,
    supportsStructuredOutput: true,
    supportsStreaming: true,
    pricingDescription: '$3.00/M prompt, $15.00/M completion',
    pricing: {
      promptPerMillion: 3.00,
      completionPerMillion: 15.00,
    },
  },
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    contextWindow: 128000,
    isFree: false,
    supportsTools: true,
    supportsStructuredOutput: true,
    supportsStreaming: true,
    pricingDescription: '$2.50/M prompt, $10.00/M completion',
    pricing: {
      promptPerMillion: 2.50,
      completionPerMillion: 10.00,
    },
  },
];

export const OPENROUTER_MODELS = STATIC_OPENROUTER_MODELS;

// ============================================================
// B. LIVE PROVIDER MODEL DISCOVERY
// ============================================================

export interface LiveCatalogResult {
  models: ModelCapabilityMeta[];
  isLive: boolean;
  message: string;
}

/**
 * Fetches live available models from OpenRouter through the safe backend/proxy endpoint.
 * Returns only sanitized public metadata with zero exposed keys or internal headers.
 */
export async function fetchLiveOpenRouterModels(
  endpoint: string = '/api/ai'
): Promise<LiveCatalogResult> {
  const modelsUrl = endpoint.endsWith('/')
    ? `${endpoint}models`
    : endpoint.includes('/chat/completions')
    ? endpoint.replace('/chat/completions', '/models')
    : `${endpoint}/models`;

  try {
    const res = await fetch(modelsUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      return {
        models: STATIC_OPENROUTER_MODELS,
        isLive: false,
        message: 'Live model availability unavailable — showing cached catalog.',
      };
    }

    const json = await res.json();
    const data: any[] = Array.isArray(json?.data) ? json.data : [];

    if (!data || data.length === 0) {
      return {
        models: STATIC_OPENROUTER_MODELS,
        isLive: false,
        message: 'Live model availability unavailable — showing cached catalog.',
      };
    }

    const liveModels: ModelCapabilityMeta[] = data
      .filter((m) => m && m.id && typeof m.id === 'string')
      .map((m) => {
        const promptPrice = m.pricing?.prompt ? parseFloat(m.pricing.prompt) * 1_000_000 : 0;
        const completionPrice = m.pricing?.completion ? parseFloat(m.pricing.completion) * 1_000_000 : 0;
        const isFree = m.id.endsWith(':free') || (promptPrice === 0 && completionPrice === 0);

        const providerName = m.id.includes('/')
          ? m.id.split('/')[0].charAt(0).toUpperCase() + m.id.split('/')[0].slice(1)
          : 'OpenRouter';

        // Check tool capability from architecture or fallback list
        const staticMatch = STATIC_OPENROUTER_MODELS.find((sm) => sm.id === m.id);
        const supportsTools = staticMatch ? staticMatch.supportsTools : true;
        const supportsStructuredOutput = staticMatch ? staticMatch.supportsStructuredOutput : true;

        return {
          id: m.id,
          name: m.name || m.id.split('/').pop() || m.id,
          provider: providerName,
          contextWindow: m.context_length || 128000,
          isFree,
          supportsTools,
          supportsStructuredOutput,
          supportsStreaming: true,
          pricingDescription: isFree
            ? 'Free Tier ($0.00 / M tokens)'
            : promptPrice > 0 || completionPrice > 0
            ? `$${promptPrice.toFixed(2)}/M prompt, $${completionPrice.toFixed(2)}/M completion`
            : undefined,
          pricing: promptPrice > 0 || completionPrice > 0 || isFree
            ? {
                promptPerMillion: promptPrice,
                completionPerMillion: completionPrice,
              }
            : undefined,
        };
      });

    // Merge: Put curated high-demand models first, then other live models
    const sortedModels = [
      ...STATIC_OPENROUTER_MODELS,
      ...liveModels.filter((lm) => !STATIC_OPENROUTER_MODELS.some((sm) => sm.id === lm.id)),
    ];

    return {
      models: sortedModels,
      isLive: true,
      message: `Live OpenRouter catalog active (${liveModels.length} models discovered).`,
    };
  } catch (err: any) {
    return {
      models: STATIC_OPENROUTER_MODELS,
      isLive: false,
      message: 'Live model availability unavailable — showing cached catalog.',
    };
  }
}

// ============================================================
// C. CAPABILITY & METADATA HELPERS
// ============================================================

export function getModelMeta(
  modelId: string,
  catalog: ModelCapabilityMeta[] = STATIC_OPENROUTER_MODELS
): ModelCapabilityMeta | undefined {
  return catalog.find((m) => m.id === modelId) || STATIC_OPENROUTER_MODELS.find((m) => m.id === modelId);
}

export function supportsToolCalling(
  modelId: string,
  catalog: ModelCapabilityMeta[] = STATIC_OPENROUTER_MODELS
): boolean {
  const meta = getModelMeta(modelId, catalog);
  return meta ? meta.supportsTools : true;
}

export function supportsStreaming(
  modelId: string,
  catalog: ModelCapabilityMeta[] = STATIC_OPENROUTER_MODELS
): boolean {
  const meta = getModelMeta(modelId, catalog);
  return meta ? meta.supportsStreaming : true;
}

/**
 * Returns the recommended model for a routing profile.
 * In free_only mode: strictly verifies free status.
 * If no free model is available: returns null with explicit explanation.
 */
export function getRecommendedModelForProfile(
  profile: AIRoutingProfile,
  catalog: ModelCapabilityMeta[] = STATIC_OPENROUTER_MODELS
): { modelId: string | null; reason?: string } {
  if (profile === 'free_only') {
    const freeModels = catalog.filter((m) => m.isFree);
    if (freeModels.length === 0) {
      return {
        modelId: null,
        reason: 'No compatible free model is currently available.',
      };
    }
    // Prefer llama 3.3 free or gemini free
    const preferred = freeModels.find((m) => m.id.includes('llama-3.3')) || freeModels[0];
    return { modelId: preferred.id };
  }

  switch (profile) {
    case 'cost_optimized': {
      const match = catalog.find((m) => m.id === 'google/gemini-2.0-flash-001') || catalog.find((m) => !m.isFree && (m.pricing?.promptPerMillion ?? 1) < 0.2);
      return { modelId: match ? match.id : 'google/gemini-2.0-flash-001' };
    }
    case 'quality_first': {
      const match = catalog.find((m) => m.id === 'anthropic/claude-3.7-sonnet') || catalog.find((m) => m.id.includes('sonnet') || m.id.includes('gpt-4o'));
      return { modelId: match ? match.id : 'anthropic/claude-3.7-sonnet' };
    }
    case 'balanced':
    default: {
      const match = catalog.find((m) => m.id === 'google/gemini-2.0-flash-001') || catalog[0];
      return { modelId: match ? match.id : 'google/gemini-2.0-flash-001' };
    }
  }
}

/**
 * Calculates estimated cost strictly from known model pricing metadata.
 * Returns null if pricing is unknown (never invents prices or returns fake 0).
 */
export function calculateEstimatedCost(
  modelId: string,
  inputTokens?: number,
  outputTokens?: number,
  catalog: ModelCapabilityMeta[] = STATIC_OPENROUTER_MODELS
): number | null {
  const meta = getModelMeta(modelId, catalog);
  if (!meta) return null;

  if (meta.isFree) return 0.0;

  if (!meta.pricing || (meta.pricing.promptPerMillion === undefined && meta.pricing.completionPerMillion === undefined)) {
    return null;
  }

  const inTok = inputTokens || 0;
  const outTok = outputTokens || 0;

  const promptCost = (inTok * (meta.pricing.promptPerMillion || 0)) / 1_000_000;
  const completionCost = (outTok * (meta.pricing.completionPerMillion || 0)) / 1_000_000;

  return promptCost + completionCost;
}

/**
 * Validates if a model ID is recognized or formatted as a valid OpenRouter model identifier (e.g. 'org/model-name').
 */
export function isValidOpenRouterModel(
  modelId: string,
  catalog: ModelCapabilityMeta[] = STATIC_OPENROUTER_MODELS
): boolean {
  if (!modelId || typeof modelId !== 'string') return false;
  if (catalog.some((m) => m.id === modelId)) return true;
  if (STATIC_OPENROUTER_MODELS.some((m) => m.id === modelId)) return true;
  return /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9._:-]+$/.test(modelId.trim());
}
