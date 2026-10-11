import { ModelCapabilityMeta, AIRoutingProfile } from '../../types/ai.types';
import { AIProviderConnection } from '../../types/aiProvider.types';
import { getProviderTypeDefinition } from './settings/providerRegistry';

export interface ModelDiscoveryResult {
  models: ModelCapabilityMeta[];
  isLive: boolean;
  error?: string;
}

/**
 * Discovers models for a given provider connection.
 * Uses live discovery when available, falls back to static catalogs.
 */
export async function discoverModelsForConnection(
  connection: AIProviderConnection
): Promise<ModelDiscoveryResult> {
  if (!connection.capabilities.modelDiscovery) {
    return {
      models: getStaticFallbackModels(connection.provider_type),
      isLive: false,
      error: 'Model discovery not supported for this provider type.',
    };
  }

  try {
    const result = await discoverModelsLive(connection);
    if (result.models.length > 0) {
      return { ...result, isLive: true };
    }
  } catch {
    // Fall through to static
  }

  return {
    models: getStaticFallbackModels(connection.provider_type),
    isLive: false,
    error: 'Live model discovery unavailable — showing static catalog.',
  };
}

async function discoverModelsLive(connection: AIProviderConnection): Promise<ModelDiscoveryResult> {
  const baseUrl = connection.base_url.replace(/\/$/, '');
  const capabilities = connection.capabilities;

  let modelsUrl: string;
  if (capabilities.discoveryEndpoint === '/api/tags') {
    // Ollama
    modelsUrl = `${baseUrl}/api/tags`;
  } else if (capabilities.discoveryEndpoint === '/models') {
    modelsUrl = `${baseUrl}/models`;
  } else {
    modelsUrl = `${baseUrl}${capabilities.discoveryEndpoint || '/models'}`;
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (capabilities.authMethod === 'bearer' && connection.api_key) {
    headers['Authorization'] = `Bearer ${connection.api_key}`;
  }

  const res = await fetch(modelsUrl, { headers, signal: AbortSignal.timeout?.(15000) });

  if (!res.ok) {
    return { models: [], isLive: false, error: `HTTP ${res.status}` };
  }

  const json = await res.json();
  const rawModels = extractModelsFromResponse(json, connection.provider_type);
  const normalized = normalizeModels(rawModels, connection);
  return { models: normalized, isLive: true };
}

function extractModelsFromResponse(json: any, providerType: string): Array<{ id: string; name?: string; context_length?: number; pricing?: { prompt?: string; completion?: string } }> {
  if (providerType === 'ollama') {
    return Array.isArray(json?.models)
      ? json.models.map((m: any) => ({ id: m.name || m.model, name: m.name || m.model, context_length: m.details?.parameter_size || 0 }))
      : [];
  }
  const data = Array.isArray(json?.data) ? json.data : [];
  return data.map((m: any) => ({
    id: m.id,
    name: m.name,
    context_length: m.context_length,
    pricing: m.pricing,
  }));
}

function normalizeModels(raw: any[], connection: AIProviderConnection): ModelCapabilityMeta[] {
  const capabilities = connection.capabilities;
  return raw.map((m) => {
    const promptPrice = m.pricing?.prompt ? parseFloat(m.pricing.prompt) * 1_000_000 : 0;
    const completionPrice = m.pricing?.completion ? parseFloat(m.pricing.completion) * 1_000_000 : 0;
    const isFree = m.id?.endsWith(':free') || (promptPrice === 0 && completionPrice === 0);

    return {
      id: m.id,
      name: m.name || m.id.split('/').pop() || m.id,
      provider: connection.name,
      contextWindow: m.context_length || 128000,
      isFree,
      supportsTools: capabilities.supportsTools,
      supportsStructuredOutput: capabilities.supportsStructuredOutput,
      supportsStreaming: capabilities.supportsStreaming,
      pricingDescription: isFree
        ? 'Free Tier ($0.00 / M tokens)'
        : promptPrice > 0 || completionPrice > 0
          ? `$${promptPrice.toFixed(2)}/M prompt, $${completionPrice.toFixed(2)}/M completion`
          : undefined,
      pricing: (promptPrice > 0 || completionPrice > 0 || isFree)
        ? { promptPerMillion: promptPrice, completionPerMillion: completionPrice }
        : undefined,
    };
  });
}

export function getStaticFallbackModels(providerType: string): ModelCapabilityMeta[] {
  const typeDef = getProviderTypeDefinition(providerType as any);

  switch (providerType) {
    case 'openrouter':
      return [
        { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B Instruct (Free)', provider: typeDef.displayName, contextWindow: 131072, isFree: true, supportsTools: true, supportsStructuredOutput: true, supportsStreaming: true, pricingDescription: 'Free Tier ($0.00 / M tokens)', pricing: { promptPerMillion: 0, completionPerMillion: 0 } },
        { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash', provider: typeDef.displayName, contextWindow: 1048576, isFree: false, supportsTools: true, supportsStructuredOutput: true, supportsStreaming: true, pricingDescription: '$0.10/M prompt, $0.40/M completion', pricing: { promptPerMillion: 0.10, completionPerMillion: 0.40 } },
      ];
    case 'openai':
      return [
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: typeDef.displayName, contextWindow: 128000, isFree: false, supportsTools: true, supportsStructuredOutput: true, supportsStreaming: true, pricingDescription: '$0.15/M prompt, $0.60/M completion', pricing: { promptPerMillion: 0.15, completionPerMillion: 0.60 } },
        { id: 'gpt-4o', name: 'GPT-4o', provider: typeDef.displayName, contextWindow: 128000, isFree: false, supportsTools: true, supportsStructuredOutput: true, supportsStreaming: true, pricingDescription: '$2.50/M prompt, $10.00/M completion', pricing: { promptPerMillion: 2.50, completionPerMillion: 10.00 } },
      ];
    case 'ollama':
      return [
        { id: 'llama3.2', name: 'Llama 3.2', provider: typeDef.displayName, contextWindow: 128000, isFree: true, supportsTools: true, supportsStructuredOutput: true, supportsStreaming: true },
        { id: 'qwen2.5-coder:7b', name: 'Qwen 2.5 Coder 7B', provider: typeDef.displayName, contextWindow: 32768, isFree: true, supportsTools: true, supportsStructuredOutput: true, supportsStreaming: true },
      ];
    default:
      return [
        { id: 'default-model', name: 'Default Model', provider: typeDef.displayName, contextWindow: 128000, isFree: true, supportsTools: true, supportsStructuredOutput: true, supportsStreaming: true },
      ];
  }
}

/**
 * Selects a model based on routing profile and available catalog.
 */
export function selectModelForProfile(
  profile: AIRoutingProfile,
  models: ModelCapabilityMeta[],
  currentModel?: string
): { modelId: string | null; reason?: string } {
  if (profile === 'manual') {
    if (currentModel && models.some(m => m.id === currentModel)) {
      return { modelId: currentModel };
    }
    return { modelId: models[0]?.id || null };
  }

  if (profile === 'free_only') {
    const freeModels = models.filter(m => m.isFree);
    if (freeModels.length === 0) {
      return { modelId: null, reason: 'No compatible free model is currently available.' };
    }
    const preferred = freeModels.find(m => m.id.includes('llama')) || freeModels[0];
    return { modelId: preferred.id };
  }

  switch (profile) {
    case 'cost_optimized': {
      const sorted = [...models].sort((a, b) => {
        const aCost = a.pricing?.promptPerMillion ?? Infinity;
        const bCost = b.pricing?.promptPerMillion ?? Infinity;
        return aCost - bCost;
      });
      return { modelId: sorted[0]?.id || models[0]?.id || null };
    }
    case 'quality_first': {
      const sorted = [...models].sort((a, b) => b.contextWindow - a.contextWindow);
      return { modelId: sorted[0]?.id || models[0]?.id || null };
    }
    case 'balanced':
    default: {
      const withPricing = models.filter(m => m.pricing);
      if (withPricing.length > 0) {
        const mid = withPricing[Math.floor(withPricing.length / 2)];
        return { modelId: mid.id };
      }
      return { modelId: models[0]?.id || null };
    }
  }
}
