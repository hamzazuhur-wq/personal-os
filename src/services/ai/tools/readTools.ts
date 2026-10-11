import { AIToolResult, IToolExecutionContext } from '../../../types/aiTool.types';
import { pointService } from '../../points/pointService';
import { AnalyticsFilter } from '../../../types/analytics.types';
import {
  getLifeAreaDashboard,
  getReviewOverview,
  resolveDateRange,
} from '../../analytics/reviewAnalyticsService';
import {
  getConsistencyMetrics,
  getDevelopmentMetrics,
  getExecutionMetrics,
  getGoalHealthMetrics,
  getLifeAreaBalanceMetrics,
  getLevelMetrics,
  getPlanningExecutionMetrics,
  getProjectHealthMetrics,
  getSkillMetrics,
  getTrendMetrics,
} from '../../analytics/metricsService';

/**
 * Module 09 — shared range resolution for AI review tools.
 * The AI consumes the SAME analytics service as the dashboard, so any
 * period question returns values identical to the Review UI (§56).
 */
function resolveRangeFromParams(params: any): { startDate: string; endDate: string } {
  if (params?.startDate && params?.endDate) {
    return resolveDateRange('custom', {
      startDate: String(params.startDate),
      endDate: String(params.endDate),
    });
  }
  const preset = String(params?.preset || 'this_month');
  const mapped =
    preset === 'today'
      ? 'today'
      : preset === 'this_week' || preset === 'week'
      ? 'week'
      : preset === 'this_year' || preset === 'year'
      ? 'year'
      : 'month';
  return resolveDateRange(mapped);
}

export class ReadToolExecutors {
  static async getVision(_params: any, ctx: IToolExecutionContext): Promise<AIToolResult> {
    try {
      const vision = await ctx.repositories.visionRepo.getVision();
      const lifeAreas = await ctx.repositories.visionRepo.getLifeAreas();
      return { success: true, data: { vision, lifeAreas } };
    } catch (err: any) {
      return { success: false, error: { code: 'VISION_FETCH_FAILED', message: err.message } };
    }
  }

  static async getLifeAreas(params: any, ctx: IToolExecutionContext): Promise<AIToolResult> {
    try {
      const areas = await ctx.repositories.visionRepo.getLifeAreas(params?.includeArchived);
      return { success: true, data: areas };
    } catch (err: any) {
      return { success: false, error: { code: 'LIFE_AREAS_FETCH_FAILED', message: err.message } };
    }
  }

  static async getActiveGoals(params: any, ctx: IToolExecutionContext): Promise<AIToolResult> {
    try {
      const goals = await ctx.repositories.goalRepo.getGoals({
        status: 'active',
        life_area_id: params?.life_area_id,
        time_horizon: params?.time_horizon,
      });
      return { success: true, data: goals };
    } catch (err: any) {
      return { success: false, error: { code: 'GOALS_FETCH_FAILED', message: err.message } };
    }
  }

  static async getGoalDetail(params: any, ctx: IToolExecutionContext): Promise<AIToolResult> {
    try {
      const goal = await ctx.repositories.goalRepo.getGoal(params.goalId);
      if (!goal) return { success: false, error: { code: 'GOAL_NOT_FOUND', message: `Goal ${params.goalId} not found` } };
      const subGoals = await ctx.repositories.goalRepo.getChildGoals(params.goalId);
      return { success: true, data: { goal, subGoals } };
    } catch (err: any) {
      return { success: false, error: { code: 'GOAL_DETAIL_FAILED', message: err.message } };
    }
  }

  static async getLevels(params: any, ctx: IToolExecutionContext): Promise<AIToolResult> {
    try {
      const levels = await ctx.repositories.levelRepo.getLevelsByLifeArea(params.lifeAreaId);
      return { success: true, data: levels };
    } catch (err: any) {
      return { success: false, error: { code: 'LEVELS_FETCH_FAILED', message: err.message } };
    }
  }

