import { ProviderTypeDefinition, ProviderType, ProviderCapabilities } from '@/types/aiProvider.types';

// ============================================================
// BUILT-IN PROVIDER TYPE REGISTRY
// ============================================================

const OPENROUTER_CAPABILITIES: ProviderCapabilities = {
  modelDiscovery: true,
  requiresApiKey: true,
  supportsStreaming: true,
  supportsTools: true,
  supportsStructuredOutput: true,
  supportsLocalNoKey: false,
  defaultBaseUrl: 'https://openrouter.ai/api/v1',
  authMethod: 'bearer',
  discoveryEndpoint: '/models',
  chatEndpoint: '/chat/completions',
};

const OPENAI_CAPABILITIES: ProviderCapabilities = {
  modelDiscovery: true,
  requiresApiKey: true,
  supportsStreaming: true,
  supportsTools: true,
  supportsStructuredOutput: true,
  supportsLocalNoKey: false,
  defaultBaseUrl: 'https://api.openai.com/v1',
  authMethod: 'bearer',
  discoveryEndpoint: '/models',
  chatEndpoint: '/chat/completions',
};

const GOOGLE_CAPABILITIES: ProviderCapabilities = {
  modelDiscovery: true,
  requiresApiKey: true,
  supportsStreaming: true,
  supportsTools: true,
  supportsStructuredOutput: true,
  supportsLocalNoKey: false,
  defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
  authMethod: 'bearer',
  discoveryEndpoint: '/models',
  chatEndpoint: '/models/{model}:generateContent',
};

const DEEPSEEK_CAPABILITIES: ProviderCapabilities = {
  modelDiscovery: true,
  requiresApiKey: true,
  supportsStreaming: true,
  supportsTools: true,
  supportsStructuredOutput: true,
  supportsLocalNoKey: false,
  defaultBaseUrl: 'https://api.deepseek.com/v1',
  authMethod: 'bearer',
  discoveryEndpoint: '/models',
  chatEndpoint: '/chat/completions',
};

const ANTHROPIC_CAPABILITIES: ProviderCapabilities = {
  modelDiscovery: true,
  requiresApiKey: true,
  supportsStreaming: true,
  supportsTools: true,
  supportsStructuredOutput: true,
  supportsLocalNoKey: false,
  defaultBaseUrl: 'https://api.anthropic.com/v1',
  authMethod: 'bearer',
  discoveryEndpoint: '/models',
  chatEndpoint: '/messages',
};

const XAI_CAPABILITIES: ProviderCapabilities = {
  modelDiscovery: true,
  requiresApiKey: true,
  supportsStreaming: true,
  supportsTools: true,
  supportsStructuredOutput: true,
  supportsLocalNoKey: false,
  defaultBaseUrl: 'https://api.x.ai/v1',
  authMethod: 'bearer',
  discoveryEndpoint: '/models',
  chatEndpoint: '/chat/completions',
};

const MISTRAL_CAPABILITIES: ProviderCapabilities = {
  modelDiscovery: true,
  requiresApiKey: true,
  supportsStreaming: true,
  supportsTools: true,
  supportsStructuredOutput: true,
  supportsLocalNoKey: false,
  defaultBaseUrl: 'https://api.mistral.ai/v1',
  authMethod: 'bearer',
  discoveryEndpoint: '/models',
  chatEndpoint: '/chat/completions',
};

const GROQ_CAPABILITIES: ProviderCapabilities = {
  modelDiscovery: true,
  requiresApiKey: true,
  supportsStreaming: true,
  supportsTools: true,
  supportsStructuredOutput: true,
  supportsLocalNoKey: false,
  defaultBaseUrl: 'https://api.groq.com/openai/v1',
  authMethod: 'bearer',
  discoveryEndpoint: '/models',
  chatEndpoint: '/chat/completions',
};

const OLLAMA_CAPABILITIES: ProviderCapabilities = {
  modelDiscovery: true,
  requiresApiKey: false,
  supportsStreaming: true,
  supportsTools: true,
  supportsStructuredOutput: true,
  supportsLocalNoKey: true,
  defaultBaseUrl: 'http://127.0.0.1:11434/v1',
  authMethod: 'none',
  discoveryEndpoint: '/api/tags',
  chatEndpoint: '/chat/completions',
};

