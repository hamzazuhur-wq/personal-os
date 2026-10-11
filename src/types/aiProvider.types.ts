// ============================================================
// AI PROVIDER TYPES
// ============================================================

export type ProviderType =
  | 'openrouter'
  | 'openai'
  | 'google'
  | 'deepseek'
  | 'anthropic'
  | 'xai'
  | 'mistral'
  | 'groq'
  | 'ollama'
  | 'custom';

export type ProviderConnectionStatus =
  | 'not_tested'
  | 'connected'
  | 'auth_failed'
  | 'endpoint_unavailable'
  | 'configuration_error';

export interface ProviderCapabilities {
  modelDiscovery: boolean;
  requiresApiKey: boolean;
  supportsStreaming: boolean;
  supportsTools: boolean;
  supportsStructuredOutput: boolean;
  supportsLocalNoKey: boolean;
  defaultBaseUrl: string;
  authMethod: 'bearer' | 'header' | 'none';
  discoveryEndpoint?: string;
  modelsEndpoint?: string;
  chatEndpoint?: string;
}

export interface AIProviderConnection {
  id: string;
  user_id?: string;
  name: string; // e.g. "OpenRouter — Main"
  provider_type: ProviderType;
  base_url: string; // NEVER the API key
  api_key?: string; // Stored local-only; see security notes. Backend responses do NOT include this.
  api_key_last_four?: string; // Display hint only
  enabled: boolean;
  capabilities: ProviderCapabilities;
  connection_status: ProviderConnectionStatus;
  last_tested_at?: string;
  last_tested_error?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAIProviderConnectionDTO extends Omit<AIProviderConnection, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'capabilities' | 'connection_status' | 'last_tested_at' | 'last_tested_error'> {
  capabilities?: Partial<ProviderCapabilities>;
}

export interface UpdateAIProviderConnectionDTO extends Partial<CreateAIProviderConnectionDTO> {
  connection_status?: ProviderConnectionStatus;
  last_tested_at?: string;
  last_tested_error?: string;
}

export interface ProviderTypeDefinition {
  type: ProviderType;
  displayName: string;
  description: string;
  defaultBaseUrl: string;
  requiresApiKey: boolean;
  supportsLocalNoKey: boolean;
  capabilities: ProviderCapabilities;
  fields: ProviderFieldConfig;
}

export interface ProviderFieldConfig {
  showBaseUrl: boolean;
  showApiKey: boolean;
  showModelId: boolean;
  apiKeyPlaceholder?: string;
  baseUrlPlaceholder?: string;
  modelIdPlaceholder?: string;
  helpText?: string;
}

export type ConnectionTestResult =
  | { success: true; status: 'connected'; latencyMs: number; message: string; discoveredModels?: number }
  | { success: false; status: Exclude<ProviderConnectionStatus, 'not_tested' | 'connected'>; latencyMs: number; message: string; discoveredModels?: number };

// ============================================================
// SETTINGS EXTENSIONS
// ============================================================

export interface AISettingsExtensions {
  active_connection_id?: string;
}
