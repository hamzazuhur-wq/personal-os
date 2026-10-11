# AI Intelligence Settings — Multi-Provider System Plan

## A. Current Provider Architecture

- **Binary selection**: `AISettings.provider` is `'openrouter' | 'mock'` only.
- **Singleton settings**: One `AISettings` row (`id: 'default'`) stores all AI configuration.
- **Provider instantiation**: `PersonalAgentCore.configureFromSettings(settings)` creates either `OpenRouterProvider` or `DevelopmentMockProvider` based on the boolean `provider` field.
- **IAIProvider interface**: Clean abstraction with `generateResponse()` and optional `getAvailableModels()`. Only 2 implementations exist: `OpenRouterProvider` (real) and `DevelopmentMockProvider` (fake).
- **No provider registry**: Providers are hard-coded in `agentCore.ts` — no dynamic discovery or extensibility.
- **Agent Core holds provider as instance field**: `private provider: IAIProvider` — set once at configuration time, not resolved per-request.

## B. Current Settings Data Model

`AISettings` (single row in `ai_settings` table):
- `provider`: `'openrouter' | 'mock'`
- `endpoint`: string (default `/api/ai`)
- `custom_headers`: optional key-value pairs
- `model_mode`: `'auto' | 'manual' | 'free_only'`
- `selected_model`: string
- `fallback_model`: string
- `fallback_enabled`: boolean
- `routing_profile`: `'cost_optimized' | 'balanced' | 'quality_first' | 'free_only' | 'manual'`
- Generation: `temperature`, `max_output_tokens`, `streaming`
- Context: `auto_context`, `context_depth`, `max_retrieved_records`, `include_activities`, `include_archived_data`, `include_memories`
- Memory: `memory_retrieval_enabled`, `memory_candidate_detection`, `always_require_confirmation`
- Safety: `action_policy`, `never_allow_destructive`
- Privacy: `show_context_sources`, `show_context_summary`, `minimize_context`, `conversation_retention_days`
- Metrics: `total_requests`, `failed_requests`, `fallback_count`, `last_used_provider`, `last_used_model`, `last_connected_at`

**No credential fields exist.** No `api_key`, `apiKey`, `secret`, or similar.

## C. Current API Key Handling

**There is no API key handling.**

- `OpenRouterProvider.generateResponse()` sends headers: `{ 'Content-Type': 'application/json', ...settings.custom_headers }`. **No Authorization header.**
- `AISettingsService.testConnection()` sends the same headers — **no auth.**
- Comments claim "API key lives server-side, ZERO client-side secrets" but no backend/proxy exists in this repo.
- `custom_headers` is a general-purpose escape hatch that *could* carry auth, but is undocumented as such and would be stored plaintext in IndexedDB.
- No encryption, no keystore, no secure storage mechanism exists.

## D. Current Backend/Proxy

**None exists.** No `src/app/api/`, `server/`, `functions/`, `proxy/`, or similar directories. The default `endpoint` is `/api/ai` which would 404 in a static deployment. The architecture *assumes* a backend proxy will be deployed later (Hostinger-ready comment), but it's not implemented.

## E. Current Model Discovery

- **OpenRouter-only**: `fetchLiveOpenRouterModels(endpoint)` queries `${endpoint}/models`.
- **Static fallback**: `STATIC_OPENROUTER_MODELS` — hard-coded catalog of ~10 models with capability metadata.
- **Merge strategy**: Static curated models first, then live models appended.
- **No other providers**: No OpenAI, Google, Anthropic, Ollama, DeepSeek model discovery.
- **No caching**: Every call fetches fresh from endpoint (or returns static).

## F. Current Provider Implementations

| Provider | Class | Real? | Notes |
|----------|-------|-------|-------|
| OpenRouter | `OpenRouterProvider` | Yes | Only real provider. OpenAI-compatible `/chat/completions`. |
| Development Mock | `DevelopmentMockProvider` | No | Keyword-based scripted responses for testing. |
| Idea Mock | `IdeaMockProvider` | No | Scoped to Idea workspace only. Arabic/English edit intents. |

