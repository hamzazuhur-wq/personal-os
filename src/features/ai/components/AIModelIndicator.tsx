import React from 'react';
import { AISettings } from '../../../types/ai.types';
import { getModelMeta } from '../../../services/ai/settings/modelCatalog';
import { Sparkles, Cpu } from 'lucide-react';
import { cn } from '../../../utils/cn';

export interface AIModelIndicatorProps {
  settings: AISettings | null;
  onOpenSettings?: () => void;
  className?: string;
}

export const AIModelIndicator: React.FC<AIModelIndicatorProps> = ({
  settings,
  onOpenSettings,
  className,
}) => {
  if (!settings) return null;

  const isMock = settings.provider === 'mock';
  const modelMeta = getModelMeta(settings.selected_model);
  const displayName = isMock
    ? 'Development Mock'
    : modelMeta?.name || settings.selected_model.split('/').pop() || 'OpenRouter';

  return (
    <button
      onClick={onOpenSettings}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono transition-all backdrop-blur-xl group cursor-pointer select-none',
        isMock
          ? 'bg-amber-500/10 border-amber-500/25 text-amber-300 hover:border-amber-500/40'
          : 'bg-[#ff6a2a]/10 border-[#ff8a4a]/25 text-[#fff4ec] hover:border-[#ff8a4a]/50 shadow-[0_0_15px_rgba(255,106,42,0.15)]',
        className
      )}
      title="Click to configure AI Provider & Model settings"
    >
      <div className="flex items-center gap-1.5">
        {isMock ? (
          <Cpu className="w-3.5 h-3.5 text-amber-400" />
        ) : (
          <Sparkles className="w-3.5 h-3.5 text-[#ff8a4a] group-hover:rotate-12 transition-transform" />
        )}
        <span className="font-semibold truncate max-w-[140px] sm:max-w-[200px]">
          {displayName}
        </span>
      </div>

      <div className="h-3 w-[1px] bg-white/20" />

      <span className="text-[10px] uppercase tracking-wider text-text-muted group-hover:text-text-secondary">
        {settings.routing_profile === 'free_only' ? 'Free Tier' : settings.routing_profile}
      </span>
    </button>
  );
};
