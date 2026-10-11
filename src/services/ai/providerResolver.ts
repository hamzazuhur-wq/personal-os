import { IAIProvider } from './providers/IAIProvider';
import { OpenRouterProvider } from './providers/OpenRouterProvider';
import { OpenAICompatibleProvider } from './providers/OpenAICompatibleProvider';
import { AISettings } from '@/types/ai.types';
import { AIProviderConnection } from '@/types/aiProvider.types';
import { DevelopmentMockProvider } from './providers/DevelopmentMockProvider';
import { IdeaMockProvider } from './providers/IdeaMockProvider';

export class ProviderResolutionError extends Error {
  constructor(
    message: string,
    public readonly connectionId?: string,
    public readonly providerType?: string
  ) {
    super(message);
    this.name = 'ProviderResolutionError';
  }
}

/**
 * Resolves a provider connection to a concrete IAIProvider implementation.
 * This is the ONLY entry point for provider instantiation.
 * Agent core must not read raw UI state directly.
 */
export class ProviderResolver {
  private static instance: ProviderResolver;
  private cache = new Map<string, IAIProvider>();

  static getInstance(): ProviderResolver {
    if (!ProviderResolver.instance) {
      ProviderResolver.instance = new ProviderResolver();
    }
    return ProviderResolver.instance;
  }

  /**
   * Resolves an AIProviderConnection to a concrete provider instance.
   * Caches instances by connection id for reuse within a session.
   */
  resolve(connection: AIProviderConnection, settings: AISettings): IAIProvider {
    const cacheKey = connection.id;

    // Return cached instance if settings haven't changed meaningfully
    const cached = this.cache.get(cacheKey);
    if (cached && !(cached instanceof DevelopmentMockProvider) && !(cached instanceof IdeaMockProvider)) {
      if ('updateSettings' in cached) {
        (cached as any).updateSettings(settings);
      }
      return cached;
    }

    const providerType = connection.provider_type;
    const capabilities = connection.capabilities;

    let provider: IAIProvider;

    switch (providerType) {
      case 'openrouter': {
        // Preserve specialized OpenRouterProvider for fallback, streaming, tool-call accumulation
        const orProvider = new OpenRouterProvider(settings);
        this.cache.set(cacheKey, orProvider);
        provider = orProvider;
        break;
      }
      case 'openai':
      case 'deepseek':
      case 'groq':
      case 'mistral':
      case 'xai':
      case 'google':
      case 'anthropic':
      case 'ollama':
      case 'custom': {
        // OpenAI-compatible family (including Ollama's OpenAI-compatible layer)
        const genericProvider = new OpenAICompatibleProvider(
          settings,
          capabilities,
          `provider-${connection.id}`,
          connection.name
        );
        this.cache.set(cacheKey, genericProvider);
        provider = genericProvider;
        break;
      }
      default: {
        const genericProvider = new OpenAICompatibleProvider(
          settings,
          capabilities,
          `provider-${connection.id}`,
          connection.name
        );
        this.cache.set(cacheKey, genericProvider);
        provider = genericProvider;
        break;
      }
    }

    return provider;
  }

  /**
   * Resolves by connection id, fetching from repository if needed.
   * Prefer passing the connection directly to avoid extra lookups.
   */
  resolveById(connection: AIProviderConnection | null, settings: AISettings): IAIProvider {
    if (!connection) {
      return new DevelopmentMockProvider();
    }

    if (!connection.enabled) {
      // Disabled connections should not be used for runtime
      return new DevelopmentMockProvider();
    }

    return this.resolve(connection, settings);
  }

  /**
   * Gets a provider suitable for the Idea workspace.
   * Uses the same connection provider but swaps in IdeaMockProvider when configured provider is a dev mock.
   */
  resolveForIdea(connection: AIProviderConnection | null, settings: AISettings): IAIProvider {
    const provider = this.resolveById(connection, settings);
    const isMock = provider instanceof DevelopmentMockProvider;
    if (isMock) {
      return new IdeaMockProvider();
    }
    return provider;
  }

  /**
   * Clears the provider cache (e.g., after connection update).
   */
  invalidateCache(connectionId?: string): void {
    if (connectionId) {
      this.cache.delete(connectionId);
    } else {
      this.cache.clear();
    }
  }
}

export const providerResolver = ProviderResolver.getInstance();
