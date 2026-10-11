import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAIRepo } from '../app/providers/RepositoryProvider';
import { AISettings, UpdateAISettingsDTO, AIUsagePeriodSummary, AIRequestLog, ModelCapabilityMeta } from '../types/ai.types';
import { AIProviderConnection } from '../types/aiProvider.types';
import { ProviderConnectionAPI, ProviderConnectionService } from '../services/ai/providerConnectionService';

export function useAISettings(): {
    settings: AISettings | null;
    loading: boolean;
    isSaving: boolean;
    error: string | null;
    connections: AIProviderConnection[];
    editingConnection: AIProviderConnection | null;
    setEditingConnection: React.Dispatch<React.SetStateAction<AIProviderConnection | null>>;
    updateSettings: (updates: UpdateAISettingsDTO) => Promise<void>;
    reloadUsage: (period: 'today' | 'this_week' | 'this_month' | 'all') => Promise<void>;
    usagePeriod: 'today' | 'this_week' | 'this_month' | 'all';
    setUsagePeriod: React.Dispatch<React.SetStateAction<'today' | 'this_week' | 'this_month' | 'all'>>;
    usageSummary: AIUsagePeriodSummary | null;
    recentLogs: AIRequestLog[];
    loadingUsage: boolean;
    modelCatalog: ModelCapabilityMeta[];
    catalogIsLive: boolean;
    catalogMessage: string;
    loadingCatalog: boolean;
    reloadModelCatalog: (endpoint?: string) => Promise<void>;
    createConnection: (dto: any) => Promise<any | null>;
    updateConnection: (id: string, dto: any) => Promise<any>;
    deleteConnection: (id: string) => Promise<void>;
    testProviderConnection: (connection: AIProviderConnection) => Promise<any>;
    setActiveConnection: (connectionId: string) => Promise<void>;
    refreshModels: () => Promise<void>;
    activeConnection: AIProviderConnection | null;
    testingId: string | null;
    testError: string | null;
    setTestError: React.Dispatch<React.SetStateAction<string | null>>;
    errors: Record<string, string>;
  } {
  const aiRepo = useAIRepo();

  // Settings state
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const errors: Record<string, string> = {}; // Placeholder for future validation


  // Provider connections state
  const [connections, setConnections] = useState<AIProviderConnection[]>([]);
  const [editingConnection, setEditingConnection] = useState<AIProviderConnection | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  // Model catalog state
  const [modelCatalog, setModelCatalog] = useState<ModelCapabilityMeta[]>([]);
  const [catalogIsLive, setCatalogIsLive] = useState<boolean>(false);
  const [catalogMessage, setCatalogMessage] = useState<string>('');
  const [loadingCatalog, setLoadingCatalog] = useState<boolean>(false);

  // Usage state
  const [usagePeriod, setUsagePeriod] = useState<'today' | 'this_week' | 'this_month' | 'all'>('today');
  const [usageSummary, setUsageSummary] = useState<AIUsagePeriodSummary | null>(null);
  const [recentLogs, setRecentLogs] = useState<AIRequestLog[]>([]);
  const [loadingUsage, setLoadingUsage] = useState<boolean>(false);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const loadedSettings = await aiRepo.getSettings();
      let backendConnections: AIProviderConnection[] = [];
      try {
        backendConnections = await ProviderConnectionAPI.list();
      } catch {
        // Backend unreachable: fall back to local Dexie cache so the UI still works offline.
        const loadedConnections = await aiRepo.getProviderConnections(loadedSettings.user_id);
        setSettings(loadedSettings);
        setConnections(loadedConnections);
        setLoading(false);
        return;
      }

      setSettings(loadedSettings);

      // Backend is authority: remove Dexie entries that no longer exist in the backend.
      const backendIds = new Set(backendConnections.map(c => c.id));
      const localConnections = await aiRepo.getProviderConnections(loadedSettings.user_id).catch(() => []);
      for (const local of localConnections) {
        if (!backendIds.has(local.id)) {
          await aiRepo.deleteProviderConnection(local.id).catch(() => {});
        }
      }

      // Sync backend connections to local Dexie cache so agentCore can resolve them
      for (const conn of backendConnections) {
        const existing = await aiRepo.getProviderConnection(conn.id).catch(() => null);
        if (!existing) {
          await aiRepo.createProviderConnection({
            ...conn,
            api_key: '',
            capabilities: conn.capabilities || {},
          } as any, loadedSettings.user_id).catch(() => {});
        }
      }

      // NORMALIZE ACTIVE CONNECTION ID
      // The backend is the source of truth. If the stored active_connection_id
      // does not exist on the backend, clear it so the UI and runtime never
      // use a stale local/IndexedDB connection ID.
      const canonicalActiveId = ProviderConnectionService.resolveActiveBackendConnectionId(
        loadedSettings.active_connection_id,
        backendConnections
      );
      if (canonicalActiveId !== loadedSettings.active_connection_id) {
        await aiRepo.updateSettings({ active_connection_id: undefined } as UpdateAISettingsDTO);
        loadedSettings.active_connection_id = undefined;
      }

      const loadedConnections = await aiRepo.getProviderConnections(loadedSettings.user_id);
      setConnections(loadedConnections);
    } catch (err) {
      setError('Failed to load settings');
      console.error('useAISettings loadData error:', err);
    } finally {
      setLoading(false);
    }
  }, [aiRepo]);

  // Update settings
  const updateSettings = useCallback(async (updates: UpdateAISettingsDTO) => {
    setIsSaving(true);
    setError(null);
    try {
      const updated = await aiRepo.updateSettings(updates);
      setSettings(updated);
    } catch (err) {
      setError('Failed to save settings');
      console.error('useAISettings updateSettings error:', err);
    } finally {
      setIsSaving(false);
    }
  }, [aiRepo]);

  // Provider connections CRUD (backend is authority; Dexie is local cache for agentCore)
  const createConnection = useCallback(async (dto: any) => {
    if (!settings) return null;
    try {
      const created = await ProviderConnectionAPI.create(dto);
      // Sync to local Dexie cache so agentCore can resolve the connection
      await aiRepo.createProviderConnection({
        ...created,
        api_key: dto.api_key || '',
        capabilities: created.capabilities || {},
      } as any, settings.user_id).catch(() => {});
      // Reload from backend to stay in sync
      const reloaded = await ProviderConnectionAPI.list().catch(() => []);
      const localConnections = await aiRepo.getProviderConnections(settings.user_id);
      const backendIds = new Set(reloaded.map(c => c.id));
      for (const local of localConnections) {
        if (!backendIds.has(local.id)) {
          await aiRepo.deleteProviderConnection(local.id).catch(() => {});
        }
      }
      for (const conn of reloaded) {
        const existing = await aiRepo.getProviderConnection(conn.id).catch(() => null);
        if (!existing) {
          await aiRepo.createProviderConnection({
            ...conn,
            api_key: '',
            capabilities: conn.capabilities || {},
          } as any, settings.user_id).catch(() => {});
        }
      }
      const finalConnections = await aiRepo.getProviderConnections(settings.user_id);
      setConnections(finalConnections);
      return created;
    } catch (err) {
      console.error('useAISettings createConnection error:', err);
      throw err;
    }
  }, [aiRepo, settings]);

  const updateConnection = useCallback(async (id: string, dto: any) => {
    try {
      const updated = await ProviderConnectionAPI.update(id, dto);
      // Sync to local Dexie cache
      await aiRepo.updateProviderConnection(id, {
        ...updated,
        api_key: dto.api_key !== undefined ? dto.api_key : undefined,
        capabilities: updated.capabilities || {},
      } as any).catch(() => {});
      // Reload from backend to stay in sync
      if (settings) {
        const reloaded = await ProviderConnectionAPI.list().catch(() => []);
        const localConnections = await aiRepo.getProviderConnections(settings.user_id);
        const backendIds = new Set(reloaded.map(c => c.id));
        for (const local of localConnections) {
          if (!backendIds.has(local.id)) {
            await aiRepo.deleteProviderConnection(local.id).catch(() => {});
          }
        }
        for (const conn of reloaded) {
          const existing = await aiRepo.getProviderConnection(conn.id).catch(() => null);
          if (!existing) {
            await aiRepo.createProviderConnection({
              ...conn,
              api_key: '',
              capabilities: conn.capabilities || {},
            } as any, settings.user_id).catch(() => {});
          }
        }
        const finalConnections = await aiRepo.getProviderConnections(settings.user_id);
        setConnections(finalConnections);
      }
      if (editingConnection && editingConnection.id === id) {
        setEditingConnection(updated);
      }
      return updated;
    } catch (err) {
      console.error('useAISettings updateConnection error:', err);
      throw err;
    }
  }, [aiRepo, editingConnection, settings]);

  const deleteConnection = useCallback(async (id: string) => {
    try {
      await ProviderConnectionAPI.delete(id);
      await aiRepo.deleteProviderConnection(id).catch(() => {});
      // Reload from backend to stay in sync
      if (settings) {
        const reloaded = await ProviderConnectionAPI.list().catch(() => []);
        const localConnections = await aiRepo.getProviderConnections(settings.user_id);
        const backendIds = new Set(reloaded.map(c => c.id));
        for (const local of localConnections) {
          if (!backendIds.has(local.id)) {
            await aiRepo.deleteProviderConnection(local.id).catch(() => {});
          }
        }
        for (const conn of reloaded) {
          const existing = await aiRepo.getProviderConnection(conn.id).catch(() => null);
          if (!existing) {
            await aiRepo.createProviderConnection({
              ...conn,
              api_key: '',
              capabilities: conn.capabilities || {},
            } as any, settings.user_id).catch(() => {});
          }
        }
        const finalConnections = await aiRepo.getProviderConnections(settings.user_id);
        setConnections(finalConnections);
      }
      if (editingConnection && editingConnection.id === id) {
        setEditingConnection(null);
      }
      // If deleted connection was active, try to set another enabled one
      if (settings && settings.active_connection_id === id) {
        const otherEnabled = connections.filter(c => c.id !== id && c.enabled);
        if (otherEnabled.length > 0) {
          await aiRepo.setActiveProviderConnection(settings.user_id, otherEnabled[0].id);
        } else {
          // No other enabled connections — clear the stale active ID
          await aiRepo.updateSettings({ active_connection_id: undefined } as UpdateAISettingsDTO);
        }
      }
    } catch (err) {
      console.error('useAISettings deleteConnection error:', err);
      throw err;
    }
  }, [aiRepo, settings, editingConnection, connections]);

  const testProviderConnection = useCallback(async (connection: AIProviderConnection) => {
    // Validate against the authoritative backend list before testing.
    // Never use a raw cached/local ID for runtime operations.
    const canonicalId = ProviderConnectionService.resolveActiveBackendConnectionId(
      connection.id,
      connections
    );
    if (!canonicalId) {
      setTestError('This provider connection is no longer available. Please select or add a provider.');
      setTestingId(prev => prev === connection.id ? null : prev);
      return;
    }

    setTestingId(connection.id);
    setTestError(null);
    try {
      const result = await ProviderConnectionAPI.test(connection.id);
      setConnections(prev => prev.map(c => c.id === connection.id ? { ...c, connection_status: result.success ? 'connected' : result.status, last_tested_at: new Date().toISOString(), last_tested_error: result.success ? undefined : result.message } : c));
      return result;
    } catch (err: any) {
      const message = err?.message || 'Failed to test connection';
      setTestError(message);
      setConnections(prev => prev.map(c => c.id === connection.id ? { ...c, connection_status: 'endpoint_unavailable', last_tested_at: new Date().toISOString(), last_tested_error: message } : c));
      console.error('useAISettings testProviderConnection error:', err);
      throw err;
    } finally {
      setTestingId(prev => prev === connection.id ? null : prev);
    }
  }, []);

  const setActiveConnection = useCallback(async (connectionId: string) => {
    if (!settings) return;

    // Validate against the authoritative backend list before setting active.
    const canonicalId = ProviderConnectionService.resolveActiveBackendConnectionId(
      connectionId,
      connections
    );
    if (!canonicalId) {
      console.warn('setActiveConnection: stale connection ID rejected', connectionId);
      return;
    }

    try {
      const updatedSettings = await aiRepo.setActiveProviderConnection(settings.user_id, connectionId);
      setSettings(updatedSettings);
      // Reload connections from backend to stay in sync
      const reloaded = await ProviderConnectionAPI.list().catch(() => []);
      const localConnections = await aiRepo.getProviderConnections(settings.user_id);
      const backendIds = new Set(reloaded.map(c => c.id));
      for (const local of localConnections) {
        if (!backendIds.has(local.id)) {
          await aiRepo.deleteProviderConnection(local.id).catch(() => {});
        }
      }
      for (const conn of reloaded) {
        const existing = await aiRepo.getProviderConnection(conn.id).catch(() => null);
        if (!existing) {
          await aiRepo.createProviderConnection({
            ...conn,
            api_key: '',
            capabilities: conn.capabilities || {},
          } as any, settings.user_id).catch(() => {});
        }
      }
      const finalConnections = await aiRepo.getProviderConnections(settings.user_id);
      setConnections(finalConnections);
    } catch (err) {
      console.error('useAISettings setActiveConnection error:', err);
      throw err;
    }
  }, [aiRepo, settings, connections]);

  // Model catalog
  const refreshModels = useCallback(async () => {
    if (!settings || !connections.length) return;
    setLoadingCatalog(true);
    try {
      // Resolve the active connection ID against the authoritative backend list.
      const canonicalActiveId = ProviderConnectionService.resolveActiveBackendConnectionId(
        settings.active_connection_id,
        connections
      );
      const activeConnection = connections.find(c => c.id === canonicalActiveId && c.enabled) ||
                                connections.find(c => c.enabled) || null;
      if (activeConnection) {
        const result = await ProviderConnectionAPI.models(activeConnection.id);
        setModelCatalog(result.models as ModelCapabilityMeta[]);
        setCatalogIsLive(result.isLive);
        setCatalogMessage(result.isLive ? 'Live OpenRouter Catalog (' + result.models.length + ' models)' : 'Live model availability unavailable — showing cached catalog.');
      }
    } catch (err) {
      console.error('useAISettings refreshModels error:', err);
      setCatalogMessage('Failed to load model catalog');
    } finally {
      setLoadingCatalog(false);
    }
  }, [settings, connections]);

  // Reload model catalog (with endpoint override for testing)
  const reloadModelCatalog = useCallback(async (_endpoint?: string) => {
    // For now, use existing refreshModels logic (endpoint parameter reserved for future use)
    await refreshModels();
  }, [refreshModels]);

  // Usage
  const reloadUsage = useCallback(async (period: 'today' | 'this_week' | 'this_month' | 'all') => {
    setLoadingUsage(true);
    try {
      const summary = await aiRepo.getUsageSummary(period);
      setUsageSummary(summary);
      setUsagePeriod(period);

      const logs = await aiRepo.getRequestLogs({ period });
      setRecentLogs(logs);
    } catch (err) {
      console.error('useAISettings reloadUsage error:', err);
    } finally {
      setLoadingUsage(false);
    }
  }, [aiRepo]);

  // Active connection
  const activeConnection = useMemo(() => {
    if (!settings) return null;
    return connections.find(c => c.id === settings.active_connection_id) || connections.find(c => c.enabled) || null;
  }, [connections, settings?.active_connection_id]);

  return {
    settings,
    loading,
    isSaving,
    error,
    errors,
    connections,
    editingConnection,
    setEditingConnection,
    updateSettings,
    reloadUsage,
    usagePeriod,
    setUsagePeriod,
    usageSummary,
    recentLogs,
    loadingUsage,
    modelCatalog,
    catalogIsLive,
    catalogMessage,
    loadingCatalog,
    reloadModelCatalog,
    createConnection,
    updateConnection,
    deleteConnection,
    testProviderConnection,
    setActiveConnection,
    refreshModels,
    activeConnection,
    testingId,
    testError,
    setTestError,
  };
}
