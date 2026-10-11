import React from 'react';
import { AIProviderConnection, ProviderConnectionStatus } from '../../../types/aiProvider.types';
import { getProviderDisplayName } from '../../../services/ai/settings/providerRegistry';
import { ProviderConnectionService } from '../../../services/ai/providerConnectionService';
import {
  Edit3,
  Trash2,
  Power,
  PowerOff,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import { cn } from '../../../utils/cn';

export interface ProviderConnectionListProps {
  connections: AIProviderConnection[];
  activeConnectionId?: string;
  onSelect: (connection: AIProviderConnection) => void;
  onEdit: (connection: AIProviderConnection) => void;
  onDelete: (connection: AIProviderConnection) => void;
  onToggle: (connection: AIProviderConnection) => void;
  onTest: (connection: AIProviderConnection) => void;
  testingId?: string | null;
}

const statusConfig: Record<ProviderConnectionStatus, { icon: React.ReactNode; label: string; className: string }> = {
  not_tested: { icon: <WifiOff className="w-4 h-4" />, label: 'Not tested', className: 'text-gray-500' },
  connected: { icon: <CheckCircle2 className="w-4 h-4" />, label: 'Connected', className: 'text-green-600' },
  auth_failed: { icon: <XCircle className="w-4 h-4" />, label: 'Auth failed', className: 'text-red-600' },
  endpoint_unavailable: { icon: <AlertTriangle className="w-4 h-4" />, label: 'Unavailable', className: 'text-orange-600' },
  configuration_error: { icon: <XCircle className="w-4 h-4" />, label: 'Config error', className: 'text-red-600' },
};

export const ProviderConnectionList: React.FC<ProviderConnectionListProps> = ({
  connections,
  activeConnectionId,
  onSelect,
  onEdit,
  onDelete,
  onToggle,
  onTest,
  testingId,
}) => {
  if (connections.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <WifiOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No provider connections configured.</p>
        <p className="text-sm">Click + Add Provider to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {connections.map((conn) => {
        const isActive = conn.id === activeConnectionId;
        const status = statusConfig[conn.connection_status];
        const canDelete = ProviderConnectionService.canDelete(conn, connections);
        const isTesting = testingId === conn.id;

        return (
          <div
            key={conn.id}
            className={cn(
              'border rounded-lg p-3 cursor-pointer transition-colors',
              isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
            )}
            onClick={() => onSelect(conn)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className={cn('w-2 h-2 rounded-full', isActive ? 'bg-blue-500' : 'bg-gray-300')} />
                  <h4 className="font-medium text-sm truncate">{conn.name}</h4>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{getProviderDisplayName(conn.provider_type)}</p>
                <div className={cn('flex items-center gap-1 mt-1 text-xs', status.className)}>
                  {isTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : status.icon}
                  <span>{isTesting ? 'Testing...' : status.label}</span>
                  {conn.connection_status === 'connected' && (
                    <span className="text-gray-400 ml-1">• models discovered</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => onTest(conn)}
                  disabled={isTesting}
                  className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                  title="Test connection"
                >
                  {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => onToggle(conn)}
                  className={cn('p-1.5 rounded', conn.enabled ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50')}
                  title={conn.enabled ? 'Disable' : 'Enable'}
                >
                  {conn.enabled ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => onEdit(conn)}
                  className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                  title="Edit"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(conn)}
                  disabled={!canDelete}
                  className={cn('p-1.5 rounded', canDelete ? 'text-gray-500 hover:text-red-600 hover:bg-red-50' : 'text-gray-300 cursor-not-allowed')}
                  title={canDelete ? 'Delete' : 'Cannot delete last enabled connection'}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