No other providers (OpenAI, Google, Anthropic, DeepSeek, Mistral, Groq, Ollama) have adapters.

## G. Settings That Are Fake/Partially Wired

| Setting | Status | Issue |
|---------|--------|-------|
| `provider` dropdown | Partially wired | Only `openrouter` vs `mock`. No real multi-provider. |
| `endpoint` | Partially wired | Used by OpenRouterProvider, but no backend exists. |
| `custom_headers` | Unwired | Stored but never used for auth (no Bearer header). |
| `selected_model` | Wired | Passed to provider, but model list is OpenRouter-only static. |
| `fallback_model` | Wired | Works within OpenRouterProvider only. |
| `routing_profile` | Fake | Only influences `getRecommendedModelForProfile()` in model catalog. Does not affect runtime provider resolution. |
| `model_mode` (auto/manual/free_only) | Partially wired | Auto selects model from catalog, but only OpenRouter models. |
| `free_only` | Partially wired | Filters static catalog, but no live free-model verification per provider. |
| Connection test | Fake | Sends request with no auth. Would fail against real OpenRouter. |
| Model discovery | Partially wired | Only works if `/api/ai/models` proxy is deployed. |
| API key | Missing | No field, no storage, no transmission. |
| Multi-provider | Missing | Single provider only. |

## H. Exact Files to Modify/Create

### Create:
1. `src/types/aiProvider.types.ts` — Provider connection types, provider type registry, capability contract
2. `src/services/ai/providers/providerRegistry.ts` — Built-in provider type definitions
3. `src/services/ai/providers/OpenAICompatibleProvider.ts` — Generic OpenAI-compatible adapter (covers DeepSeek, Groq, Mistral, custom)
4. `src/services/ai/providerResolver.ts` — Runtime resolver: connectionId → concrete provider instance
5. `src/services/ai/modelDiscovery.ts` — Per-provider model discovery (OpenRouter, OpenAI, Ollama, generic)
6. `src/services/ai/providerConnectionService.ts` — CRUD + test for provider connections
7. `src/services/ai/routing/routingEngine.ts` — Real routing logic over connections
8. `src/features/ai/components/ProviderConnectionForm.tsx` — Add/edit provider connection UI
9. `src/features/ai/components/ProviderConnectionList.tsx` — List of configured connections
10. `src/features/ai/components/ModelSelector.tsx` — Dynamic model selector dependent on provider
11. `src/tests/verify_module_ai_providers.ts` — Verification suite

### Modify:
1. `src/types/ai.types.ts` — Extend `AISettings` with `active_connection_id`, move provider-specific fields to connections
2. `src/services/adapters/dexie/posDexieDb.ts` — Add `provider_connections` table (v16)
3. `src/services/adapters/dexie/DexieAIRepository.ts` — Add provider connection CRUD methods
4. `src/services/contracts/IAIRepository.ts` — Add provider connection contract methods
5. `src/services/ai/providers/IAIProvider.ts` — Extend interface with `getModels()`, `testConnection()`, capability metadata
6. `src/services/ai/agent/agentCore.ts` — Use `providerResolver` instead of hard-coded switch
7. `src/services/ai/agent/ideaAgentCore.ts` — Same resolver pattern
8. `src/services/ai/settings/aiSettingsService.ts` — Update validation for multi-provider
9. `src/services/ai/settings/modelCatalog.ts` — Deprecate OpenRouter-only assumptions
10. `src/services/ai/tools/toolRegistry.ts` — Add provider management tools if needed
11. `src/hooks/useAISettings.ts` — Extend to manage provider connections
12. `src/features/ai/components/AISettingsPanel.tsx` — Major refactor for provider connections UI

### Do NOT modify:
- `src/services/ai/providers/OpenRouterProvider.ts` — Preserve existing implementation, make it connection-aware
- `src/services/ai/providers/DevelopmentMockProvider.ts` — Preserve
- `src/services/ai/providers/IdeaMockProvider.ts` — Preserve
- Module 09 analytics — untouched
- Domain repositories — untouched

