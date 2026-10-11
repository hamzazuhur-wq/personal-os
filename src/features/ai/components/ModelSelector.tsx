import React, { useEffect, useState } from 'react';
import { Select } from '../../../components/ui/Select';
import { ModelCapabilityMeta, AISettings } from '../../../types/ai.types';
import { AIProviderConnection } from '../../../types/aiProvider.types';
import { ProviderConnectionAPI, ProviderConnectionService } from '../../../services/ai/providerConnectionService';
import { Loader2, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { cn } from '../../../utils/cn';

export interface ModelSelectorProps {
  connection: AIProviderConnection | null;
  settings: AISettings;
  onModelChange: (modelId: string) => void;
  onRefresh: () => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  connection,
  settings,
  onModelChange,
  onRefresh,
}) => {
  const [models, setModels] = useState<ModelCapabilityMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!connection) {
      setModels([]);
      setIsLive(false);
      setError(null);
      return;
    }

    // Guard against stale local connection IDs — only use canonical IDs
    // validated against the authoritative backend provider list.
    const canonicalId = ProviderConnectionService.resolveActiveBackendConnectionId(
      connection.id,
      [connection]
    );
    if (!canonicalId) {
      setError('This provider connection is no longer available. Please select or add a provider.');
      setModels([]);
      setIsLive(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    ProviderConnectionAPI.models(connection.id)
      .then((result) => {
        if (cancelled) return;
        setModels(result.models);
        setIsLive(result.isLive);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setModels([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [connection?.id]);

  if (!connection) {
    return (
      <div className="text-sm text-gray-500 py-2">
        Select a provider connection to view available models.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">Model</label>
        <div className="flex items-center gap-2">
          <span className={cn('text-xs flex items-center gap-1', isLive ? 'text-green-600' : 'text-gray-500')}>
            {isLive ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isLive ? 'Live models' : 'Cached catalog'}
          </span>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-2 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Discovering models...
        </div>
      ) : error ? (
        <div className="text-sm text-orange-600 py-2">
          {error}
        </div>
      ) : (
        <Select
          value={settings.selected_model}
          onChange={onModelChange}
          disabled={models.length === 0}
          options={models.length === 0 ? [{ value: '', label: 'No models available' }] : models.map((model) => ({
            value: model.id,
            label: `${model.name} ${model.isFree ? '(Free)' : ''}`,
            subtext: model.pricingDescription ? `— ${model.pricingDescription}` : undefined,
          }))}
        />
      )}

      {models.length > 0 && (
        <p className="text-xs text-gray-500">
          {models.length} model{models.length !== 1 ? 's' : ''} available
        </p>
      )}
    </div>
  );
};
