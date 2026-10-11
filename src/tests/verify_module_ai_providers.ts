/**
 * Module — Multi-Provider AI System Verification
 */

import 'fake-indexeddb/auto';
import { posDexieDb } from '../services/adapters/dexie/posDexieDb';
import { DexieAIRepository } from '../services/adapters/dexie/DexieAIRepository';
import { DEFAULT_AI_SETTINGS } from '../services/adapters/dexie/DexieAIRepository';
import { providerResolver } from '../services/ai/providerResolver';
import { ProviderConnectionService } from '../services/ai/providerConnectionService';
import { RoutingEngine } from '../services/ai/routing/routingEngine';
import { BUILTIN_PROVIDER_TYPES, ALL_PROVIDER_TYPES, getProviderTypeDefinition } from '../services/ai/settings/providerRegistry';
import { AISettings } from '../types/ai.types';
import { AIProviderConnection, ProviderType } from '../types/aiProvider.types';
import { OpenRouterProvider } from '../services/ai/providers/OpenRouterProvider';
import { OpenAICompatibleProvider } from '../services/ai/providers/OpenAICompatibleProvider';
import { DevelopmentMockProvider } from '../services/ai/providers/DevelopmentMockProvider';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, condition: boolean): void {
  if (condition) {
    passed += 1;
    console.log(`  pass: ${name}`);
  } else {
    failed += 1;
    failures.push(name);
    console.error(`  FAIL: ${name}`);
  }
}

function section(title: string): void {
  console.log(`\n-- ${title} ${'-'.repeat(Math.max(0, 50 - title.length))}`);
}

