import React, { useState } from 'react';
import { useProjects } from '../../hooks/useProjects';
import { useVision } from '../../hooks/useVision';
import { useGoals } from '../../hooks/useGoals';
import { useLevels } from '../../hooks/useLevels';
import { ProjectRow } from './components/ProjectRow';
import { ProjectFilters } from './components/ProjectFilters';
import { ProjectFormModal } from './forms/ProjectFormModal';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { Briefcase, ChevronDown, ChevronRight, FolderKanban, Plus } from 'lucide-react';

export interface ProjectsPageProps {
  onNavigate: (route: string) => void;
}

export const ProjectsPage: React.FC<ProjectsPageProps> = ({ onNavigate }) => {
  const {
    projects,
    loading,
    error,
    filter,
    setFilter,
    createProject,
  } = useProjects();

  const { lifeAreas, vision } = useVision();
  const { goals } = useGoals();
  const { levels } = useLevels();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showPaused, setShowPaused] = useState(false);
  const [showDrafts, setShowDrafts] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  // Group projects for visual hierarchy
  const activeProjects = projects.filter((p) => p.status === 'active');
  const pausedProjects = projects.filter((p) => p.status === 'paused');
  const draftProjects = projects.filter((p) => p.status === 'draft');
  const completedProjects = projects.filter((p) => p.status === 'completed');

  const getLifeArea = (areaId?: string) => {
    if (!areaId) return null;
    return lifeAreas.find((a) => a.id === areaId) || null;
  };

  const getGoal = (goalId?: string) => {
    if (!goalId) return null;
    return goals.find((g) => g.id === goalId) || null;
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#ff8a4a] uppercase tracking-widest mb-1.5">
            <FolderKanban className="w-3.5 h-3.5" />
            <span>Execution Bridge</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#fff4ec]">
            Active Projects
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-1 max-w-2xl leading-relaxed">
            Concrete bodies of work designed to produce defined tangible outcomes. Projects turn strategic Goals into executable daily action.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsCreateModalOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          <span>New Project</span>
        </Button>
      </div>

      {/* Filter Controls */}
      <ProjectFilters
        filter={filter}
        lifeAreas={lifeAreas}
        goals={goals}
        onFilterChange={setFilter}
      />

      {/* Main Stream Content */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-2xl bg-white/[0.03]" />
          <Skeleton className="h-24 rounded-2xl bg-white/[0.03]" />
          <Skeleton className="h-24 rounded-2xl bg-white/[0.03]" />
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
          {error}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No Active Projects"
          description="Projects are where you turn high-level Goals into concrete tangible outcomes."
          actionLabel="+ Create First Project"
          onAction={() => setIsCreateModalOpen(true)}
        />
      ) : (
        <div className="space-y-8">
          {/* SECTION 1: PRIMARY ACTIVE PROJECTS (Prominent elevated surface) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#ff8a4a] shadow-[0_0_8px_#ff6a2a] animate-pulse" />
                <h3 className="text-sm font-mono font-bold uppercase tracking-[0.18em] text-[#fff4ec]">
                  Active Execution ({activeProjects.length})
                </h3>
              </div>
            </div>

            {activeProjects.length === 0 ? (
              <div className="p-6 rounded-2xl bg-black/25 border border-dashed border-white/[0.07] text-center">
                <p className="text-xs text-text-muted font-mono">
                  No projects currently in active execution. Activate a draft or define a new project.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeProjects.map((p) => (
                  <ProjectRow
                    key={p.id}
                    project={p}
                    lifeArea={getLifeArea(p.life_area_id)}
                    primaryGoal={getGoal(p.primary_goal_id)}
                    onSelect={(id) => onNavigate(`/projects/${id}`)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* SECTION 2: PAUSED PROJECTS (Collapsible) */}
          {pausedProjects.length > 0 && (
            <section className="space-y-3">
              <button
                type="button"
                onClick={() => setShowPaused(!showPaused)}
                className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-text-muted hover:text-text-primary transition-colors cursor-pointer select-none"
              >
                {showPaused ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5 text-text-muted" />}
                <span>Paused Projects ({pausedProjects.length})</span>
              </button>

              {showPaused && (
                <div className="space-y-3 pl-2 border-l border-white/[0.06]">
                  {pausedProjects.map((p) => (
                    <ProjectRow
                      key={p.id}
                      project={p}
                      lifeArea={getLifeArea(p.life_area_id)}
                      primaryGoal={getGoal(p.primary_goal_id)}
                      onSelect={(id) => onNavigate(`/projects/${id}`)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* SECTION 3: DRAFT PROJECTS (Collapsible) */}
          {draftProjects.length > 0 && (
            <section className="space-y-3">
              <button
                type="button"
                onClick={() => setShowDrafts(!showDrafts)}
                className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-text-muted hover:text-text-primary transition-colors cursor-pointer select-none"
              >
                {showDrafts ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5 text-text-muted" />}
                <span>Draft Projects ({draftProjects.length})</span>
              </button>

              {showDrafts && (
                <div className="space-y-3 pl-2 border-l border-white/[0.06]">
                  {draftProjects.map((p) => (
                    <ProjectRow
                      key={p.id}
                      project={p}
                      lifeArea={getLifeArea(p.life_area_id)}
                      primaryGoal={getGoal(p.primary_goal_id)}
                      onSelect={(id) => onNavigate(`/projects/${id}`)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* SECTION 4: RECENTLY COMPLETED (Collapsible) */}
          {completedProjects.length > 0 && (
            <section className="space-y-3">
              <button
                type="button"
                onClick={() => setShowCompleted(!showCompleted)}
                className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-emerald-400/80 hover:text-emerald-300 transition-colors cursor-pointer select-none"
              >
                {showCompleted ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                <span>Completed Projects ({completedProjects.length})</span>
              </button>

              {showCompleted && (
                <div className="space-y-3 pl-2 border-l border-emerald-500/20">
                  {completedProjects.map((p) => (
                    <ProjectRow
                      key={p.id}
                      project={p}
                      lifeArea={getLifeArea(p.life_area_id)}
                      primaryGoal={getGoal(p.primary_goal_id)}
                      onSelect={(id) => onNavigate(`/projects/${id}`)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {/* Create Project Modal */}
      <ProjectFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        lifeAreas={lifeAreas}
        goals={goals}
        levels={levels}
        vision={vision}
        onSave={async (dto) => {
          await createProject(dto as any);
        }}
      />
    </div>
  );
};
