import React from 'react';
import { ProgressionException } from '../../../types/level.types';
import { EXCEPTION_TYPES } from '../../../constants/levels';
import { formatHumanDate } from '../../../utils/dateUtils';
import { Button } from '../../../components/ui/Button';
import { Plus, ShieldAlert } from 'lucide-react';

export interface ProgressionExceptionPanelProps {
  exceptions: ProgressionException[];
  onAddException: () => void;
  isReadonly?: boolean;
}

export const ProgressionExceptionPanel: React.FC<ProgressionExceptionPanelProps> = ({
  exceptions,
  onAddException,
  isReadonly = false,
}) => {
  return (
    <section className="p-5 rounded-2xl bg-black/35 border border-white/[0.08] backdrop-blur-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-[#ff8a4a]" />
          <h3 className="text-sm font-semibold text-[#fff4ec] tracking-tight">
            Progression Exceptions & Adjustments
          </h3>
        </div>

        {!isReadonly && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onAddException}
            leftIcon={<Plus className="w-3 h-3" />}
          >
            <span>Log Exception</span>
          </Button>
        )}
      </div>

      {exceptions.length === 0 ? (
        <p className="text-xs text-text-muted font-mono py-2">
          No progression exceptions or calibration decisions logged.
        </p>
      ) : (
        <div className="space-y-3">
          {exceptions.map((exc) => {
            const typeLabel = EXCEPTION_TYPES.find((t) => t.id === exc.type)?.label || exc.type;
            return (
              <div
                key={exc.id}
                className="p-4 rounded-xl bg-amber-500/[0.04] border border-amber-500/20 text-xs space-y-2"
              >
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="font-bold text-amber-300 uppercase">
                    [{typeLabel}]
                  </span>
                  <span className="text-text-muted">
                    {formatHumanDate(exc.created_at.slice(0, 10))}
                  </span>
                </div>

                <div className="space-y-1">
                  <p className="text-text-primary font-medium">{exc.description}</p>
                  <p className="text-text-secondary text-[11px] leading-relaxed">
                    <strong>Reason:</strong> {exc.reason}
                  </p>
                  <p className="text-[#ffb27a] text-[11px] leading-relaxed pt-1 border-t border-white/[0.05]">
                    <strong>Decision:</strong> {exc.decision}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