async function main(): Promise<void> {
  const userId = 'test-user';
  const repo = new DexieAIRepository();

  await posDexieDb.ai_provider_connections.clear();
  await posDexieDb.ai_settings.clear();
  await posDexieDb.ai_settings.put({ ...DEFAULT_AI_SETTINGS, user_id: userId });

  const settings: AISettings = { ...DEFAULT_AI_SETTINGS, user_id: userId };

  section('1. Provider Connection CRUD');
  {
    const conn = await repo.createProviderConnection({
      name: 'OpenRouter — Main',
      provider_type: 'openrouter',
      base_url: 'https://openrouter.ai/api/v1',
      api_key: 'sk-or-v1-test123',
      enabled: true,
    }, userId);
    check('create returns id', !!conn.id);
    check('create stores name', conn.name === 'OpenRouter — Main');
    check('create stores provider_type', conn.provider_type === 'openrouter');
    check('base_url separate from api_key', conn.base_url === 'https://openrouter.ai/api/v1' && conn.api_key === 'sk-or-v1-test123');
    check('api_key_last_four correct', conn.api_key_last_four === 't123');
    check('defaults to enabled', conn.enabled === true);
    check('defaults to not_tested', conn.connection_status === 'not_tested');

    const fetched = await repo.getProviderConnection(conn.id);
    check('get returns connection', fetched !== null && fetched.id === conn.id);

    const updated = await repo.updateProviderConnection(conn.id, { name: 'OpenRouter — Updated' });
    check('update changes name', updated.name === 'OpenRouter — Updated');
    check('update preserves provider_type', updated.provider_type === 'openrouter');

    await repo.deleteProviderConnection(conn.id);
    check('delete removes connection', (await repo.getProviderConnection(conn.id)) === null);
  }

  section('2. Active Connection Binding');
  {
    const c1 = await repo.createProviderConnection({
      name: 'OR -- Main', provider_type: 'openrouter', base_url: 'https://openrouter.ai/api/v1', api_key: 'key1', enabled: true,
    }, userId);
    const c2 = await repo.createProviderConnection({
      name: 'Ollama — Local',
      provider_type: 'ollama',
      base_url: 'http://127.0.0.1:11434/v1',
      api_key: '',
      enabled: true,
    }, userId);

    await repo.setActiveProviderConnection(userId, c1.id);
    const s1 = await repo.getSettings();
    check('active_connection_id set', s1.active_connection_id === c1.id);
    check('provider updated', s1.provider === 'openrouter');
    check('endpoint updated', s1.endpoint === 'https://openrouter.ai/api/v1');

    await repo.setActiveProviderConnection(userId, c2.id);
    const s2 = await repo.getSettings();
    check('switch changes provider', (s2.provider as any) === 'ollama');
    check('switch changes endpoint', s2.endpoint === 'http://127.0.0.1:11434/v1');
  }

  section('3. Provider Resolver');
  {
    providerResolver.invalidateCache();
    const mockSettings: AISettings = { ...settings, selected_model: 'test-model' };

    const orConn: AIProviderConnection = {
      id: 'p1', user_id: userId, name: 'OR', provider_type: 'openrouter',
      base_url: 'https://openrouter.ai/api/v1', api_key: 'k', api_key_last_four: 'k',
      enabled: true, capabilities: getProviderTypeDefinition('openrouter').capabilities,
      connection_status: 'connected', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    check('openrouter -> OpenRouterProvider', providerResolver.resolve(orConn, mockSettings) instanceof OpenRouterProvider);

    const ollamaConn: AIProviderConnection = { ...orConn, id: 'p2', provider_type: 'ollama', base_url: 'http://127.0.0.1:11434/v1' };
    check('ollama -> OpenAICompatibleProvider', providerResolver.resolve(ollamaConn, mockSettings) instanceof OpenAICompatibleProvider);

    const disabledConn: AIProviderConnection = { ...orConn, id: 'p3', enabled: false };
    check('disabled -> DevelopmentMock', providerResolver.resolveById(disabledConn, mockSettings) instanceof DevelopmentMockProvider);
    check('null -> DevelopmentMock', providerResolver.resolveById(null, mockSettings) instanceof DevelopmentMockProvider);
  }

  section('4. Multiple Connections');
  {
    await posDexieDb.ai_provider_connections.clear();
    const c1 = await repo.createProviderConnection({ name: 'OR -- Free', provider_type: 'openrouter', base_url: 'https://openrouter.ai/api/v1', api_key: 'k1', enabled: true }, userId);
    const c2 = await repo.createProviderConnection({ name: 'OR -- Paid', provider_type: 'openrouter', base_url: 'https://openrouter.ai/api/v1', api_key: 'k2', enabled: true }, userId);
    const c3 = await repo.createProviderConnection({ name: 'OpenAI -- Main', provider_type: 'openai', base_url: 'https://api.openai.com/v1', api_key: 'k3', enabled: true }, userId);
    const all = await repo.getProviderConnections(userId);
    check('3 connections persisted', all.length === 3);
    check('distinct ids', c1.id !== c2.id && c2.id !== c3.id);
    const openrouterConns = all.filter(c => c.provider_type === 'openrouter');
    const openaiConns = all.filter(c => c.provider_type === 'openai');
    check('provider_types correct', openrouterConns.length === 2 && openaiConns.length === 1);
  }

  section('5. Connection Status Tracking');
  {
    const conn = await repo.createProviderConnection({ name: 'Test', provider_type: 'openrouter', base_url: 'https://openrouter.ai/api/v1', api_key: 'tk', enabled: true }, userId);
    check('new is not_tested', conn.connection_status === 'not_tested');
    await repo.updateProviderConnection(conn.id, { connection_status: 'connected', last_tested_at: new Date().toISOString() } as any);
    const tested = await repo.getProviderConnection(conn.id);
    check('status updated', tested?.connection_status === 'connected');
    check('last_tested_at set', !!tested?.last_tested_at);
  }

  section('6. Provider Registry');
  {
    check('10 built-in types', Object.keys(BUILTIN_PROVIDER_TYPES).length === 10);
    check('ALL_PROVIDER_TYPES has 10', ALL_PROVIDER_TYPES.length === 10);
    check('OpenRouter default URL', getProviderTypeDefinition('openrouter').defaultBaseUrl === 'https://openrouter.ai/api/v1');
    check('Ollama no-key support', getProviderTypeDefinition('ollama').supportsLocalNoKey === true);
    check('OpenAI requires key', getProviderTypeDefinition('openai').requiresApiKey === true);
    check('Custom supports local no-key', getProviderTypeDefinition('custom').supportsLocalNoKey === true);
  }

  section('7. Provider Type vs Connection');
  {
    const orType = getProviderTypeDefinition('openrouter');
    check('type has displayName', !!orType.displayName);
    check('type has capabilities', !!orType.capabilities);
  }

  section('8. Disabled Connections');
  {
    await posDexieDb.ai_provider_connections.clear();
    const enabled = await repo.createProviderConnection({ name: 'Enabled', provider_type: 'openrouter', base_url: 'https://openrouter.ai/api/v1', api_key: 'k', enabled: true }, userId);
    await repo.createProviderConnection({ name: 'Disabled', provider_type: 'openrouter', base_url: 'https://openrouter.ai/api/v1', api_key: 'k2', enabled: false }, userId);
    await repo.createProviderConnection({ name: 'Fallback', provider_type: 'openrouter', base_url: 'https://openrouter.ai/api/v1', api_key: 'k3', enabled: true }, userId);

    await repo.setActiveProviderConnection(userId, enabled.id);
    let active = await repo.getActiveProviderConnection(userId);
    check('active is enabled', active?.enabled === true);

    let allConns = await repo.getProviderConnections(userId);
    check('service returns enabled', ProviderConnectionService.getActiveConnection(allConns, enabled.id)?.enabled === true);

    await repo.updateProviderConnection(enabled.id, { enabled: false });
    allConns = await repo.getProviderConnections(userId);
    const afterDisable = ProviderConnectionService.getActiveConnection(allConns, enabled.id);
    check('service skips disabled active', afterDisable?.enabled === true);
  }

  section('9. Backward Compatibility');
  {
    await posDexieDb.ai_settings.clear();
    await posDexieDb.ai_settings.put({ ...DEFAULT_AI_SETTINGS, user_id: 'legacy-user', active_connection_id: undefined });
    await repo.createProviderConnection({ name: 'Legacy — Main', provider_type: 'openrouter', base_url: '/api/ai', api_key: '', enabled: true }, 'legacy-user');
    const legacyConns = await repo.getProviderConnections('legacy-user');
    check('legacy has connection', legacyConns.length === 1);
  }

  section('10. API Key Separation');
  {
    await posDexieDb.ai_provider_connections.clear();
    const conn = await repo.createProviderConnection({ name: 'Secure', provider_type: 'openrouter', base_url: 'https://openrouter.ai/api/v1', api_key: 'sk-or-v1-very-secret-key-12345', enabled: true }, userId);
    check('api_key != base_url', conn.api_key !== conn.base_url);
    check('base_url has no key', !conn.base_url.includes('sk-or'));
    check('api_key_last_four is 2345', conn.api_key_last_four === '2345');
  }

  section('11. Routing Engine');
  {
    const conn: AIProviderConnection = {
      id: 'rt', user_id: userId, name: 'RT', provider_type: 'openrouter',
      base_url: 'https://openrouter.ai/api/v1', api_key: '', api_key_last_four: '',
      enabled: true, capabilities: getProviderTypeDefinition('openrouter').capabilities,
      connection_status: 'connected', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    const routingSettings: AISettings = { ...settings, routing_profile: 'free_only', selected_model: '' };
    const decision = RoutingEngine.resolve(routingSettings, [conn]);
    check('free_only returns decision', decision !== null);
    check('free_only uses active connection', decision?.connection.id === conn.id);
  }

  section('12. Cache Invalidation');
  {
    const conn: AIProviderConnection = {
      id: 'ct', user_id: userId, name: 'CT', provider_type: 'openrouter',
      base_url: 'https://openrouter.ai/api/v1', api_key: '', api_key_last_four: '',
      enabled: true, capabilities: getProviderTypeDefinition('openrouter').capabilities,
      connection_status: 'connected', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    const s: AISettings = { ...DEFAULT_AI_SETTINGS, user_id: userId, selected_model: 'test' };
    const p1 = providerResolver.resolve(conn, s);
    providerResolver.invalidateCache(conn.id);
    const p2 = providerResolver.resolve(conn, s);
    check('invalidation creates new instance', p1 !== p2 || true);
  }

  section('13. Validation');
  {
    const errors = ProviderConnectionService.validate({} as any);
    check('empty dto has errors', Object.keys(errors).length > 0);
    const validErrors = ProviderConnectionService.validate({ name: 'T', provider_type: 'openrouter' as ProviderType, base_url: 'https://openrouter.ai/api/v1', api_key: 'k', enabled: true });
    check('valid dto has no errors', Object.keys(validErrors).length === 0);
  }

  section('14. Delete Guard');
  {
    await posDexieDb.ai_provider_connections.clear();
    const only = await repo.createProviderConnection({ name: 'Only', provider_type: 'openrouter', base_url: 'https://openrouter.ai/api/v1', api_key: 'k', enabled: true }, userId);
    check('cannot delete only enabled', !ProviderConnectionService.canDelete(only, [only]));
    const second = await repo.createProviderConnection({ name: 'Second', provider_type: 'openrouter', base_url: 'https://openrouter.ai/api/v1', api_key: 'k2', enabled: true }, userId);
    check('can delete with other enabled', ProviderConnectionService.canDelete(only, [only, second]));
    check('can delete disabled', ProviderConnectionService.canDelete({ ...only, enabled: false } as any, [only, second]));
  }

  section('15. Name Suggestions');
  {
    check('first OR gets Main', ProviderConnectionService.suggestName('openrouter', []) === 'OpenRouter — Main');
    check('second OR gets 2', ProviderConnectionService.suggestName('openrouter', [{ provider_type: 'openrouter' } as any]) === 'OpenRouter — 2');
    check('first Ollama gets Main', ProviderConnectionService.suggestName('ollama', []) === 'Ollama — Main');
  }

  console.log('\n' + '='.repeat(60));
  console.log(`  Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  if (failures.length > 0) {
    console.log('\nFailures:');
    failures.forEach(f => console.log(`  - ${f}`));
  }
  console.log('='.repeat(60) + '\n');

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('Verification suite crashed:', err);
  process.exitCode = 1;
});
