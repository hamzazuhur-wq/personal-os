import React, { useCallback, useState } from 'react';
import { useProjectDetail } from '../../hooks/useProjectDetail';
import { useVision } from '../../hooks/useVision';
import { useGoals } from '../../hooks/useGoals';
import { useLevels } from '../../hooks/useLevels';
import { pointService } from '../../services/points/pointService';
import { ProjectHero } from './components/ProjectHero';
import { ProjectRelationships } from './components/ProjectRelationships';
import { ProjectTasks } from './components/ProjectTasks';
import { ProjectActivities } from './components/ProjectActivities';
import { ProjectHistory } from './components/ProjectHistory';
import { ProjectFormModal } from './forms/ProjectFormModal';
import { CompleteProjectModal } from './forms/CompleteProjectModal';
import {
  DevelopmentPointsBlock,
} from '../practices/components/devpoints/DevelopmentPointsBlock';
import {
  AddDevelopmentPointsModal,
} from '../practices/components/devpoints/AddDevelopmentPointsModal';
import { Skeleton } from '../../components/ui/Skeleton';
import { ChevronRight } from 'lucide-react';

export interface ProjectDetailPageProps {
  projectId: string;
  onNavigate: (route: string) => void;
}

export const ProjectDetailPage: React.FC<ProjectDetailPageProps> = ({
  projectId,
  onNavigate,
}) => {
  const {
    project,
    tasks,
    activities,
    primaryGoal,
    lifeArea,
    level,
    vision,
    loading,
    error,
    updateProject,
    completeProject,
    pauseProject,
    resumeProject,
    archiveProject,
    createTask,
    toggleCompleteTask,
  } = useProjectDetail(projectId);

  const { lifeAreas } = useVision();
  const { goals } = useGoals();
  const { levels } = useLevels();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);

  // Module 08 Final — Development Points on this project
  const [isAddPointsOpen, setIsAddPointsOpen] = useState(false);
  const [pointsRefreshKey, setPointsRefreshKey] = useState(0);
  const fetchProjectPoints = useCallback(
    () => pointService.getProjectPoints(projectId),
    [projectId]
  );

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in pb-16">
        <Skeleton className="h-10 w-48 rounded-xl bg-white/[0.04]" />
        <Skeleton className="h-64 rounded-3xl bg-white/[0.03]" />
        <Skeleton className="h-48 rounded-3xl bg-white/[0.03]" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-8 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-center space-y-3">
        <p className="text-sm">{error || 'Project workspace not found.'}</p>
        <button
          type="button"
          onClick={() => onNavigate('/projects')}
          className="text-xs font-mono text-[#ff8a4a] hover:underline"
        >
          Return to Active Projects
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs font-mono text-text-muted flex-wrap">
        <button
          type="button"
          onClick={() => onNavigate('/projects')}
          className="hover:text-[#fff4ec] transition-colors cursor-pointer"
        >
          Active Projects
        </button>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-[#ff8a4a] font-semibold truncate">
          {project.title}
        </span>
      </nav>

      {/* Dominant Hero Glass Panel */}
      <ProjectHero
        project={project}
        onEdit={() => setIsEditModalOpen(true)}
        onComplete={() => setIsCompleteModalOpen(true)}
        onPause={pauseProject}
        onResume={resumeProject}
        onArchive={async () => {
          await archiveProject();
          onNavigate('/projects');
        }}
      />

      {/* Connected Architecture Relationships */}
      <ProjectRelationships
        lifeArea={lifeArea}
        primaryGoal={primaryGoal}
        level={level}
        vision={vision}
        onNavigate={onNavigate}
      />

      {/* Development Points (Module 08 Final) */}
      <DevelopmentPointsBlock
        fetchTotal={fetchProjectPoints}
        refreshKey={pointsRefreshKey}
        onAddPoints={() => setIsAddPointsOpen(true)}
        title={`Development Points — ${project.title}`}
      />

      {/* Two-Column Execution Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Executable Tasks Stream */}
        <div className="lg:col-span-2 space-y-8">
          <ProjectTasks
            tasks={tasks}
            onToggleComplete={async (id, status) => { await toggleCompleteTask(id, status); }}
            onAddTask={async (dto) => { await createTask(dto); }}
          />

          {/* Lifecycle & System Audit */}
          <ProjectHistory project={project} />
        </div>

        {/* Right 1 Col: Recorded Work Timeline */}
        <div className="space-y-6">
          <ProjectActivities activities={activities} />
        </div>
      </div>

      {/* Edit Modal */}
      <ProjectFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        projectToEdit={project}
        lifeAreas={lifeAreas}
        goals={goals}
        levels={levels}
        vision={vision}
        onSave={async (dto) => {
          await updateProject(dto);
        }}
        onArchive={async () => {
          await archiveProject();
          onNavigate('/projects');
        }}
      />

      {/* Complete Modal with Outcome Reflection */}
      <CompleteProjectModal
        isOpen={isCompleteModalOpen}
        onClose={() => setIsCompleteModalOpen(false)}
        projectTitle={project.title}
        onConfirm={async (note) => {
          await completeProject(note);
        }}
      />

      {/* Add Development Points attributed to this project (Module 08 Final) */}
      <AddDevelopmentPointsModal
        isOpen={isAddPointsOpen}
        onClose={() => setIsAddPointsOpen(false)}
        context={{
          lifeAreaId: project.life_area_id,
          projectId: project.id,
          goalId: project.primary_goal_id,
          sourceType: 'project',
        }}
        lifeAreas={lifeAreas}
        onSaved={() => setPointsRefreshKey((k) => k + 1)}
      />
    </div>
  );
};
