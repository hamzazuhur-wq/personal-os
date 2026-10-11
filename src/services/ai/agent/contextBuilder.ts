import { ContextRoute, BoundedContextPayload, AIMemory, AISettings } from '../../../types/ai.types';
import { ReadToolExecutors } from '../tools/readTools';
import { IToolExecutionContext } from '../../../types/aiTool.types';

export class ContextBuilder {
  /**
   * Fetches only the routed data slices and builds a bounded, high-signal context payload.
   * Directly respects AISettings (context depth, activities inclusion, memory retrieval).
   */
  static async buildContext(
    route: ContextRoute,
    ctx: IToolExecutionContext,
    settings?: AISettings
  ): Promise<BoundedContextPayload> {
    const rawData: Record<string, any> = {};
    const sourcesUsed: string[] = [];
    let relevantMemories: AIMemory[] = [];

    const depth = settings?.context_depth || 'standard';
    const limit = depth === 'minimal' ? 3 : depth === 'deep' ? 30 : 10;

    // Parallel fetch based on route sources
    const tasks: Promise<any>[] = [];

    // 1. Life Areas
    if (route.sources.includes('vision') || route.sources.includes('life_areas') || route.lifeAreaName) {
      tasks.push(
        ReadToolExecutors.getLifeAreas({}, ctx).then((res) => {
          if (res.success && res.data) {
            rawData.lifeAreas = res.data;
            sourcesUsed.push(`Life Areas (${res.data.length})`);
          }
        })
      );
    }

    // 2. Goals
    if (route.sources.includes('goals')) {
      tasks.push(
        ReadToolExecutors.getActiveGoals({}, ctx).then((res) => {
          if (res.success && res.data) {
            rawData.goals = res.data.slice(0, limit);
            sourcesUsed.push(`Strategic Goals (${rawData.goals.length} active)`);
          }
        })
      );
    }

    // 3. Levels
    if (route.sources.includes('levels')) {
      tasks.push(
        ctx.repositories.visionRepo.getLifeAreas().then(async (areas: any[]) => {
          const targetArea = route.lifeAreaName
            ? areas.find((a: any) => a.name.toLowerCase().includes(route.lifeAreaName!.toLowerCase()))
            : areas[0];

          if (targetArea) {
            const res = await ReadToolExecutors.getLevels({ lifeAreaId: targetArea.id }, ctx);
            if (res.success && res.data) {
              rawData.levels = res.data;
              rawData.lifeAreaName = targetArea.name;
              sourcesUsed.push(`Development Levels (${targetArea.name})`);
            }
          }
        })
      );
    }

    // 4. Skills
    if (route.sources.includes('skills')) {
      tasks.push(
        ReadToolExecutors.getSkills({}, ctx).then((res) => {
          if (res.success && res.data) {
            rawData.skills = res.data.slice(0, limit);
            sourcesUsed.push(`Skill Matrix (${rawData.skills.length} skills)`);
          }
        })
      );
    }

    // 5. Projects
    if (route.sources.includes('projects')) {
      tasks.push(
        ReadToolExecutors.getActiveProjects({}, ctx).then((res) => {
          if (res.success && res.data) {
            rawData.projects = res.data.slice(0, limit);
            sourcesUsed.push(`Active Projects (${rawData.projects.length} active)`);
          }
        })
      );
    }

    // 6. Tasks
    if (route.sources.includes('tasks')) {
      tasks.push(
        ReadToolExecutors.getTasks({ status: 'active' }, ctx).then((res) => {
          if (res.success && res.data) {
            rawData.tasks = res.data.slice(0, limit);
            sourcesUsed.push(`Tasks (${rawData.tasks.length} active)`);
          }
        })
      );
    }

    // 7. Daily Activities (Only if include_activities is not disabled in settings)
    const includeActivities = settings?.include_activities !== false;
    if (route.sources.includes('activities') && includeActivities) {
      tasks.push(
        ReadToolExecutors.getDailyActivities({}, ctx).then((res) => {
          if (res.success && res.data) {
            rawData.activities = res.data.slice(0, limit);
            sourcesUsed.push(`Daily Activities (${rawData.activities.length} logs)`);
          }
        })
      );
    }

    // 7. Execution Engine Context (loads today's execution state when tasks are in scope)
    if (route.sources.includes('tasks') || route.intent === 'analysis' || route.intent === 'planning') {
      tasks.push(
        ReadToolExecutors.getTodayExecution({}, ctx).then((res) => {
          if (res.success && res.data) {
            rawData.execution = res.data;
            const d = res.data;
            sourcesUsed.push(
              `Execution Engine (${d.readyNow?.length || 0} ready, ${d.inProgress?.length || 0} in-progress, ${d.blocked?.length || 0} blocked)`
            );
          }
        })
      );
    }

    // 8. Weekly Focus
    if (route.sources.includes('weekly')) {
      tasks.push(
        ReadToolExecutors.getWeeklyOverview({}, ctx).then((res) => {
          if (res.success && res.data) {
            rawData.weekly = res.data;
            sourcesUsed.push('Weekly Focus');
          }
        })
      );
    }

    // 9. Development Points summary (Module 08 Final)
    if (route.sources.includes('development') || route.sources.includes('levels')) {
      tasks.push(
        ReadToolExecutors.getDevelopmentPointSummary({}, ctx).then((res) => {
          if (res.success && res.data) {
            rawData.developmentPoints = res.data;
            const d: any = res.data;
            sourcesUsed.push(`Development Points (${d.allTimeTotal ?? d.total ?? 0} total)`);
          }
        })
      );
    }

    // 9b. Review & Analytics overview (Module 09) — same analytics service
    // as the dashboard, guaranteeing AI/dashboard value parity.
    if (route.sources.includes('review')) {
      const rangeParams: any =
        route.timeScope === 'today'
          ? { preset: 'today' }
          : route.timeScope === 'this_week'
          ? { preset: 'this_week' }
          : route.lifeAreaName
          ? { lifeAreaName: route.lifeAreaName }
          : {};
      if (route.lifeAreaName) {
        rangeParams.lifeAreaName = route.lifeAreaName;
        tasks.push(
          ReadToolExecutors.getLifeAreaReview(rangeParams, ctx).then((res) => {
            if (res.success && res.data) {
              rawData.reviewAreaDigest = res.data;
              sourcesUsed.push(`Life Area Review (${route.lifeAreaName})`);
            } else {
              return ReadToolExecutors.getReviewOverview({}, ctx).then((fallback) => {
                if (fallback.success && fallback.data) {
                  rawData.reviewOverview = fallback.data;
                  sourcesUsed.push('Review Overview');
                }
              });
            }
          })
        );
      } else {
        tasks.push(
          ReadToolExecutors.getReviewOverview(rangeParams, ctx).then((res) => {
            if (res.success && res.data) {
              rawData.reviewOverview = res.data;
              sourcesUsed.push('Review Overview');
            }
          })
        );
      }
    }

    // 10. Memory Store (Only if include_memories and memory_retrieval_enabled are true)
    const includeMemories = settings?.include_memories !== false && settings?.memory_retrieval_enabled !== false;
    if (includeMemories) {
      tasks.push(
        ReadToolExecutors.getMemories({}, ctx).then((res) => {
          if (res.success && Array.isArray(res.data)) {
            let list = res.data;
            if (route.memoryTypes && route.memoryTypes.length > 0) {
              list = list.filter((m: AIMemory) => route.memoryTypes!.includes(m.type));
            }
            relevantMemories = list.slice(0, limit);
    if (rawData.developmentPoints) {
      const dp: any = rawData.developmentPoints;
      if (dp.scope === 'global') {
        sections.push(
          `### Development Points (independent ledger):\n` +
          `- All-time total: **${dp.allTimeTotal}**\n` +
          `- Last 7 days: ${dp.last7Days} · Last 30 days: ${dp.last30Days}`
        );
      } else {
        sections.push(
          `### Development Points:\n- Total: **${dp.total}** (last 7 days: ${dp.thisWeek})`
        );
      }
    }

    if (rawData.reviewOverview) {
      const rv: any = rawData.reviewOverview;
      const k = rv.kpis || {};
      const areaLines = Array.isArray(rv.byLifeArea)
        ? rv.byLifeArea
            .filter((a: any) => a.points !== 0 || a.tasksCompleted > 0 || a.activitiesLogged > 0)
            .slice(0, 6)
            .map((a: any) => `- **${a.name}**: ${a.points} pts · ${a.tasksCompleted}/${a.tasksTotal} tasks · ${a.goalsProgressed} goals · ${a.activitiesLogged} activities`)
            .join('\n')
        : '';
      sections.push(
        `### Review (${rv.period?.startDate} → ${rv.period?.endDate}):\n` +
          `- Tasks completed: **${k.tasksCompleted ?? 0}** · Projects advanced: ${k.projectsAdvanced ?? 0}\n` +
          `- Goals progressed: ${k.goalsProgressed ?? 0} (+${k.subGoalsProgressed ?? 0} sub-goals) · Activities: ${k.activitiesLogged ?? 0}\n` +
          `- Development Points: **${k.developmentPoints ?? 0}**\n` +
          (areaLines ? `Per Life Area:\n${areaLines}` : '')
      );
    }

    if (rawData.reviewAreaDigest) {
      const rd: any = rawData.reviewAreaDigest;
      const p = rd.points || {};
      const goalLines = Array.isArray(p.byGoal) && p.byGoal.length
        ? p.byGoal.slice(0, 5).map((g: any) => `- ${g.label}: +${g.points} (${g.eventCount} events)`).join('\n')
        : '';
      sections.push(
        `### Life Area Review — ${rd.lifeArea?.name || ''} (${rd.period?.startDate} → ${rd.period?.endDate}):\n` +
          `- KPIs: ${rd.kpis?.tasksCompleted}/${rd.kpis?.tasksTotal} tasks · ${rd.kpis?.projectsAdvanced} projects advanced · ${rd.kpis?.goalsProgressed}+${rd.kpis?.subGoalsProgressed} goals progressed · ${rd.kpis?.activitiesLogged} activities\n` +
          `- Task execution: ${rd.taskExecution?.completed ?? 0}/${rd.taskExecution?.total ?? 0}${rd.taskExecution?.percent != null ? ` (${rd.taskExecution.percent}%)` : ''}\n` +
          `- Development Points: **${p.total ?? 0}** from ${p.eventCount ?? 0} events\n` +
          (goalLines ? `Point breakdown by goal:\n${goalLines}` : '- No point events recorded for this period.')
      );
    }

    if (relevantMemories.length > 0) {
              sourcesUsed.push(`AI Memory (${relevantMemories.length} preferences)`);
            }
          }
        })
      );
    }

    await Promise.all(tasks);

    // Construct high-signal Markdown summary
    const sections: string[] = [];

    if (rawData.tasks && rawData.tasks.length > 0) {
      sections.push(
        `### Tasks (${rawData.tasks.length} active):\n` +
        rawData.tasks.slice(0, 6).map((t: any) => `- **${t.title}** [${t.status}, ${t.priority}]`).join('\n')
      );
    }

    if (rawData.execution) {
      const ex = rawData.execution;
      const parts: string[] = [];
      if (ex.dailyPriorities?.length > 0) {
        parts.push(`**Today's Top Priorities (${ex.dailyPriorities.length}):** ${ex.dailyPriorities.map((t: any) => t.next_action_title || t.title).join(', ')}`);
      }
      if (ex.inProgress?.length > 0) {
        parts.push(`**In Progress (${ex.inProgress.length}):** ${ex.inProgress.map((t: any) => t.title).join(', ')}`);
      }
      if (ex.readyNow?.length > 0) {
        parts.push(`**Ready Now (${ex.readyNow.length}):** ${ex.readyNow.slice(0, 5).map((t: any) => t.next_action_title || t.title).join(', ')}`);
      }
      if (ex.blocked?.length > 0) {
        parts.push(`**Blocked (${ex.blocked.length}):** ${ex.blocked.map((t: any) => `${t.title} — ${t.blocked_reason}`).join('; ')}`);
      }
      if (ex.waiting?.length > 0) {
        parts.push(`**Waiting (${ex.waiting.length}):** ${ex.waiting.map((t: any) => `${t.title} — waiting for: ${t.waiting_for}`).join('; ')}`);
      }
      if (ex.completedToday?.length > 0) {
        parts.push(`**Completed Today (${ex.completedToday.length}):** ${ex.completedToday.map((t: any) => t.title).join(', ')}`);
      }
      if (parts.length > 0) {
        sections.push(`### Execution Engine — Today's State:\n${parts.join('\n')}`);
      }
    }

    if (rawData.goals && rawData.goals.length > 0) {
      sections.push(
        `### Active Goals (${rawData.goals.length}):\n` +
        rawData.goals.map((g: any) => `- **${g.title}** (${g.time_horizon}, ${g.priority})`).join('\n')
      );
    }

    if (rawData.levels && rawData.levels.length > 0) {
      const current = rawData.levels.find((l: any) => l.status === 'current');
      sections.push(
        `### Development Levels in ${rawData.lifeAreaName || 'Area'}:\n` +
        `- Current Level: ${current ? `**${current.name}** (Order ${current.display_order})` : 'None active'}\n` +
        `- Total Defined Levels: ${rawData.levels.length}`
      );
    }

    if (rawData.projects && rawData.projects.length > 0) {
      sections.push(
        `### Active Projects (${rawData.projects.length}):\n` +
        rawData.projects.map((p: any) => `- **${p.title}** (${p.status}, ${p.priority})`).join('\n')
      );
    }

    if (rawData.skills && rawData.skills.length > 0) {
      sections.push(
        `### Skills in Focus (${rawData.skills.length}):\n` +
        rawData.skills.slice(0, 8).map((s: any) => `- **${s.name}** [${s.current_proficiency} → ${s.target_proficiency}] (${s.development_state})`).join('\n')
      );
    }

    if (relevantMemories.length > 0) {
      sections.push(
        `### Confirmed Personal Preferences/Constraints:\n` +
        relevantMemories.map((m) => `- [${m.type.toUpperCase()}]: ${m.content}`).join('\n')
      );
    }

    const summary = sections.length > 0
      ? sections.join('\n\n')
      : 'No specific entities recorded for this domain.';

    return {
      summary,
      sourcesUsed,
      rawStructuredData: rawData,
      relevantMemories,
    };
  }
}