  static async getLevelDetail(params: any, ctx: IToolExecutionContext): Promise<AIToolResult> {
    try {
      const level = await ctx.repositories.levelRepo.getLevel(params.levelId);
      if (!level) return { success: false, error: { code: 'LEVEL_NOT_FOUND', message: `Level ${params.levelId} not found` } };
      const requirements = await ctx.repositories.levelRepo.getRequirements(params.levelId);
      const skills = await ctx.repositories.levelRepo.getLevelSkills(params.levelId);
      const milestones = await ctx.repositories.levelRepo.getMilestones(params.levelId);
      return { success: true, data: { level, requirements, skills, milestones } };
    } catch (err: any) {
      return { success: false, error: { code: 'LEVEL_DETAIL_FAILED', message: err.message } };
    }
  }

  static async getSkills(params: any, ctx: IToolExecutionContext): Promise<AIToolResult> {
    try {
      const skills = await ctx.repositories.skillRepo.getSkills({
        status: 'active',
        life_area_id: params?.life_area_id,
        development_state: params?.development_state,
      });
      return { success: true, data: skills };
    } catch (err: any) {
      return { success: false, error: { code: 'SKILLS_FETCH_FAILED', message: err.message } };
    }
  }

  static async getSkillDetail(params: any, ctx: IToolExecutionContext): Promise<AIToolResult> {
    try {
      const skill = await ctx.repositories.skillRepo.getSkill(params.skillId);
      if (!skill) return { success: false, error: { code: 'SKILL_NOT_FOUND', message: `Skill ${params.skillId} not found` } };
      const evidence = await ctx.repositories.skillRepo.getSkillEvidence(params.skillId);
      const history = await ctx.repositories.skillRepo.getSkillHistory(params.skillId);
      return { success: true, data: { skill, evidence, history } };
    } catch (err: any) {
      return { success: false, error: { code: 'SKILL_DETAIL_FAILED', message: err.message } };
    }
  }

  static async getActiveProjects(params: any, ctx: IToolExecutionContext): Promise<AIToolResult> {
    try {
      const projects = await ctx.repositories.projectRepo.getProjects({
        status: 'active',
        life_area_id: params?.life_area_id,
      });
      return { success: true, data: projects };
    } catch (err: any) {
      return { success: false, error: { code: 'PROJECTS_FETCH_FAILED', message: err.message } };
    }
  }

  static async getProjectDetail(params: any, ctx: IToolExecutionContext): Promise<AIToolResult> {
    try {
      const project = await ctx.repositories.projectRepo.getProject(params.projectId);
      if (!project) return { success: false, error: { code: 'PROJECT_NOT_FOUND', message: `Project ${params.projectId} not found` } };
      const tasks = await ctx.repositories.projectRepo.getProjectTasks(params.projectId);
      const activities = await ctx.repositories.projectRepo.getProjectActivities(params.projectId);
      return { success: true, data: { project, tasks, activities } };
    } catch (err: any) {
      return { success: false, error: { code: 'PROJECT_DETAIL_FAILED', message: err.message } };
    }
  }

  static async getTasks(params: any, ctx: IToolExecutionContext): Promise<AIToolResult> {
    try {
      const tasks = params?.status === 'done'
        ? await ctx.repositories.taskRepo.getAll()
        : await ctx.repositories.taskRepo.getActive();
      return { success: true, data: tasks };
    } catch (err: any) {
      return { success: false, error: { code: 'TASKS_FETCH_FAILED', message: err.message } };
    }
  }

