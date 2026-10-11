import { AISettings, AIRoutingProfile } from '../../../types/ai.types';
import { AIProviderConnection } from '../../../types/aiProvider.types';
import { ModelCapabilityMeta } from '../../../types/ai.types';
import { ProviderConnectionService } from '../providerConnectionService';
import { selectModelForProfile, getStaticFallbackModels } from '../modelDiscovery';

export interface RoutingDecision {
  connection: AIProviderConnection;
  modelId: string;
  reason?: string;
}

export class RoutingEngine {
  /**
   * Resolves the active connection and model based on routing profile.
   * This is real runtime logic, not a UI-only dropdown.
   */
  static resolve(settings: AISettings, connections: AIProviderConnection[]): RoutingDecision | null {
    const activeConnection = ProviderConnectionService.getActiveBackendConnection(
      connections,
      settings.active_connection_id
    );

    if (!activeConnection) {
      return null;
    }

    if (!activeConnection.enabled) {
      return null;
    }

    const models = getCachedOrFallbackModels(activeConnection);
    const selection = selectModelForProfile(settings.routing_profile, models, settings.selected_model);

    if (!selection.modelId) {
      return null;
    }

    return {
      connection: activeConnection,
      modelId: selection.modelId,
      reason: selection.reason,
    };
  }

  /**
   * Returns whether the routing profile allows using paid models.
   */
  static allowsPaidModels(profile: AIRoutingProfile): boolean {
    return profile !== 'free_only';
  }

  /**
   * Filters connections to only those compatible with the routing profile.
   */
  static filterCompatibleConnections(
    connections: AIProviderConnection[],
    profile: AIRoutingProfile
  ): AIProviderConnection[] {
    if (profile === 'free_only') {
      return connections.filter(c => c.enabled);
      // Note: actual free-model filtering happens at model selection time
    }
    return connections.filter(c => c.enabled);
  }
}

function getCachedOrFallbackModels(connection: AIProviderConnection): ModelCapabilityMeta[] {
  return getStaticFallbackModels(connection.provider_type);
}
