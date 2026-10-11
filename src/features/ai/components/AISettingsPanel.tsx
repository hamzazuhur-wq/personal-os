import React, { useState, useMemo } from 'react';
import { useAISettings } from '../../../hooks/useAISettings';
import {
  AIModelSelectionMode,
  AIRoutingProfile,
  AIContextDepth,
  AIActionPolicyMode,
  AISettings,
} from '../../../types/ai.types';
import { AIProviderConnection } from '../../../types/aiProvider.types';
import { getRecommendedModelForProfile } from '../../../services/ai/settings/modelCatalog';
import { ProviderConnectionService } from '../../../services/ai/providerConnectionService';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import {
  Cpu,
  Sparkles,
  Sliders,
  Layers,
  ShieldCheck,
  Loader2,
  X,
  RefreshCw,
  Activity,
  Plus,
  AlertCircle,
} from 'lucide-react';
import { cn } from '../../../utils/cn';
import { ProviderConnectionList } from './ProviderConnectionList';
import { ProviderConnectionForm } from './ProviderConnectionForm';
import { ModelSelector } from './ModelSelector';

export interface AISettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabId = 'providers' | 'models' | 'context' | 'safety' | 'usage';

export const AISettingsPanel: React.FC<AISettingsPanelProps> = ({ isOpen, onClose }) => {
  const {
    settings,
    isSaving,
    errors,
    usagePeriod,
    setUsagePeriod,
    usageSummary,
    recentLogs,
    loadingUsage,
    modelCatalog,
    catalogIsLive,
    catalogMessage,
    loadingCatalog,
    connections,
    editingConnection,
    setEditingConnection,
    updateSettings,
    reloadUsage,
    reloadModelCatalog,
    createConnection,
    updateConnection,
    deleteConnection,
    testProviderConnection,
    setActiveConnection,
    refreshModels,
    testingId,
    testError,
    setTestError,
  } = useAISettings();

  const [activeTab, setActiveTab] = useState<TabId>('providers');
  const [modeError, setModeError] = useState<string | null>(null);
  const [showConnectionForm, setShowConnectionForm] = useState(false);

  const activeConnection = useMemo(() => {
    if (!settings) return null;
    return connections.find(c => c.id === settings.active_connection_id) || connections.find(c => c.enabled) || null;
  }, [connections, settings?.active_connection_id, settings]);

  if (!isOpen || !settings) return null;

  const handleFieldChange = (fields: Partial<AISettings>) => {
    setModeError(null);
    updateSettings(fields);
  };

  const handleModeChange = (mode: AIModelSelectionMode) => {
    setModeError(null);
    let nextModel = settings.selected_model;
    let nextProfile = settings.routing_profile;

    if (mode === 'free_only') {
      nextProfile = 'free_only';
      const rec = getRecommendedModelForProfile('free_only', modelCatalog);
      if (!rec.modelId) {
        setModeError(rec.reason || 'No compatible free model is currently available.');
        return;
      }
      nextModel = rec.modelId;
    } else if (mode === 'auto') {
      const rec = getRecommendedModelForProfile(nextProfile, modelCatalog);
      if (rec.modelId) {
        nextModel = rec.modelId;
      }
    }

    updateSettings({
      model_mode: mode,
      routing_profile: nextProfile,
      selected_model: nextModel,
    });
  };

  const handleProfileChange = (profile: AIRoutingProfile) => {
    setModeError(null);
    if (settings.model_mode === 'auto' || settings.model_mode === 'free_only') {
      const rec = getRecommendedModelForProfile(profile, modelCatalog);
      if (!rec.modelId && profile === 'free_only') {
        setModeError(rec.reason || 'No compatible free model is currently available.');
        return;
      }
      updateSettings({
        routing_profile: profile,
        selected_model: rec.modelId || settings.selected_model,
      });
    } else {
      updateSettings({ routing_profile: profile });
    }
  };

  const handleSaveConnection = async (dto: { name: string; provider_type: string; base_url: string; api_key: string; enabled: boolean }) => {
    if (editingConnection) {
      await updateConnection(editingConnection.id, dto as any);
    } else {
      const created = await createConnection(dto as any);
      if (created) {
        setActiveConnection(created.id);
      }
    }
    setShowConnectionForm(false);
    setEditingConnection(null);
  };

  const handleModelChange = (modelId: string) => {
    updateSettings({ selected_model: modelId });
  };

  const handleTestConnection = async (connection: AIProviderConnection) => {
    await testProviderConnection(connection);
  };

  const handleDeleteConnection = async (connection: AIProviderConnection) => {
    if (!ProviderConnectionService.canDelete(connection, connections)) return;
    if (connection.id === settings.active_connection_id) {
      const replacement = connections.find(c => c.id !== connection.id && c.enabled);
      if (replacement) {
        await setActiveConnection(replacement.id);
      }
    }
    await deleteConnection(connection.id);
  };

  const handleEditConnection = (connection: AIProviderConnection) => {
    setEditingConnection(connection);
    setShowConnectionForm(true);
  };

  const handleToggleConnection = async (connection: AIProviderConnection) => {
    await updateConnection(connection.id, { enabled: !connection.enabled });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border border-white/[0.12] bg-gradient-to-b from-[#181c26] via-[#12151d] to-[#0a0c11] shadow-[0_24px_64px_rgba(0,0,0,0.85)] overflow-hidden">
        <div className="absolute top-0 left-12 right-12 h-[1px] bg-gradient-to-r from-transparent via-[#ff8a4a]/40 to-transparent" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-white/[0.08] bg-black/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#ff6a2a]/15 border border-[#ff8a4a]/30 text-[#ff8a4a]">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#fff4ec]">AI Intelligence Settings</h2>
              <p className="text-xs text-text-muted">
                Multi-provider configuration, routing, context depth, and analytics
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-white/[0.05] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center gap-2 px-6 py-2.5 border-b border-white/[0.06] bg-white/[0.01] overflow-x-auto">
          {[
            { id: 'providers', label: 'Providers', icon: Cpu },
            { id: 'models', label: 'Model & Generation', icon: Sparkles },
            { id: 'context', label: 'Context & Memory', icon: Layers },
            { id: 'safety', label: 'Guardrails', icon: ShieldCheck },
            { id: 'usage', label: 'Real Usage & Analytics', icon: Activity },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabId)}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-mono transition-all whitespace-nowrap cursor-pointer',
                  isActive
                    ? 'bg-[#ff6a2a]/20 text-[#fff4ec] border border-[#ff8a4a]/40 font-semibold'
                    : 'text-text-muted hover:text-text-secondary hover:bg-white/[0.03]'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Settings Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          {/* TAB 1: Providers */}
          {activeTab === 'providers' && (
            <div className="space-y-6">
              {/* Provider Connections */}
              <div className="p-5 rounded-2xl bg-black/40 border border-white/[0.08] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-[#fff4ec]">
                      AI Providers
                    </h3>
                    <p className="text-xs text-text-muted">Configure multiple provider connections</p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => { setEditingConnection(null); setShowConnectionForm(true); }}
                    className="h-8 px-3 gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Provider</span>
                  </Button>
                </div>

                {testError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-mono flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{testError}</span>
                    <button
                      onClick={() => setTestError(null)}
                      className="ml-auto text-red-400 hover:text-red-300"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {showConnectionForm && (
                  <ProviderConnectionForm
                    connection={editingConnection}
                    existingConnections={connections}
                    onSave={handleSaveConnection}
                    onCancel={() => { setShowConnectionForm(false); setEditingConnection(null); }}
                    onTest={handleTestConnection}
                  />
                )}

                <ProviderConnectionList
                  connections={connections}
                  activeConnectionId={settings.active_connection_id}
                  onSelect={(connection) => { setActiveConnection(connection.id); setEditingConnection(connection); }}
                  onEdit={handleEditConnection}
                  onDelete={handleDeleteConnection}
                  onToggle={handleToggleConnection}
                  onTest={handleTestConnection}
                  testingId={testingId}
                />
              </div>

              {/* Active Connection & Model */}
              <div className="p-5 rounded-2xl bg-black/40 border border-white/[0.08] space-y-4">
                <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-[#fff4ec]">
                  Active Connection
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Provider Connection</label>
                  <Select
                    value={settings.active_connection_id || ''}
                    onChange={(val) => setActiveConnection(val)}
                    options={[
                      { value: '', label: 'Select a connection...' },
                      ...connections.filter(c => c.enabled).map(c => ({
                        value: c.id,
                        label: `${c.name} (${c.provider_type})`,
                      })),
                    ]}
                  />
                  {!activeConnection && (
                    <p className="text-xs text-amber-600 mt-1">No active connection. Add and enable a provider connection.</p>
                  )}
                </div>

                <ModelSelector
                  connection={activeConnection}
                  settings={settings}
                  onModelChange={handleModelChange}
                  onRefresh={refreshModels}
                />
              </div>

              {/* Routing Profile */}
              <div className="p-5 rounded-2xl bg-black/40 border border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-[#fff4ec]">
                      Routing Profile
                    </h3>
                    <p className="text-xs text-text-muted">Determines how models are prioritized for requests</p>
                  </div>
                  <Select
                    value={settings.routing_profile}
                    onChange={(val) => handleProfileChange(val as AIRoutingProfile)}
                    options={[
                      { value: 'free_only', label: 'Free Tier Only (Zero API Cost)' },
                      { value: 'balanced', label: 'Balanced (Fast & Economical)' },
                      { value: 'cost_optimized', label: 'Cost-Optimized' },
                      { value: 'quality_first', label: 'Quality First (High Reasoning)' },
                      { value: 'manual', label: 'Manual Explicit Selection' },
                    ]}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Model & Generation */}
          {activeTab === 'models' && (
            <div className="space-y-6">
              {/* Model Mode & Selection */}
              <div className="p-5 rounded-2xl bg-black/40 border border-white/[0.08] space-y-4">
                {/* Catalog Status Bar */}
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] text-[11px] font-mono">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'w-2 h-2 rounded-full',
                      catalogIsLive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                    )} />
                    <span className={catalogIsLive ? 'text-emerald-300' : 'text-amber-300'}>
                      {catalogMessage || (catalogIsLive
                        ? `Live OpenRouter Catalog (${modelCatalog.length} models)`
                        : 'Live model availability unavailable — showing cached catalog.')}
                    </span>
                  </div>
                  <button
                    onClick={() => reloadModelCatalog(settings.endpoint)}
                    disabled={loadingCatalog}
                    className="flex items-center gap-1 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                  >
                    <RefreshCw className={cn('w-3 h-3', loadingCatalog && 'animate-spin')} />
                    <span>{loadingCatalog ? 'Refreshing...' : 'Refresh'}</span>
                  </button>
                </div>

                {/* Mode Error Banner (e.g. no free model available) */}
                {modeError && (
                  <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>{modeError}</span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-[#fff4ec]">
                      Model Selection Mode
                    </h3>
                    <p className="text-xs text-text-muted">Choose automatic routing or specify exact model</p>
                  </div>
                  <Select
                    value={settings.model_mode}
                    onChange={(val) => handleModeChange(val as AIModelSelectionMode)}
                    options={[
                      { value: 'auto', label: 'Auto (Recommended for Profile)' },
                      { value: 'free_only', label: 'Free Tier Only' },
                      { value: 'manual', label: 'Manual Specific Model' },
                    ]}
                  />
                </div>

                {/* Selected Model */}
                <div className="space-y-1.5 pt-2 border-t border-white/[0.06]">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-mono text-text-muted uppercase block">
                      Target Model Identifier
                    </label>
                    <span className="text-[10px] font-mono text-[#ff8a4a]">
                      {settings.model_mode === 'manual' ? 'Manual Override' : 'Auto Selected'}
                    </span>
                  </div>
                  <Select
                    value={settings.selected_model}
                    onChange={(val) => handleFieldChange({ selected_model: val })}
                    options={modelCatalog.map((m) => ({
                      value: m.id,
                      label: `${m.name} ${m.isFree ? '(Free)' : ''}`,
                      subtext: `${m.pricingDescription || 'Pricing unavailable'} • Context: ${(m.contextWindow / 1000).toFixed(0)}k`,
                    }))}
                  />
                  {errors.selected_model && (
                    <p className="text-xs text-rose-400 mt-1">{errors.selected_model}</p>
                  )}
                </div>

                {/* Fallback Model */}
                <div className="pt-3 border-t border-white/[0.06] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-[#fff4ec] block">
                        Enable Automatic Fallback
                      </span>
                      <span className="text-[11px] text-text-muted">
                        Switch to fallback if primary model encounters rate-limits (HTTP 429)
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.fallback_enabled}
                      onChange={(e) => handleFieldChange({ fallback_enabled: e.target.checked })}
                      className="w-4 h-4 accent-[#ff8a4a] rounded cursor-pointer"
                    />
                  </div>

                  {settings.fallback_enabled && (
                    <Select
                      value={settings.fallback_model}
                      onChange={(val) => handleFieldChange({ fallback_model: val })}
                      options={modelCatalog.map((m) => ({
                        value: m.id,
                        label: `Fallback: ${m.name}`,
                        subtext: m.pricingDescription || 'Pricing unavailable',
                      }))}
                    />
                  )}
                </div>
              </div>

              {/* Real Generation Parameters */}
              <div className="p-5 rounded-2xl bg-black/40 border border-white/[0.08] space-y-4">
                <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-[#fff4ec]">
                  Real Generation Parameters (Sent in HTTP Request)
                </h3>

                {/* Temperature */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-text-muted">Temperature (temperature in payload)</span>
                    <span className="text-[#ff8a4a] font-bold">{settings.temperature}</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="1.0"
                    step="0.05"
                    value={settings.temperature}
                    onChange={(e) => handleFieldChange({ temperature: parseFloat(e.target.value) })}
                    className="w-full accent-[#ff8a4a] cursor-pointer"
                  />
                  {errors.temperature && (
                    <p className="text-xs text-rose-400">{errors.temperature}</p>
                  )}
                </div>

                {/* Max Tokens */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-text-muted">Max Output Tokens (max_tokens in payload)</span>
                    <span className="text-[#ff8a4a] font-bold">{settings.max_output_tokens}</span>
                  </div>
                  <input
                    type="number"
                    min="256"
                    max="4096"
                    step="128"
                    value={settings.max_output_tokens}
                    onChange={(e) => handleFieldChange({ max_output_tokens: parseInt(e.target.value, 10) })}
                    className="w-full bg-black/40 border border-white/[0.1] text-xs font-mono text-text-primary rounded-xl px-3 py-2"
                  />
                  {errors.max_output_tokens && (
                    <p className="text-xs text-rose-400">{errors.max_output_tokens}</p>
                  )}
                </div>

                {/* Streaming Toggle */}
                <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                  <div>
                    <span className="text-xs font-semibold text-[#fff4ec] block">
                      Stream Responses (stream: true)
                    </span>
                    <span className="text-[11px] text-text-muted">
                      SSE tokens rendered in real-time with usage tracking
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.streaming}
                    onChange={(e) => handleFieldChange({ streaming: e.target.checked })}
                    className="w-4 h-4 accent-[#ff8a4a] rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Context & Memory */}
          {activeTab === 'context' && (
            <div className="space-y-6">
              {/* Context Depth & Retrieval */}
              <div className="p-5 rounded-2xl bg-black/40 border border-white/[0.08] space-y-4">
                <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-[#fff4ec]">
                  Context Slicing Bounds
                </h3>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-[#fff4ec] block">Context Depth</span>
                    <span className="text-[11px] text-text-muted">Controls number of entities injected into prompt</span>
                  </div>
                  <Select
                    value={settings.context_depth}
                    onChange={(val) => handleFieldChange({ context_depth: val as AIContextDepth })}
                    options={[
                      { value: 'minimal', label: 'Minimal (Top 3 records per domain)' },
                      { value: 'standard', label: 'Standard (Up to 10 records per domain)' },
                      { value: 'deep', label: 'Deep (Up to 30 records per domain)' },
                    ]}
                  />
                </div>

                {/* Toggles with real runtime effects */}
                <div className="space-y-3 pt-3 border-t border-white/[0.06]">
                  <label className="flex items-center justify-between cursor-pointer text-xs">
                    <div>
                      <span className="text-text-primary block">Include Daily Activity Logs</span>
                      <span className="text-[11px] text-text-muted">When disabled, zero activity records are fetched</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.include_activities}
                      onChange={(e) => handleFieldChange({ include_activities: e.target.checked })}
                      className="w-4 h-4 accent-[#ff8a4a] rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer text-xs pt-2 border-t border-white/[0.04]">
                    <div>
                      <span className="text-text-primary block">Include Confirmed Memory Preferences</span>
                      <span className="text-[11px] text-text-muted">When disabled, memory store is bypassed</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.include_memories}
                      onChange={(e) => handleFieldChange({ include_memories: e.target.checked })}
                      className="w-4 h-4 accent-[#ff8a4a] rounded"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Safety & Guardrails */}
          {activeTab === 'safety' && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-black/40 border border-white/[0.08] space-y-4">
                <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-[#fff4ec]">
                  Action Guardrail Policy
                </h3>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-[#fff4ec] block">Write Action Policy</span>
                    <span className="text-[11px] text-text-muted">Controls whether write mutations can execute</span>
                  </div>
                  <Select
                    value={settings.action_policy}
                    onChange={(val) => handleFieldChange({ action_policy: val as AIActionPolicyMode })}
                    options={[
                      { value: 'ask_before_write', label: 'Ask Before Write (Human-in-the-Loop)' },
                      { value: 'read_only', label: 'Read-Only (Block all write operations)' },
                    ]}
                  />
                </div>

                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-2.5 text-xs text-emerald-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Hardcoded Safeguard Active: Permanent deletion is strictly forbidden. Archival is always used.</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Real Usage & Analytics */}
          {activeTab === 'usage' && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-black/40 border border-white/[0.08] space-y-4">
                {/* Header & Period Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-[#fff4ec]">
                      Real Provider Token Analytics
                    </h3>
                    <p className="text-xs text-text-muted">
                      Measured strictly from provider response payloads
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {(['today', 'this_week', 'this_month', 'all'] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => {
                          setUsagePeriod(p);
                          reloadUsage(p);
                        }}
                        className={cn(
                          'text-[10px] font-mono px-2.5 py-1 rounded-lg border capitalize transition-colors cursor-pointer',
                          usagePeriod === p
                            ? 'bg-[#ff6a2a]/20 border-[#ff8a4a]/40 text-[#fff4ec] font-bold'
                            : 'bg-white/[0.02] border-white/[0.06] text-text-muted hover:text-text-secondary'
                        )}
                      >
                        {p.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Metrics Grid */}
                {loadingUsage ? (
                  <div className="py-8 flex justify-center text-text-muted text-xs font-mono">
                    <Loader2 className="w-4 h-4 animate-spin text-[#ff8a4a] mr-2" />
                    Loading usage data...
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                      <span className="text-[10px] font-mono text-text-muted uppercase">Requests</span>
                      <p className="text-lg font-mono font-bold text-[#fff4ec]">
                        {usageSummary?.total_requests || 0}
                      </p>
                      <span className="text-[10px] text-emerald-400 font-mono">
                        {usageSummary?.successful_requests || 0} success / {usageSummary?.failed_requests || 0} failed
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                      <span className="text-[10px] font-mono text-text-muted uppercase">Total Tokens</span>
                      <p className="text-lg font-mono font-bold text-[#ff8a4a]">
                        {usageSummary && usageSummary.total_tokens > 0
                          ? usageSummary.total_tokens.toLocaleString()
                          : 'Usage unavailable'}
                      </p>
                      {usageSummary && usageSummary.total_tokens > 0 && (
                        <span className="text-[10px] text-text-muted font-mono">
                          In: {usageSummary.input_tokens.toLocaleString()} • Out: {usageSummary.output_tokens.toLocaleString()}
                        </span>
                      )}
                    </div>

                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                      <span className="text-[10px] font-mono text-text-muted uppercase">Estimated Cost</span>
                      <p className="text-lg font-mono font-bold text-[#fff4ec]">
                        {usageSummary?.cost_unavailable
                          ? 'Cost unavailable'
                          : usageSummary?.estimated_cost !== null && usageSummary?.estimated_cost !== undefined
                            ? `$${usageSummary.estimated_cost.toFixed(4)}`
                            : '$0.00'}
                      </p>
                      <span className="text-[10px] text-text-muted font-mono">
                        Calculated from model catalog rates
                      </span>
                    </div>
                  </div>
                )}

                {/* Recent Request Activity */}
                <div className="pt-3 border-t border-white/[0.06] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-text-muted uppercase">
                      Recent Request Activity ({recentLogs.length})
                    </span>
                    <button
                      onClick={() => reloadUsage(usagePeriod)}
                      className="p-1 text-text-muted hover:text-text-primary"
                      title="Refresh Logs"
                    >
                      <RefreshCw className="w-3 h-3" />
                    </button>
                  </div>

                  {recentLogs.length === 0 ? (
                    <p className="text-xs text-text-muted py-4 text-center">No AI request logs recorded for this period.</p>
                  ) : (
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-0.5">
                      {recentLogs.map((log) => (
                        <div
                          key={log.id}
                          className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between text-xs font-mono"
                        >
                          <div className="flex items-center gap-2 truncate flex-1">
                            <span className={cn(
                              'w-2 h-2 rounded-full',
                              log.status === 'success' ? 'bg-emerald-400' : 'bg-rose-400'
                            )} />
                            <span className="text-[#fff4ec] truncate max-w-[160px] sm:max-w-[240px]">
                              {log.model}
                            </span>
                            {log.fallback_used && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                Fallback
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-text-muted text-[10px] shrink-0">
                            {log.total_tokens !== undefined ? (
                              <span>{log.total_tokens} tok</span>
                            ) : (
                              <span>Usage unavailable</span>
                            )}
                            <span>{log.latency_ms}ms</span>
                            <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-white/[0.08] bg-black/40 flex items-center justify-between">
          <span className="text-xs text-text-muted font-mono">
            {isSaving ? 'Saving changes...' : 'Settings auto-persisted to Dexie database.'}
          </span>
          <Button variant="primary" size="sm" onClick={onClose} className="rounded-xl px-5">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};