const CUSTOM_CAPABILITIES: ProviderCapabilities = {
  modelDiscovery: true,
  requiresApiKey: false,
  supportsStreaming: true,
  supportsTools: true,
  supportsStructuredOutput: true,
  supportsLocalNoKey: true,
  defaultBaseUrl: 'http://localhost:11434/v1',
  authMethod: 'bearer',
  discoveryEndpoint: '/models',
  chatEndpoint: '/chat/completions',
};

export const BUILTIN_PROVIDER_TYPES: Record<ProviderType, ProviderTypeDefinition> = {
  openrouter: {
    type: 'openrouter',
    displayName: 'OpenRouter',
    description: 'Unified API gateway for multiple LLM providers',
    defaultBaseUrl: OPENROUTER_CAPABILITIES.defaultBaseUrl,
    requiresApiKey: true,
    supportsLocalNoKey: false,
    capabilities: OPENROUTER_CAPABILITIES,
    fields: {
      showBaseUrl: true,
      showApiKey: true,
      showModelId: false,
      apiKeyPlaceholder: 'sk-or-v1-...',
      baseUrlPlaceholder: 'https://openrouter.ai/api/v1',
      helpText: 'API key is sent as Authorization: Bearer header. Never stored in URLs.',
    },
  },
  openai: {
    type: 'openai',
    displayName: 'OpenAI',
    description: 'OpenAI GPT-4o, GPT-4o-mini, o1, o3',
    defaultBaseUrl: OPENAI_CAPABILITIES.defaultBaseUrl,
    requiresApiKey: true,
    supportsLocalNoKey: false,
    capabilities: OPENAI_CAPABILITIES,
    fields: {
      showBaseUrl: true,
      showApiKey: true,
      showModelId: false,
      apiKeyPlaceholder: 'sk-...',
      baseUrlPlaceholder: 'https://api.openai.com/v1',
      helpText: 'Requires OpenAI API key.',
    },
  },
  google: {
    type: 'google',
    displayName: 'Google AI Studio',
    description: 'Google Gemini 2.0 Flash, Pro, and experimental models',
    defaultBaseUrl: GOOGLE_CAPABILITIES.defaultBaseUrl,
    requiresApiKey: true,
    supportsLocalNoKey: false,
    capabilities: GOOGLE_CAPABILITIES,
    fields: {
      showBaseUrl: true,
      showApiKey: true,
      showModelId: false,
      apiKeyPlaceholder: 'AIza...',
      baseUrlPlaceholder: 'https://generativelanguage.googleapis.com/v1beta',
      helpText: 'Uses Google AI Studio API key.',
    },
  },
  deepseek: {
    type: 'deepseek',
    displayName: 'DeepSeek',
    description: 'DeepSeek V3, R1, and chat models',
    defaultBaseUrl: DEEPSEEK_CAPABILITIES.defaultBaseUrl,
    requiresApiKey: true,
    supportsLocalNoKey: false,
    capabilities: DEEPSEEK_CAPABILITIES,
    fields: {
      showBaseUrl: true,
      showApiKey: true,
      showModelId: false,
      apiKeyPlaceholder: 'sk-...',
      baseUrlPlaceholder: 'https://api.deepseek.com/v1',
      helpText: 'DeepSeek API key.',
    },
  },
  anthropic: {
    type: 'anthropic',
    displayName: 'Anthropic',
    description: 'Claude 3.5 Haiku, Sonnet, Opus',
    defaultBaseUrl: ANTHROPIC_CAPABILITIES.defaultBaseUrl,
    requiresApiKey: true,
    supportsLocalNoKey: false,
    capabilities: ANTHROPIC_CAPABILITIES,
    fields: {
      showBaseUrl: true,
      showApiKey: true,
      showModelId: false,
      apiKeyPlaceholder: 'sk-ant-...',
      baseUrlPlaceholder: 'https://api.anthropic.com/v1',
      helpText: 'Anthropic Claude API key.',
    },
  },
  xai: {
    type: 'xai',
    displayName: 'xAI',
    description: 'Grok models via xAI API',
    defaultBaseUrl: XAI_CAPABILITIES.defaultBaseUrl,
    requiresApiKey: true,
    supportsLocalNoKey: false,
    capabilities: XAI_CAPABILITIES,
    fields: {
      showBaseUrl: true,
      showApiKey: true,
      showModelId: false,
      apiKeyPlaceholder: 'xai-...',
      baseUrlPlaceholder: 'https://api.x.ai/v1',
      helpText: 'xAI Grok API key.',
    },
  },
  mistral: {
    type: 'mistral',
    displayName: 'Mistral',
    description: 'Mistral Large, Medium, Small, and open-weight models',
    defaultBaseUrl: MISTRAL_CAPABILITIES.defaultBaseUrl,
    requiresApiKey: true,
    supportsLocalNoKey: false,
    capabilities: MISTRAL_CAPABILITIES,
    fields: {
      showBaseUrl: true,
      showApiKey: true,
      showModelId: false,
      apiKeyPlaceholder: '...',
      baseUrlPlaceholder: 'https://api.mistral.ai/v1',
      helpText: 'Mistral API key.',
    },
  },
  groq: {
    type: 'groq',
    displayName: 'Groq',
    description: 'Fast inference for Llama, Mixtral, Gemma',
    defaultBaseUrl: GROQ_CAPABILITIES.defaultBaseUrl,
    requiresApiKey: true,
    supportsLocalNoKey: false,
    capabilities: GROQ_CAPABILITIES,
    fields: {
      showBaseUrl: true,
      showApiKey: true,
      showModelId: false,
      apiKeyPlaceholder: 'gsk_...',
      baseUrlPlaceholder: 'https://api.groq.com/openai/v1',
      helpText: 'Groq API key.',
    },
  },
  ollama: {
    type: 'ollama',
    displayName: 'Ollama',
    description: 'Local LLM runtime (Llama, Qwen, Mistral, etc.)',
    defaultBaseUrl: OLLAMA_CAPABILITIES.defaultBaseUrl,
    requiresApiKey: false,
    supportsLocalNoKey: true,
    capabilities: OLLAMA_CAPABILITIES,
    fields: {
      showBaseUrl: true,
      showApiKey: false,
      showModelId: false,
      baseUrlPlaceholder: 'http://127.0.0.1:11434/v1',
      helpText: 'Local Ollama instance. No API key required.',
    },
  },
  custom: {
    type: 'custom',
    displayName: 'OpenAI-Compatible / Custom',
    description: 'Any OpenAI-compatible API endpoint',
    defaultBaseUrl: CUSTOM_CAPABILITIES.defaultBaseUrl,
    requiresApiKey: false,
    supportsLocalNoKey: true,
    capabilities: CUSTOM_CAPABILITIES,
    fields: {
      showBaseUrl: true,
      showApiKey: true,
      showModelId: true,
      apiKeyPlaceholder: 'Optional API key',
      baseUrlPlaceholder: 'http://localhost:11434/v1',
      modelIdPlaceholder: 'model-id (optional)',
      helpText: 'Generic OpenAI-compatible endpoint.',
    },
  },
};

export function getProviderTypeDefinition(type: ProviderType): ProviderTypeDefinition {
  return BUILTIN_PROVIDER_TYPES[type];
}

export function getDefaultCapabilities(type: ProviderType): ProviderCapabilities {
  return BUILTIN_PROVIDER_TYPES[type]?.capabilities || CUSTOM_CAPABILITIES;
}

export function getProviderDisplayName(type: ProviderType): string {
  return BUILTIN_PROVIDER_TYPES[type]?.displayName || type;
}

export const ALL_PROVIDER_TYPES: ProviderType[] = [
  'openrouter',
  'openai',
  'google',
  'deepseek',
  'anthropic',
  'xai',
  'mistral',
  'groq',
  'ollama',
  'custom',
];
