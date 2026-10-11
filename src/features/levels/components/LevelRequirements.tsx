import React from 'react';
import { LevelRequirement, RequirementEvidence } from '../../../types/level.types';
import { Goal } from '../../../types/goal.types';
import { RequirementRow } from './RequirementRow';
import { Button } from '../../../components/ui/Button';
import { Plus, ListChecks } from 'lucide-react';

export interface LevelRequirementsProps {
  requirements: LevelRequirement[];
  evidenceMap: Record<string, RequirementEvidence[]>;
  allGoals: Goal[];
  onToggleComplete: (id: string, currentStatus: string) => void;
  onSelectRequirement: (req: LevelRequirement) => void;
  onAddRequirement: () => void;
  isReadonly?: boolean;
}

export const LevelRequirements: React.FC<LevelRequirementsProps> = ({
  requirements,
  evidenceMap,
  allGoals,
  onToggleComplete,
  onSelectRequirement,
  onAddRequirement,
  isReadonly = false,
}) => {
  const goalMap = new Map(allGoals.map((g) => [g.id, g]));

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-[#ff8a4a]" />
          <h3 className="text-base font-semibold text-[#fff4ec] tracking-tight">
            Stage Requirements & Verification
          </h3>
        </div>

        {!isReadonly && (
          <Button
            size="sm"
            variant="secondary"
            onClick={onAddRequirement}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            <span>Add Condition</span>
          </Button>
        )}
      </div>

      {/* Requirements List or Empty State */}
      {requirements.length === 0 ? (
        <div className="p-8 rounded-2xl bg-black/25 border border-white/[0.06] text-center space-y-3">
          <p className="text-xs text-text-muted font-mono">
            No completion requirements defined for this stage yet.
          </p>
          {!isReadonly && (
            <Button size="sm" variant="accent" onClick={onAddRequirement}>
              <span>+ Add First Requirement</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {requirements.map((req) => (
            <RequirementRow
              key={req.id}
              requirement={req}
              evidence={evidenceMap[req.id] || []}
              linkedGoal={req.goal_id ? goalMap.get(req.goal_id) : undefined}
              onToggleComplete={() => onToggleComplete(req.id, req.status)}
              onSelect={() => onSelectRequirement(req)}
              isReadonly={isReadonly}
            />
          ))}
        </div>
      )}
    </section>
  );
};
