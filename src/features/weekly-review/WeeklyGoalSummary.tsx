import React from 'react';
import { Activity } from '../../types/activity.types';
import { Task } from '../../types/task.types';
import { Goal } from '../../types/goal.types';
import { LifeArea } from '../../types/vision.types';
import { GoalHierarchy } from '../../utils/goalHierarchy';
import { Target, CheckCircle2, Clock } from 'lucide-react';

export interface WeeklyGoalSummaryProps {
  activities: Activity[];
  tasks: Task[];
  goals: Goal[];
  lifeAreas?: LifeArea[];
}

export const WeeklyGoalSummary: React.FC<WeeklyGoalSummaryProps> = ({
  activities,
  tasks,
  goals,
}) => {
  // Aggregate activities & completed tasks by goal
  const completedTasks = tasks.filter((t) => t.status === 'completed');

  const goalSummaryMap = new Map<
    string,
    {
      goal: Goal;
      path: string;
      completedTaskCount: number;
      activityCount: number;
      totalMinutes: number;
    }
  >();

  for (const goal of goals) {
    if (goal.status === 'archived') continue;

    const goalTasks = completedTasks.filter((t) => t.related_goal_id === goal.id);
    const goalActivities = activities.filter((a) => a.related_goal_id === goal.id);
    const totalMins = goalActivities.reduce((acc, a) => acc + (a.duration_minutes || 0), 0);

    if (goalTasks.length > 0 || goalActivities.length > 0) {
      goalSummaryMap.set(goal.id, {
        goal,
        path: GoalHierarchy.formatGoalPath(goal.id, goals),
        completedTaskCount: goalTasks.length,
        activityCount: goalActivities.length,
        totalMinutes: totalMins,
      });
    }
  }

  const activeSummaries = Array.from(goalSummaryMap.values());

  if (activeSummaries.length === 0) {
    return null;
  }

  return (
    <div className="p-5 sm:p-6 rounded-3xl border border-white/[0.08] bg-black/40 backdrop-blur-2xl shadow-xl space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-xl bg-[#ff6a2a]/15 border border-[#ff8a4a]/30 text-[#ff8a4a]">
          <Target className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-[#fff4ec]">
            Weekly Strategic Goal Progress
          </h2>
          <p className="text-xs text-text-secondary">
            Factual execution breakdown grouped across the Goal hierarchy.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {activeSummaries.map((summary) => (
          <div
            key={summary.goal.id}
            className="p-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] space-y-1.5"
          >
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#ff8a4a] block truncate">
              {summary.path}
            </span>
            <h3 className="text-xs sm:text-sm font-bold text-[#fff4ec] truncate">
              {summary.goal.title}
            </h3>

            <div className="flex items-center gap-3 pt-1 text-xs font-mono text-text-muted">
              {summary.completedTaskCount > 0 && (
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{summary.completedTaskCount} Task{summary.completedTaskCount > 1 ? 's' : ''} Done</span>
                </span>
              )}

              {summary.totalMinutes > 0 && (
                <span className="flex items-center gap-1 text-text-secondary">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{Math.floor(summary.totalMinutes / 60)}h {summary.totalMinutes % 60}m</span>
                </span>
              )}
              {summary.activityCount > 0 && (
                <span>{summary.activityCount} activit{summary.activityCount === 1 ? 'y' : 'ies'}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
