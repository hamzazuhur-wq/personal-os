import React, { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { AIProviderConnection, ProviderType } from '../../../types/aiProvider.types';
import { ALL_PROVIDER_TYPES, getProviderTypeDefinition } from '../../../services/ai/settings/providerRegistry';
import { ProviderConnectionService } from '../../../services/ai/providerConnectionService';
import { Loader2, Eye, EyeOff, AlertCircle, Wifi } from 'lucide-react';
import { cn } from '../../../utils/cn';

export interface ProviderConnectionFormProps {
  connection?: AIProviderConnection | null;
  existingConnections: AIProviderConnection[];
  onSave: (dto: { name: string; provider_type: ProviderType; base_url: string; api_key: string; enabled: boolean }) => Promise<void>;
  onCancel: () => void;
  testingId?: string | null;
  onTest: (connection: AIProviderConnection) => void;
}

export const ProviderConnectionForm: React.FC<ProviderConnectionFormProps> = ({
  connection,
  existingConnections,
  onSave,
  onCancel,
  testingId,
  onTest,
}) => {
  const [providerType, setProviderType] = useState<ProviderType>(connection?.provider_type || 'openrouter');
  const [name, setName] = useState(connection?.name || '');
  const [baseUrl, setBaseUrl] = useState(connection?.base_url || '');
  const [apiKey, setApiKey] = useState(connection?.api_key || '');
  const [enabled, setEnabled] = useState(connection?.enabled ?? true);
  const [showApiKey, setShowApiKey] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const typeDef = getProviderTypeDefinition(providerType);

  useEffect(() => {
    if (!connection) {
      const suggested = ProviderConnectionService.suggestName(providerType, existingConnections);
      setName(suggested);
      setBaseUrl(typeDef.defaultBaseUrl);
    }
  }, [providerType, connection, existingConnections]);

  useEffect(() => {
    setErrors({});
  }, [providerType]);

  const handleProviderTypeChange = (value: string) => {
    setProviderType(value as ProviderType);
    const def = getProviderTypeDefinition(value as ProviderType);
    setBaseUrl(def.defaultBaseUrl);
    setApiKey('');
    setName(ProviderConnectionService.suggestName(value as ProviderType, existingConnections));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const dto = {
      name,
      provider_type: providerType,
      base_url: baseUrl,
      api_key: apiKey,
      enabled,
    };

    const validationErrors = ProviderConnectionService.validate(dto);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    try {
      await onSave(dto);
    } finally {
      setSaving(false);
    }
  };

  const isTesting = testingId === connection?.id;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Provider Type</label>
        <Select
          value={providerType}
          onChange={(val) => handleProviderTypeChange(val)}
          disabled={!!connection}
          options={ALL_PROVIDER_TYPES.map((type) => ({
            value: type,
            label: getProviderTypeDefinition(type).displayName,
          }))}
        />
        <p className="text-xs text-gray-500 mt-1">{typeDef.description}</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Connection Name</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={typeDef.displayName}
          className={errors.name ? 'border-red-300' : ''}
        />
        {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
      </div>

      {typeDef.fields.showBaseUrl && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
          <Input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder={typeDef.fields.baseUrlPlaceholder}
            className={errors.base_url ? 'border-red-300' : ''}
          />
          {errors.base_url && <p className="text-xs text-red-600 mt-1">{errors.base_url}</p>}
          {typeDef.fields.helpText && <p className="text-xs text-gray-500 mt-1">{typeDef.fields.helpText}</p>}
        </div>
      )}

      {typeDef.fields.showApiKey && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            API Key {typeDef.capabilities.requiresApiKey && <span className="text-red-500">*</span>}
          </label>
          <div className="relative">
            <Input
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={typeDef.fields.apiKeyPlaceholder}
              className={cn('pr-10', errors.api_key ? 'border-red-300' : '')}
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.api_key && <p className="text-xs text-red-600 mt-1">{errors.api_key}</p>}
          <p className="text-xs text-gray-500 mt-1">
            Stored locally in your browser. Never exposed in URLs or logs.
          </p>
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="enabled"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="rounded border-gray-300"
        />
        <label htmlFor="enabled" className="text-sm text-gray-700">Enabled</label>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button type="submit" disabled={saving} className="flex-1">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {connection ? 'Update Connection' : 'Save Connection'}
        </Button>
        {connection && (
          <Button type="button" variant="secondary" onClick={() => onTest(connection)} disabled={isTesting}>
            {isTesting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wifi className="w-4 h-4 mr-2" />}
            Test
          </Button>
        )}
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>

      {Object.keys(errors).length > 0 && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
          <div className="text-sm text-red-700">
            Please fix the validation errors above.
          </div>
        </div>
      )}
    </form>
  );
};
