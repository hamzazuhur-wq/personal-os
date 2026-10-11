import {
  AIProviderConnection,
  CreateAIProviderConnectionDTO,
  ProviderConnectionStatus,
  ConnectionTestResult,
  ProviderType,
  ProviderCapabilities,
} from '@/types/aiProvider.types';
import { getProviderTypeDefinition, BUILTIN_PROVIDER_TYPES } from './settings/providerRegistry';

// ============================================================
// VALIDATION & UTILITIES (local, no network)
// ============================================================

export class ProviderConnectionService {
  static createDefaults(dto: CreateAIProviderConnectionDTO, userId: string): Omit<AIProviderConnection, 'id' | 'created_at' | 'updated_at'> {
    const typeDef = getProviderTypeDefinition(dto.provider_type);
    const capabilities: ProviderCapabilities = {
      ...typeDef.capabilities,
      ...(dto.capabilities || {}),
    };

    return {
      user_id: userId,
      name: dto.name,
      provider_type: dto.provider_type,
      base_url: dto.base_url,
      api_key: dto.api_key || '',
      api_key_last_four: dto.api_key ? dto.api_key.slice(-4) : undefined,
      enabled: dto.enabled ?? true,
      capabilities,
      connection_status: 'not_tested' as ProviderConnectionStatus,
    };
  }

  static validate(dto: Partial<CreateAIProviderConnectionDTO>): Record<string, string> {
    const errors: Record<string, string> = {};

    if (!dto.name || !dto.name.trim()) {
      errors.name = 'Connection name is required.';
    }

    if (!dto.provider_type || !BUILTIN_PROVIDER_TYPES[dto.provider_type as ProviderType]) {
      errors.provider_type = 'Invalid provider type.';
    }

    const typeDef = dto.provider_type ? getProviderTypeDefinition(dto.provider_type) : null;

    if (typeDef?.fields.showBaseUrl) {
      if (!dto.base_url || !dto.base_url.trim()) {
        errors.base_url = 'Base URL is required.';
      } else if (!dto.base_url.startsWith('http://') && !dto.base_url.startsWith('https://')) {
        errors.base_url = 'Base URL must start with http:// or https://.';
      }
    }

    if (typeDef?.fields.showApiKey && typeDef.capabilities.requiresApiKey) {
      if (!dto.api_key || !dto.api_key.trim()) {
        errors.api_key = 'API key is required for this provider.';
      }
    }

    return errors;
  }

  static suggestName(providerType: string, existingConnections: AIProviderConnection[]): string {
    const typeDef = getProviderTypeDefinition(providerType as any);
    const baseName = typeDef.displayName;
    const sameType = existingConnections.filter(c => c.provider_type === providerType);
    if (sameType.length === 0) return `${baseName} — Main`;
    return `${baseName} — ${sameType.length + 1}`;
  }

  static getActiveConnection(
    connections: AIProviderConnection[],
    activeConnectionId?: string
  ): AIProviderConnection | null {
    if (activeConnectionId) {
      const active = connections.find(c => c.id === activeConnectionId && c.enabled);
      if (active) return active;
    }
    const firstEnabled = connections.find(c => c.enabled);
    return firstEnabled || null;
  }

  /**
   * Validates the stored active connection ID against the authoritative
   * backend provider list.  The backend is the single source of truth;
   * frontend IDs are NEVER authoritative.
   *
   * @param activeConnectionId - The ID stored in AISettings.active_connection_id
   * @param backendConnections - Connections returned by GET /api/ai/providers
   * @returns The canonical backend connection ID if it exists, or null if stale
   */
  static resolveActiveBackendConnectionId(
    activeConnectionId: string | undefined,
    backendConnections: AIProviderConnection[]
  ): string | null {
    if (!activeConnectionId) return null;

    const backendIds = new Set(backendConnections.map(c => c.id));
    if (backendIds.has(activeConnectionId)) {
      return activeConnectionId;
    }

    // Stale ID — does not exist on the backend
    return null;
  }

  /**
   * Gets the active connection from a list, validating the stored ID
   * against the authoritative backend list first.
   * Falls back to the first enabled connection when the active ID is stale.
   */
  static getActiveBackendConnection(
    connections: AIProviderConnection[],
    activeConnectionId?: string
  ): AIProviderConnection | null {
    const canonicalId = ProviderConnectionService.resolveActiveBackendConnectionId(
      activeConnectionId,
      connections
    );
    if (canonicalId) {
      const active = connections.find(c => c.id === canonicalId && c.enabled);
      if (active) return active;
    }

    const firstEnabled = connections.find(c => c.enabled);
    return firstEnabled || null;
  }

  static canDelete(connection: AIProviderConnection, allConnections: AIProviderConnection[]): boolean {
    if (!connection.enabled) return true;
    const otherEnabled = allConnections.filter(c => c.id !== connection.id && c.enabled);
    return otherEnabled.length > 0;
  }
}

// ============================================================
// BACKEND API CLIENT
// ============================================================
// All provider connection CRUD goes through the backend.
// The browser never sees API keys.

const API_BASE = '/api/ai';

export class ProviderConnectionAPI {
  static async list(): Promise<AIProviderConnection[]> {
    const res = await fetch(`${API_BASE}/providers`);
    if (!res.ok) throw new Error(`Failed to load provider connections: ${res.statusText}`);
    const json = await res.json();
    return json.providers || [];
  }

  static async create(dto: CreateAIProviderConnectionDTO): Promise<AIProviderConnection> {
    const res = await fetch(`${API_BASE}/providers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || `Failed to create connection: ${res.status}`);
    }
    const json = await res.json();
    return json.provider;
  }

  static async update(id: string, dto: Partial<CreateAIProviderConnectionDTO>): Promise<AIProviderConnection> {
    const res = await fetch(`${API_BASE}/providers/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || `Failed to update connection: ${res.status}`);
    }
    const json = await res.json();
    return json.provider;
  }

  static async delete(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/providers/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || `Failed to delete connection: ${res.status}`);
    }
  }

  static async test(id: string): Promise<ConnectionTestResult> {
    const res = await fetch(`${API_BASE}/providers/${encodeURIComponent(id)}/test`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || `Failed to test connection: ${res.status}`);
    }
    return res.json();
  }

  static async models(id: string): Promise<{ models: any[]; isLive: boolean }> {
    const res = await fetch(`${API_BASE}/providers/${encodeURIComponent(id)}/models`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || `Failed to load models: ${res.status}`);
    }
    return res.json();
  }
}
