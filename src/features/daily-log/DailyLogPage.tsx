import React, { useState } from 'react';
import { useActivities } from '../../hooks/useActivities';
import { useGoals } from '../../hooks/useGoals';
import { useProjects } from '../../hooks/useProjects';
import { usePractices } from '../../hooks/usePractices';
import { useTasks } from '../../hooks/useTasks';
import { useVision } from '../../hooks/useVision';
import { DatePickerBar } from '../../components/shared/DatePickerBar';
import { DailyMetrics } from './DailyMetrics';
import { ActivityTimeline } from './ActivityTimeline';
import { DailyActivityFormModal } from './DailyActivityFormModal';
import { SectionHeader } from '../../components/shared/SectionHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Activity, CreateActivityDTO, UpdateActivityDTO } from '../../types/activity.types';
import { Plus } from 'lucide-react';

export const DailyLogPage: React.FC = () => {
  const {
    selectedDate,
    activities,
    summary,
    loading,
    changeDate,
    createActivity,
    updateActivity,
    archiveActivity,
    deleteActivity,
  } = useActivities();
  const { rawGoals: goals } = useGoals();
  const { projects } = useProjects();
  const { practices } = usePractices();
  const { tasks } = useTasks();
  const { lifeAreas } = useVision();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  const handleOpenAdd = () => {
    setEditingActivity(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (act: Activity) => {
    setEditingActivity(act);
    setIsModalOpen(true);
  };

  const handleSave = async (dto: CreateActivityDTO | UpdateActivityDTO) => {
    if (editingActivity) {
      await updateActivity(editingActivity.id, dto as UpdateActivityDTO);
    } else {
      return await createActivity(dto as CreateActivityDTO);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Daily Activity Command"
        subtitle="Log and track actual work and output. Distinguish real execution from planned intentions."
        badge={<Badge variant="orange">Reality Log</Badge>}
        action={
          <Button
            variant="primary"
            size="md"
            onClick={handleOpenAdd}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            + Log Activity
          </Button>
        }
      />

      {/* Date Switcher Bar */}
      <DatePickerBar selectedDate={selectedDate} onDateChange={changeDate} />

      {/* Output Metrics */}
      <DailyMetrics summary={summary} />

      {/* Actual Work Timeline */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted">
            Activities Timeline ({activities.length})
          </h3>
        </div>

        <ActivityTimeline
          activities={activities}
          loading={loading}
          onEdit={handleOpenEdit}
          onArchive={archiveActivity}
          onDelete={deleteActivity}
          onAddClick={handleOpenAdd}
        />
      </div>

      {/* Activity Creation/Edit Modal */}
      <DailyActivityFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        date={selectedDate}
        activityToEdit={editingActivity}
        goals={goals}
        projects={projects}
        practices={practices}
        lifeAreas={lifeAreas}
        tasks={tasks}
        onSave={handleSave}
      />
    </div>
  );
};