## I. Required Schema Changes

**New table: `provider_connections`** (Dexie v16)

```typescript
provider_connections: {
  id: string;
  user_id: string;
  name: string;              // "OpenRouter — Main"
  provider_type: string;     // "openrouter" | "openai" | "google" | "deepseek" | "anthropic" | "xai" | "mistral" | "groq" | "ollama" | "custom"
  base_url: string;          // NEVER the API key
  api_key: string;           // PLAINTEXT WARNING: see Security Boundary
  api_key_last_four?: string; // For display only
  enabled: boolean;
  capabilities: string;      // JSON: { modelDiscovery: true, requiresApiKey: true, supportsStreaming: true, ... }
  connection_status: string; // "not_tested" | "connected" | "auth_failed" | "endpoint_unavailable"
  last_tested_at?: string;
  last_tested_error?: string;
  created_at: string;
  updated_at: string;
}
```

**Migration path:**
1. Add v16 with new table
2. Backfill: existing `AISettings.endpoint` + `AISettings.custom_headers` → create one default `provider_connections` row for existing users
3. New `AISettings` fields: `active_connection_id?: string`
4. Legacy fields (`provider`, `endpoint`, `custom_headers`) become deprecated but retained for backward compatibility during transition

## J. Migration Plan

**Phase 1 — Types & Schema (non-breaking)**
- Add new types (`AIProviderType` expanded, `AIProviderConnection`, `ProviderCapabilities`)
- Add v16 schema with `provider_connections` table
- Backfill existing settings into a default connection
- Add `active_connection_id` to `AISettings`

**Phase 2 — Provider Layer (internal refactor)**
- Create `providerRegistry.ts` with built-in provider type metadata
- Create `OpenAICompatibleProvider` that adapts any OpenAI-compatible API
- Extend `IAIProvider` with `getModels()`, `testConnection()`, capability getters
- Create `providerResolver.ts` — resolves `connectionId` to concrete `IAIProvider`
- Update `agentCore.ts` to use resolver
- Preserve `OpenRouterProvider` as the specialized OpenRouter implementation

**Phase 3 — Model Discovery**
- Create `modelDiscovery.ts` with per-provider discovery strategies
- OpenRouter: `/models` endpoint
- OpenAI: `/v1/models` endpoint
- Ollama: `/api/tags` endpoint
- Generic OpenAI-compatible: `/v1/models` endpoint
- Static fallback catalogs per provider type

**Phase 4 — Settings UI**
- Refactor `AISettingsPanel.tsx` tabs
- New "Connections" tab: list + add/edit/test/delete connections
- Model selector becomes dependent on active connection
- Generation/context/safety tabs preserved but wired to active connection

**Phase 5 — Routing**
- Implement `routingEngine.ts` with real fallback logic
- `free_only`: filter to free models from active connection's catalog
- `cost_optimized`: prefer cheapest models
- `quality_first`: prefer highest-context models
- `balanced`: compromise
- `manual`: user selects explicitly

**Phase 6 — Verification**
- Multi-provider CRUD tests
- Connection test tests (valid/invalid)
- Model discovery tests per provider type
- Routing behavior tests
- Runtime binding tests
- Security audit (no keys in logs/bundles)

## K. Security Boundary

**Current reality: NO secure boundary exists.**

- All data lives in browser IndexedDB (Dexie), unencrypted.
- No backend proxy, no server-side key injection.
- Any API key stored would be readable by anyone with device access.

**Minimum safe mechanism for current architecture:**

1. **Never store API keys in plaintext in the UI-visible settings row.** Use a separate `provider_connections` table with a clear warning in the UI: "Credentials are stored locally in your browser. Use a backend proxy for production."

2. **Never log API keys.** Add a credential-scrubbing middleware before any `console.log`, audit event, or error report.

3. **Never include keys in bundles.** The build already tree-shakes; ensure no credential fields are serialized into production chunks.