  static async getDailyActivities(params: any, ctx: IToolExecutionContext): Promise<AIToolResult> {
    try {
      const start = params?.startDate || new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0];
      const end = params?.endDate || new Date().toISOString().split('T')[0];
      const activities = await ctx.repositories.activityRepo.getByDateRange(start, end);
      return { success: true, data: activities };
    } catch (err: any) {
      return { success: false, error: { code: 'ACTIVITIES_FETCH_FAILED', message: err.message } };
    }
  }

  static async getWeeklyOverview(_params: any, ctx: IToolExecutionContext): Promise<AIToolResult> {
    try {
      const focus = await ctx.repositories.weeklyFocusRepo.getCurrentWeekFocus();
      return { success: true, data: focus };
    } catch (err: any) {
      return { success: false, error: { code: 'WEEKLY_FETCH_FAILED', message: err.message } };
    }
  }

  static async getMemories(params: any, ctx: IToolExecutionContext): Promise<AIToolResult> {
    try {
      const memories = await ctx.repositories.aiRepo.getMemories(params?.type || 'all');
      return { success: true, data: memories };
    } catch (err: any) {
      return { success: false, error: { code: 'MEMORIES_FETCH_FAILED', message: err.message } };
    }
  }

  // ─── Module 07 Execution Read Tools ─────────────────────────

  static async getReadyActions(params: any, ctx: IToolExecutionContext): Promise<AIToolResult> {
    try {
      const filter = {
        context: params?.context,
        project_id: params?.project_id,
      };
      const tasks = await ctx.repositories.taskRepo.getReadyTasks(filter);
      return { success: true, data: tasks };
    } catch (err: any) {
      return { success: false, error: { code: 'READY_ACTIONS_FETCH_FAILED', message: err.message } };
    }
  }

  static async getTodayExecution(_params: any, ctx: IToolExecutionContext): Promise<AIToolResult> {
    try {
      const todayData = await ctx.repositories.taskRepo.getTodayExecution();
      return { success: true, data: todayData };
    } catch (err: any) {
      return { success: false, error: { code: 'TODAY_EXECUTION_FETCH_FAILED', message: err.message } };
    }
  }

  static async getBlockedTasks(_params: any, ctx: IToolExecutionContext): Promise<AIToolResult> {
    try {
      const tasks = await ctx.repositories.taskRepo.getBlockedTasks();
      return { success: true, data: tasks };
    } catch (err: any) {
      return { success: false, error: { code: 'BLOCKED_TASKS_FETCH_FAILED', message: err.message } };
    }
  }

  static async getWaitingTasks(_params: any, ctx: IToolExecutionContext): Promise<AIToolResult> {
    try {
      const tasks = await ctx.repositories.taskRepo.getWaitingTasks();
      return { success: true, data: tasks };
    } catch (err: any) {
      return { success: false, error: { code: 'WAITING_TASKS_FETCH_FAILED', message: err.message } };
    }
  }

  static async getProjectExecutionHealth(params: any, ctx: IToolExecutionContext): Promise<AIToolResult> {
    try {
      if (!params?.project_id) {
        return { success: false, error: { code: 'MISSING_PROJECT_ID', message: 'project_id is required' } };
      }
      const health = await ctx.repositories.taskRepo.getProjectExecutionHealth(params.project_id);
      return { success: true, data: health };
    } catch (err: any) {
      return { success: false, error: { code: 'PROJECT_HEALTH_FETCH_FAILED', message: err.message } };
    }
  }

  // ─── Module 07 Revision: Goal Hierarchy Read Tools ──────────

  static async getGoalTree(params: any, ctx: IToolExecutionContext): Promise<AIToolResult> {
    try {
      const goals = await ctx.repositories.goalRepo.getGoals(
        params?.life_area_id ? { life_area_id: params.life_area_id } : undefined
      );
      const tasks = await ctx.repositories.taskRepo.getAll();
      return { success: true, data: { goals, tasks } };
    } catch (err: any) {
      return { success: false, error: { code: 'GOAL_TREE_FETCH_FAILED', message: err.message } };
    }
  }

  static async getGoalPath(params: any, ctx: IToolExecutionContext): Promise<AIToolResult> {
    try {
      if (!params?.goal_id) {
        return { success: false, error: { code: 'MISSING_GOAL_ID', message: 'goal_id is required' } };
      }
      const path = await ctx.repositories.goalRepo.getGoalPath(params.goal_id);
      return { success: true, data: path };
    } catch (err: any) {
      return { success: false, error: { code: 'GOAL_PATH_FETCH_FAILED', message: err.message } };
    }
  }

  static async getGoalTasks(params: any, ctx: IToolExecutionContext): Promise<AIToolResult> {
    try {
      if (!params?.goal_id) {
        return { success: false, error: { code: 'MISSING_GOAL_ID', message: 'goal_id is required' } };
      }
      const tasks = await ctx.repositories.taskRepo.getTasksByGoal(
        params.goal_id,
        params.include_descendants !== false
      );
      return { success: true, data: tasks };
    } catch (err: any) {
      return { success: false, error: { code: 'GOAL_TASKS_FETCH_FAILED', message: err.message } };
    }
  }

  static async getWeeklyGoalProgress(params: any, ctx: IToolExecutionContext): Promise<AIToolResult> {
    try {
      const weekId = params?.week_id;
      const goals = await ctx.repositories.goalRepo.getGoals();
      const tasks = await ctx.repositories.taskRepo.getAll(weekId ? { weekId } : undefined);
      const activities = await ctx.repositories.activityRepo.getAll();
      return { success: true, data: { goals, tasks, activities } };
    } catch (err: any) {
      return { success: false, error: { code: 'WEEKLY_GOAL_PROGRESS_FAILED', message: err.message } };
    }
  }

  // ─── Module 08 Final: Development Points Read Tools ────────

  static async getDevelopmentPointSummary(params: any, _ctx: IToolExecutionContext): Promise<AIToolResult> {
    try {
      const now = Date.now();
      const weekAgo = new Date(now - 7 * 86400000).toISOString();
      const monthAgo = new Date(now - 30 * 86400000).toISOString();

      if (params?.lifeAreaId) {
        const summary = await pointService.getLifeAreaPointSummary(params.lifeAreaId);
        return { success: true, data: { scope: 'life_area', lifeAreaId: params.lifeAreaId, ...summary } };
      }

      const areas = await _ctx.repositories.visionRepo.getLifeAreas();
      const areaIds = areas.map((a: { id: string }) => a.id);

      const [allTime, week, month] = await Promise.all([
        pointService.getPeriodPointBreakdown(areaIds),
        pointService.getPeriodPointBreakdown(areaIds, weekAgo),
        pointService.getPeriodPointBreakdown(areaIds, monthAgo),
      ]);

      return {
        success: true,
        data: {
          scope: 'global',
          allTimeTotal: allTime.total,
          last7Days: week.total,
          last30Days: month.total,
          byLifeArea: allTime.byLifeArea,
        },
      };
    } catch (err: any) {
      return { success: false, error: { code: 'DEV_POINTS_SUMMARY_FAILED', message: err.message } };
    }
  }

  static async getDevelopmentPointHistory(params: any, _ctx: IToolExecutionContext): Promise<AIToolResult> {
    try {
      const limit = Math.min(Number(params?.limit) || 10, 50);
      const events = await pointService.getRecentEvents(
        {
          life_area_id: params?.lifeAreaId,
          goal_id: params?.goalId,
          project_id: params?.projectId,
          task_id: params?.taskId,
        },
        limit
      );
      return { success: true, data: events };
    } catch (err: any) {
      return { success: false, error: { code: 'DEV_POINTS_HISTORY_FAILED', message: err.message } };
    }
  }

  // ─── Module 09: Review & Analytics Read Tools ──────────────

  /**
   * Period overview across all Life Areas. Consumes the exact same
   * analytics service that powers the Review dashboard.
   */
  static async getReviewOverview(params: any, _ctx: IToolExecutionContext): Promise<AIToolResult> {
    try {
      const { startDate, endDate } = resolveRangeFromParams(params);
      const filter: AnalyticsFilter = { startDate, endDate };
      const overview = await getReviewOverview(filter);
      return {
        success: true,
        data: {
          period: { startDate: overview.range.startDate, endDate: overview.range.endDate },
          kpis: overview.kpis,
          byLifeArea: overview.byLifeArea,
        },
      };
    } catch (err: any) {
      return { success: false, error: { code: 'REVIEW_OVERVIEW_FAILED', message: err.message } };
    }
  }

  /**
   * Full Life Area review digest (KPIs + task execution + point breakdown
   * by goal/project/source + goal/project rows). Supports scoping by id or
   * by the human-readable area name.
   */
  static async getLifeAreaReview(params: any, ctx: IToolExecutionContext): Promise<AIToolResult> {
    try {
      const areas = await ctx.repositories.visionRepo.getLifeAreas();
      let areaId: string | undefined = params?.lifeAreaId;
      if (!areaId && params?.lifeAreaName) {
        const match = areas.find(
          (a: { name: string }) =>
            a.name.toLowerCase() === String(params.lifeAreaName).toLowerCase().trim()
        );
        areaId = match?.id;
      }
      if (!areaId) {
        return {
          success: false,
          error: { code: 'LIFE_AREA_NOT_FOUND', message: 'Provide lifeAreaId or lifeAreaName of an existing Life Area.' },
        };
      }

      const { startDate, endDate } = resolveRangeFromParams(params);
      const dashboard = await getLifeAreaDashboard(areaId, { startDate, endDate });

      // Bounded digest: omit heavy drill-down payloads from the AI context.
      return {
        success: true,
        data: {
          period: { startDate: dashboard.range.startDate, endDate: dashboard.range.endDate },
          lifeArea: { id: dashboard.lifeAreaId, name: dashboard.name },
          kpis: dashboard.kpis,
          taskExecution: dashboard.taskExecution,
          points: {
            total: dashboard.points.total,
            eventCount: dashboard.points.eventCount,
            byGoal: dashboard.points.byGoal.slice(0, 8),
            byProject: dashboard.points.byProject.slice(0, 8),
            bySourceType: dashboard.points.bySourceType,
          },
          goalRows: dashboard.goalRows.slice(0, 10).map((g) => ({
            title: g.title,
            pathLabel: g.pathLabel,
            completedTasks: g.completedTasks,
            totalTasks: g.totalTasks,
            points: g.points,
          })),
          projectsAdvanced: dashboard.projectRows.filter((p) => p.advancedInPeriod).map((p) => p.title),
        },
      };
    } catch (err: any) {
      return { success: false, error: { code: 'LIFE_AREA_REVIEW_FAILED', message: err.message } };
    }
  }

  // ─── Module 10: Metrics & Analytics Read Tools ──────────────

  static async getExecutionMetrics(params: any, _ctx: IToolExecutionContext): Promise<AIToolResult> {
    try {
      const { startDate, endDate } = resolveRangeFromParams(params);
      const metrics = await getExecutionMetrics({ startDate, endDate });
      return {
        success: true,
        data: {
          period: { startDate, endDate },
          taskCompletionRate: metrics.taskCompletionRate,
          taskExecutionVolume: metrics.taskExecutionVolume,
          activityVolume: metrics.activityVolume,
          activityDuration: metrics.activityDuration,
          taskCompletionTrend: metrics.taskCompletionTrend,
          taskAging: metrics.taskAging,
          overdueIndicators: metrics.overdueIndicators,
        },
      };
    } catch (err: any) {
      return { success: false, error: { code: 'EXECUTION_METRICS_FAILED', message: err.message } };
    }
  }

  static async getGoalHealthMetrics(params: any, _ctx: IToolExecutionContext): Promise<AIToolResult> {
    try {
      const { startDate, endDate } = resolveRangeFromParams(params);
      const metrics = await getGoalHealthMetrics({ startDate, endDate });
      return {
        success: true,
        data: {
          period: { startDate, endDate },
          statusCounts: metrics.statusCounts,
          inactiveGoalIds: metrics.inactiveGoalIds,
          overallSignal: metrics.overallSignal,
          healthByGoal: metrics.healthByGoal.slice(0, 20),
        },
      };
    } catch (err: any) {
      return { success: false, error: { code: 'GOAL_HEALTH_METRICS_FAILED', message: err.message } };
    }
  }

  static async getProjectHealthMetrics(params: any, _ctx: IToolExecutionContext): Promise<AIToolResult> {
    try {
      const { startDate, endDate } = resolveRangeFromParams(params);
      const metrics = await getProjectHealthMetrics({ startDate, endDate });
      return {
        success: true,
        data: {
          period: { startDate, endDate },
          statusCounts: metrics.statusCounts,
          inactiveProjectIds: metrics.inactiveProjectIds,
          overallSignal: metrics.overallSignal,
          healthByProject: metrics.healthByProject.slice(0, 20),
        },
      };
    } catch (err: any) {
      return { success: false, error: { code: 'PROJECT_HEALTH_METRICS_FAILED', message: err.message } };
    }
  }

  static async getDevelopmentMetrics(params: any, _ctx: IToolExecutionContext): Promise<AIToolResult> {
    try {
      const { startDate, endDate } = resolveRangeFromParams(params);
      const metrics = await getDevelopmentMetrics({ startDate, endDate });
      return {
        success: true,
        data: {
          period: { startDate, endDate },
          allTimePoints: metrics.allTimePoints,
          periodPoints: metrics.periodPoints,
          pointsByLifeArea: metrics.pointsByLifeArea,
          pointAcceleration: metrics.pointAcceleration,
          pointTrend: metrics.pointTrend,
        },
      };
    } catch (err: any) {
      return { success: false, error: { code: 'DEVELOPMENT_METRICS_FAILED', message: err.message } };
    }
  }

  static async getLifeAreaBalanceMetrics(params: any, _ctx: IToolExecutionContext): Promise<AIToolResult> {
    try {
      const { startDate, endDate } = resolveRangeFromParams(params);
      const metrics = await getLifeAreaBalanceMetrics({ startDate, endDate });
      return {
        success: true,
        data: {
          period: { startDate, endDate },
          distributionByPoints: metrics.distributionByPoints,
          distributionByActivities: metrics.distributionByActivities,
          distributionByTasks: metrics.distributionByTasks,
          areaTrends: metrics.areaTrends,
        },
      };
    } catch (err: any) {
      return { success: false, error: { code: 'LIFE_AREA_BALANCE_METRICS_FAILED', message: err.message } };
    }
  }

  static async getSkillMetrics(params: any, _ctx: IToolExecutionContext): Promise<AIToolResult> {
    try {
      const { startDate, endDate } = resolveRangeFromParams(params);
      const metrics = await getSkillMetrics({ startDate, endDate });
      return {
        success: true,
        data: {
          period: { startDate, endDate },
          proficiencyDistribution: metrics.proficiencyDistribution,
          developmentStateDistribution: metrics.developmentStateDistribution,
          skillsWithRecentEvidence: metrics.skillsWithRecentEvidence,
          skillsWithoutRecentEvidence: metrics.skillsWithoutRecentEvidence.slice(0, 20),
          pointsBySkill: metrics.pointsBySkill,
        },
      };
    } catch (err: any) {
      return { success: false, error: { code: 'SKILL_METRICS_FAILED', message: err.message } };
    }
  }

  static async getLevelMetrics(params: any, _ctx: IToolExecutionContext): Promise<AIToolResult> {
    try {
      const { startDate, endDate } = resolveRangeFromParams({ ...params, preset: 'this_month' });
      const metrics = await getLevelMetrics({ startDate, endDate, lifeAreaId: params?.lifeAreaId });
      return {
        success: true,
        data: {
          period: { startDate, endDate },
          currentLevel: metrics.currentLevel,
          nextLevel: metrics.nextLevel,
          requirements: metrics.requirements,
        },
      };
    } catch (err: any) {
      return { success: false, error: { code: 'LEVEL_METRICS_FAILED', message: err.message } };
    }
  }

  static async getPlanningExecutionMetrics(params: any, _ctx: IToolExecutionContext): Promise<AIToolResult> {
    try {
      const { startDate, endDate } = resolveRangeFromParams(params);
      const metrics = await getPlanningExecutionMetrics({ startDate, endDate });
      return {
        success: true,
        data: {
          period: { startDate, endDate },
          taskExecutionRate: metrics.taskExecutionRate,
          goalEvidenceRate: metrics.goalEvidenceRate,
          projectActivityRate: metrics.projectActivityRate,
        },
      };
    } catch (err: any) {
      return { success: false, error: { code: 'PLANNING_EXECUTION_METRICS_FAILED', message: err.message } };
    }
  }

  static async getTrendMetrics(params: any, _ctx: IToolExecutionContext): Promise<AIToolResult> {
    try {
      const { startDate, endDate } = resolveRangeFromParams(params);
      const metrics = await getTrendMetrics({ startDate, endDate });
      return {
        success: true,
        data: {
          period: { startDate, endDate },
          taskCompletionTrend: metrics.taskCompletionTrend,
          pointTrend: metrics.pointTrend,
          activityTrend: metrics.activityTrend,
        },
      };
    } catch (err: any) {
      return { success: false, error: { code: 'TREND_METRICS_FAILED', message: err.message } };
    }
  }

  static async getConsistencyMetrics(params: any, _ctx: IToolExecutionContext): Promise<AIToolResult> {
    try {
      const { startDate, endDate } = resolveRangeFromParams(params);
      const metrics = await getConsistencyMetrics({ startDate, endDate });
      return {
        success: true,
        data: {
          period: { startDate, endDate },
          activeDays: metrics.activeDays,
          weeksWithActivity: metrics.weeksWithActivity,
          currentStreak: metrics.currentStreak,
        },
      };
    } catch (err: any) {
      return { success: false, error: { code: 'CONSISTENCY_METRICS_FAILED', message: err.message } };
    }
  }
}
