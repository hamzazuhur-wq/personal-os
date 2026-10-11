import { AISettings } from '../../../types/ai.types';
import { isValidOpenRouterModel } from './modelCatalog';
import { ProviderConnectionService } from '../providerConnectionService';
import { AIProviderConnection } from '../../../types/aiProvider.types';

export interface AISettingsValidationErrors {
  endpoint?: string;
  temperature?: string;
  max_output_tokens?: string;
  max_retrieved_records?: string;
  selected_model?: string;
  fallback_model?: string;
}

export class AISettingsService {
  static validate(settings: Partial<AISettings>): AISettingsValidationErrors {
    const errors: AISettingsValidationErrors = {};

    if (settings.endpoint !== undefined) {
      if (!settings.endpoint.trim()) {
        errors.endpoint = 'Endpoint cannot be empty.';
      } else if (!settings.endpoint.startsWith('http://') && !settings.endpoint.startsWith('https://') && !settings.endpoint.startsWith('/')) {
        errors.endpoint = 'Endpoint must be a valid URL or relative path (e.g. /api/ai).';
      }
    }

    if (settings.temperature !== undefined) {
      if (typeof settings.temperature !== 'number' || isNaN(settings.temperature) || settings.temperature < 0 || settings.temperature > 1) {
        errors.temperature = 'Temperature must be between 0.0 and 1.0.';
      }
    }

    if (settings.max_output_tokens !== undefined) {
      if (typeof settings.max_output_tokens !== 'number' || isNaN(settings.max_output_tokens) || settings.max_output_tokens < 256 || settings.max_output_tokens > 4096) {
        errors.max_output_tokens = 'Max output tokens must be between 256 and 4096.';
      }
    }

    if (settings.max_retrieved_records !== undefined) {
      if (typeof settings.max_retrieved_records !== 'number' || isNaN(settings.max_retrieved_records) || settings.max_retrieved_records < 5 || settings.max_retrieved_records > 50) {
        errors.max_retrieved_records = 'Max retrieved records must be between 5 and 50.';
      }
    }

    if (settings.selected_model !== undefined) {
      if (!isValidOpenRouterModel(settings.selected_model)) {
        errors.selected_model = 'Selected model identifier is invalid. Format must be "org/model-name".';
      }
    }

    if (settings.fallback_enabled && settings.fallback_model !== undefined) {
      if (!isValidOpenRouterModel(settings.fallback_model)) {
        errors.fallback_model = 'Fallback model identifier is invalid.';
      }
    }

    return errors;
  }

  static validateConnection(dto: Partial<AIProviderConnection>): Record<string, string> {
    return ProviderConnectionService.validate(dto);
  }

  /**
   * Tests the connection to the configured AI provider endpoint with a real safe request.
   */
  static async testConnection(settings: AISettings): Promise<{ success: boolean; latencyMs?: number; message: string; model?: string; provider?: string }> {
    if (settings.provider === 'mock') {
      return {
        success: true,
        latencyMs: 1,
        provider: 'Development Mock',
        model: 'Local Simulator',
        message: 'Development Mock Provider is active for test suite evaluation.',
      };
    }

    const start = performance.now();
    try {
      const endpoint = settings.endpoint.endsWith('/')
        ? `${settings.endpoint}chat/completions`
        : settings.endpoint.includes('/chat/completions')
        ? settings.endpoint
        : `${settings.endpoint}/chat/completions`;

      const targetModel = settings.selected_model || 'meta-llama/llama-3.3-70b-instruct:free';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(settings.custom_headers || {}),
        },
        body: JSON.stringify({
          model: targetModel,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1,
        }),
      });

      const latencyMs = Math.round(performance.now() - start);

      if (!response.ok) {
        let errDetail = `HTTP ${response.status} ${response.statusText}`;
        try {
          const errJson = await response.json();
          if (errJson?.error?.message) {
            errDetail = errJson.error.message;
          }
        } catch {
          // ignore
        }
        return {
          success: false,
          latencyMs,
          provider: 'OpenRouter',
          model: targetModel,
          message: `Connection failed: ${errDetail}`,
        };
      }

      return {
        success: true,
        latencyMs,
        provider: 'OpenRouter',
        model: targetModel,
        message: `Successfully connected to OpenRouter using ${targetModel} (${latencyMs}ms).`,
      };
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - start);
      return {
        success: false,
        latencyMs,
        provider: 'OpenRouter',
        message: `Connection unreachable: ${err.message || 'Network error or CORS restriction'}. Ensure proxy or backend server is running.`,
      };
    }
  }
}