4. **Use `custom_headers` pattern carefully.** If a provider needs auth, the connection form should construct the `Authorization: Bearer <key>` header internally — the key never appears in URLs, only in the `api_key` field and the derived header.

5. **Display only last 4 characters** of API keys in UI.

6. **Redact in errors**: Any error from the provider must have keys stripped before display.

7. **Future backend proxy**: When `/api/ai` is deployed, the browser sends requests to the proxy WITHOUT a key; the proxy injects it. The `api_key` field becomes optional (only needed for direct connections).

**Explicit report to user**: The current architecture has NO server-side secret storage. IndexedDB is not encrypted. API keys would be visible in DevTools. This must be documented in the UI and addressed by deploying the planned backend proxy.

## L. Runtime Request Path

**Before (current):**
```
UI → AISettings (single row) → agentCore.configureFromSettings() → 
new OpenRouterProvider(settings) → fetch(endpoint, { headers: { Content-Type } }) → 
/api/ai/chat/completions (no auth)
```

**After (target):**
```
UI → AISettings.active_connection_id → providerResolver.resolve(connectionId) →
concrete provider (OpenRouterProvider / OpenAICompatibleProvider / etc.) →
fetch(baseUrl, { headers: { Authorization: `Bearer ${apiKey}`, ... } }) →
actual provider endpoint
```

**Key changes:**
- `agentCore` no longer reads raw `AISettings.provider`/`endpoint` directly
- `providerResolver` is the ONLY entry point for provider instantiation
- Each request uses the resolved connection's `baseUrl` + `api_key`
- Connection test uses the same resolver path

## M. Implementation Order

1. **Types & Registry** — `aiProvider.types.ts`, `providerRegistry.ts` with all built-in provider metadata
2. **Schema** — v16 migration, `provider_connections` table, backfill migration
3. **Repository** — `IAIRepository` + `DexieAIRepository` provider connection CRUD
4. **Generic Provider** — `OpenAICompatibleProvider` for OpenAI, DeepSeek, Groq, Mistral, custom
5. **Resolver** — `providerResolver.ts` with connection → provider mapping
6. **Agent Core** — Refactor to use resolver (preserve existing `OpenRouterProvider` for OpenRouter-specific features)
7. **Model Discovery** — Per-provider discovery with static fallbacks
8. **Connection Service** — CRUD + test + status tracking
9. **UI — Connections** — ProviderConnectionList + ProviderConnectionForm
10. **UI — Settings Panel** — Refactor tabs, dynamic model selector
11. **Routing Engine** — Real fallback/free-only/cost-aware routing
12. **Security** — Credential scrubbing, display redaction, UI warnings
13. **Verification** — Full test suite
14. **Regression** — Module 09, existing AI tests

## N. Verification Strategy

**Unit tests (new `verify_module_ai_providers.ts`):**
1. Add OpenRouter connection → persists
2. Add second OpenRouter connection → both exist
3. Add OpenAI connection → persists with correct type
4. Add Ollama connection → no API key required
5. Add custom OpenAI-compatible connection → persists
6. Edit connection → updates without creating duplicate
7. Rename connection → name changes
8. Disable connection → `enabled = false`
9. Delete unused connection → removed
10. Delete active connection → falls back to first enabled
11. Test valid connection → status = connected
12. Test invalid API key → status = auth_failed
13. Test invalid URL → status = endpoint_unavailable
14. Discover models for OpenRouter → returns models
15. Discover models for Ollama → returns local models
16. Switch active connection → agent uses new provider
17. Model list changes per provider
18. Select model → persists
19. Send real AI request → uses correct provider + model
20. Verify routing profile changes behavior
21. Free-only prevents paid fallback
22. Generation settings reach request
23. Usage records provider + model
24. No API key in console logs
25. No API key in dist bundle
26. Refresh persistence
27. No console errors
28. Typecheck
29. Production build

**Regression tests:**
- Module 09 analytics untouched
- Existing AI conversation flow works
- Idea agent works
- Mock provider still works for tests
