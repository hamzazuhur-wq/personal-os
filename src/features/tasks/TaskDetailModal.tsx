import React, { useCallback, useEffect, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  DevelopmentPointsBlock,
} from '../practices/components/devpoints/DevelopmentPointsBlock';
import {
  AddDevelopmentPointsModal,
} from '../practices/components/devpoints/AddDevelopmentPointsModal';
import {
  PointHistoryList,
} from '../practices/components/devpoints/PointHistoryList';
import { useVision } from '../../hooks/useVision';
import { useGoals } from '../../hooks/useGoals';
import { pointService } from '../../services/points/pointService';
import type { PointLedgerEvent } from '../../types/practice.types';
import type { Task } from '../../types/task.types';
import { formatShortDate, getTodayDateString } from '../../utils/dateUtils';
import { DailyActivityFormModal } from '../daily-log/DailyActivityFormModal';
import { useProjects } from '../../hooks/useProjects';
import { usePractices } from '../../hooks/usePractices';
import { useActivities } from '../../hooks/useActivities';

export interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
}

/**
 * Module 08 Final — read-only task detail with Development Points attribution,
 * history, and manual entry.
 */
export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  isOpen,
  onClose,
  task,
}) => {
  const { lifeAreas } = useVision();
  const { rawGoals } = useGoals();
  const { projects } = useProjects();
  const { practices } = usePractices();
  const { createActivity } = useActivities();
  const [isLogActivityOpen, setIsLogActivityOpen] = useState(false);
  const [isAddPointsOpen, setIsAddPointsOpen] = useState(false);
  const [pointsRefreshKey, setPointsRefreshKey] = useState(0);
  const [events, setEvents] = useState<PointLedgerEvent[]>([]);

  const fetchTaskPoints = useCallback(
    () => (task ? pointService.getTaskPoints(task.id) : Promise.resolve(0)),
    [task?.id]
  );

  useEffect(() => {
    let cancelled = false;
    if (!task || !isOpen) return;
    pointService
      .getRecentEvents({ task_id: task.id }, 5)
      .then((list) => {
        if (!cancelled) setEvents(list);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [task?.id, isOpen, pointsRefreshKey]);

  if (!task) return null;

  const linkedGoal = task.related_goal_id
    ? rawGoals.find((g) => g.id === task.related_goal_id)
    : null;
  const lifeAreaId = linkedGoal?.life_area_id;

  return (
    <>
      <Modal
        isOpen={isOpen && Boolean(task)}
        onClose={onClose}
        title="Task Details"
        subtitle={task.title}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap text-xs font-mono text-text-muted">
            <Badge variant={task.status === 'completed' ? 'emerald' : 'orange'} size="sm">
              {task.status.replace('_', ' ')}
            </Badge>
            {task.due_date && <span>Due {formatShortDate(task.due_date)}</span>}
            {linkedGoal && <span>Goal: {linkedGoal.title}</span>}
          </div>

          {task.description && (
            <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap rounded-xl border border-white/[0.07] bg-black/25 p-3.5">
              {task.description}
            </p>
          )}

          <DevelopmentPointsBlock
            fetchTotal={fetchTaskPoints}
            refreshKey={pointsRefreshKey}
            onAddPoints={() => setIsAddPointsOpen(true)}
            title="Development Points on this Task"
          />

          <Button variant="secondary" size="sm" onClick={() => setIsLogActivityOpen(true)}>
            Log Activity
          </Button>

          <div>
            <h4 className="text-[11px] font-mono font-semibold uppercase tracking-[0.15em] text-text-muted mb-2">
              Recent Point Events
            </h4>
            <PointHistoryList
              events={events}
              emptyMessage="No points recorded for this task yet."
            />
          </div>

          <div className="flex justify-end pt-2 border-t border-white/[0.08]">
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      <AddDevelopmentPointsModal
        isOpen={isAddPointsOpen}
        onClose={() => setIsAddPointsOpen(false)}
        context={{
          lifeAreaId,
          taskId: task.id,
          goalId: task.related_goal_id,
          projectId: task.related_project_id,
        }}
        lifeAreas={lifeAreas}
        onSaved={() => setPointsRefreshKey((k) => k + 1)}
      />

      <DailyActivityFormModal
        isOpen={isLogActivityOpen}
        onClose={() => setIsLogActivityOpen(false)}
        date={getTodayDateString()}
        goals={rawGoals}
        projects={projects}
        practices={practices}
        lifeAreas={lifeAreas}
        tasks={task ? [task] : []}
        initialTitle={task?.title}
        initialGoalId={task?.related_goal_id}
        initialProjectId={task?.related_project_id}
        initialTaskId={task?.id}
        initialPracticeId={task?.related_practice_id}
        initialLifeAreaId={lifeAreaId || undefined}
        onSave={(dto) => createActivity(dto as any)}
      />
    </>
  );
};
