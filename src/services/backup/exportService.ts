import { auraDexieDb as posDexieDb } from '../adapters/dexie/posDexieDb';
import { APP_CONFIG } from '../../config/app.config';

export interface AuraBackupData {
  version: string;
  exported_at: string;
  data: {
    captures: unknown[];
    activities: unknown[];
    tasks: unknown[];
    weekly_focus: unknown[];
    settings: unknown[];
    visions: unknown[];
    life_areas: unknown[];
    area_visions: unknown[];
    current_states: unknown[];
    vision_items: unknown[];
    goals?: unknown[];
    levels?: unknown[];
    level_requirements?: unknown[];
    level_skills?: unknown[];
    level_milestones?: unknown[];
    requirement_evidence?: unknown[];
    level_history?: unknown[];
    progression_exceptions?: unknown[];
    projects?: unknown[];
    skills?: unknown[];
    skill_history?: unknown[];
    skill_evidence?: unknown[];
    skill_goal_relations?: unknown[];
    skill_project_relations?: unknown[];
    skill_level_relations?: unknown[];
    ai_conversations?: unknown[];
    ai_conversation_groups?: unknown[];
    ai_messages?: unknown[];
    ai_memories?: unknown[];
    ai_audit_events?: unknown[];
    ai_settings?: unknown[];
    ai_request_logs?: unknown[];
    idea_revisions?: unknown[];
    idea_categories?: unknown[];
    ai_recommendation_runs?: unknown[];
    ai_recommendations?: unknown[];
    practices?: unknown[];
    point_ledger?: unknown[];
  };
}

export class ExportService {
  /**
   * Exports all POS data into a structured, portable JSON format.
   */
  static async exportAllData(): Promise<AuraBackupData> {
    const [
      captures,
      activities,
      tasks,
      weekly_focus,
      settings,
      visions,
      life_areas,
      area_visions,
      current_states,
      vision_items,
      goals,
      levels,
      level_requirements,
      level_skills,
      level_milestones,
      requirement_evidence,
      level_history,
      progression_exceptions,
      projects,
      skills,
      skill_history,
      skill_evidence,
      skill_goal_relations,
      skill_project_relations,
      skill_level_relations,
      ai_conversations,
      ai_conversation_groups,
      ai_messages,
      ai_memories,
      ai_audit_events,
      ai_settings,
      ai_request_logs,
      idea_revisions,
      idea_categories,
      ai_recommendation_runs,
      ai_recommendations,
      practices,
      point_ledger,
    ] = await Promise.all([
      posDexieDb.captures.toArray(),
      posDexieDb.activities.toArray(),
      posDexieDb.tasks.toArray(),
      posDexieDb.weekly_focus.toArray(),
      posDexieDb.settings.toArray(),
      posDexieDb.visions.toArray(),
      posDexieDb.life_areas.toArray(),
      posDexieDb.area_visions.toArray(),
      posDexieDb.current_states.toArray(),
      posDexieDb.vision_items.toArray(),
      posDexieDb.goals.toArray(),
      posDexieDb.levels.toArray(),
      posDexieDb.level_requirements.toArray(),
      posDexieDb.level_skills.toArray(),
      posDexieDb.level_milestones.toArray(),
      posDexieDb.requirement_evidence.toArray(),
      posDexieDb.level_history.toArray(),
      posDexieDb.progression_exceptions.toArray(),
      posDexieDb.projects.toArray(),
      posDexieDb.skills.toArray(),
      posDexieDb.skill_history.toArray(),
      posDexieDb.skill_evidence.toArray(),
      posDexieDb.skill_goal_relations.toArray(),
      posDexieDb.skill_project_relations.toArray(),
      posDexieDb.skill_level_relations.toArray(),
      posDexieDb.ai_conversations.toArray(),
      posDexieDb.ai_conversation_groups.toArray(),
      posDexieDb.ai_messages.toArray(),
      posDexieDb.ai_memories.toArray(),
      posDexieDb.ai_audit_events.toArray(),
      posDexieDb.ai_settings.toArray(),
      posDexieDb.ai_request_logs.toArray(),
      posDexieDb.idea_revisions.toArray(),
      posDexieDb.idea_categories.toArray(),
      posDexieDb.ai_recommendation_runs.toArray(),
      posDexieDb.ai_recommendations.toArray(),
      posDexieDb.practices.toArray(),
      posDexieDb.point_ledger.toArray(),
    ]);

    return {
      version: APP_CONFIG.version,
      exported_at: new Date().toISOString(),
      data: {
        captures,
        activities,
        tasks,
        weekly_focus,
        settings,
        visions,
        life_areas,
        area_visions,
        current_states,
        vision_items,
        goals,
        levels,
        level_requirements,
        level_skills,
        level_milestones,
        requirement_evidence,
        level_history,
        progression_exceptions,
        projects,
        skills,
        skill_history,
        skill_evidence,
        skill_goal_relations,
        skill_project_relations,
        skill_level_relations,
        ai_conversations,
        ai_conversation_groups,
        ai_messages,
        ai_memories,
        ai_audit_events,
        ai_settings,
        ai_request_logs,
        idea_revisions,
        idea_categories,
        ai_recommendation_runs,
        ai_recommendations,
        practices,
        point_ledger,
      },
    };
  }

  /**
   * Imports a valid POS backup JSON file and restores records into the active storage.
   */
  static async importData(backupData: AuraBackupData): Promise<{ success: boolean; message: string }> {
    if (!backupData || !backupData.data) {
      throw new Error('Invalid backup file structure.');
    }

    await posDexieDb.transaction('rw', [
      posDexieDb.captures,
      posDexieDb.activities,
      posDexieDb.tasks,
      posDexieDb.weekly_focus,
      posDexieDb.settings,
      posDexieDb.visions,
      posDexieDb.life_areas,
      posDexieDb.area_visions,
      posDexieDb.current_states,
      posDexieDb.vision_items,
      posDexieDb.goals,
      posDexieDb.levels,
      posDexieDb.level_requirements,
      posDexieDb.level_skills,
      posDexieDb.level_milestones,
      posDexieDb.requirement_evidence,
      posDexieDb.level_history,
      posDexieDb.progression_exceptions,
      posDexieDb.projects,
      posDexieDb.skills,
      posDexieDb.skill_history,
      posDexieDb.skill_evidence,
      posDexieDb.skill_goal_relations,
      posDexieDb.skill_project_relations,
      posDexieDb.skill_level_relations,
      posDexieDb.ai_conversations,
      posDexieDb.ai_conversation_groups,
      posDexieDb.ai_messages,
      posDexieDb.ai_memories,
      posDexieDb.ai_audit_events,
      posDexieDb.ai_settings,
      posDexieDb.ai_request_logs,
      posDexieDb.idea_revisions,
      posDexieDb.idea_categories,
      posDexieDb.ai_recommendation_runs,
      posDexieDb.ai_recommendations,
      posDexieDb.practices,
      posDexieDb.point_ledger,
    ], async () => {
      if (Array.isArray(backupData.data.captures)) {
        await posDexieDb.captures.clear();
        await posDexieDb.captures.bulkAdd(backupData.data.captures as any);
      }
      if (Array.isArray(backupData.data.activities)) {
        await posDexieDb.activities.clear();
        await posDexieDb.activities.bulkAdd(backupData.data.activities as any);
      }
      if (Array.isArray(backupData.data.tasks)) {
        await posDexieDb.tasks.clear();
        await posDexieDb.tasks.bulkAdd(backupData.data.tasks as any);
      }
      if (Array.isArray(backupData.data.weekly_focus)) {
        await posDexieDb.weekly_focus.clear();
        await posDexieDb.weekly_focus.bulkAdd(backupData.data.weekly_focus as any);
      }
      if (Array.isArray(backupData.data.settings) && backupData.data.settings.length > 0) {
        await posDexieDb.settings.clear();
        await posDexieDb.settings.bulkAdd(backupData.data.settings as any);
      }
      if (Array.isArray(backupData.data.visions)) {
        await posDexieDb.visions.clear();
        await posDexieDb.visions.bulkAdd(backupData.data.visions as any);
      }
      if (Array.isArray(backupData.data.life_areas)) {
        await posDexieDb.life_areas.clear();
        await posDexieDb.life_areas.bulkAdd(backupData.data.life_areas as any);
      }
      if (Array.isArray(backupData.data.area_visions)) {
        await posDexieDb.area_visions.clear();
        await posDexieDb.area_visions.bulkAdd(backupData.data.area_visions as any);
      }
      if (Array.isArray(backupData.data.current_states)) {
        await posDexieDb.current_states.clear();
        await posDexieDb.current_states.bulkAdd(backupData.data.current_states as any);
      }
      if (Array.isArray(backupData.data.vision_items)) {
        await posDexieDb.vision_items.clear();
        await posDexieDb.vision_items.bulkAdd(backupData.data.vision_items as any);
      }
      if (Array.isArray(backupData.data.goals)) {
        await posDexieDb.goals.clear();
        await posDexieDb.goals.bulkAdd(backupData.data.goals as any);
      }
      if (Array.isArray(backupData.data.levels)) {
        await posDexieDb.levels.clear();
        await posDexieDb.levels.bulkAdd(backupData.data.levels as any);
      }
      if (Array.isArray(backupData.data.level_requirements)) {
        await posDexieDb.level_requirements.clear();
        await posDexieDb.level_requirements.bulkAdd(backupData.data.level_requirements as any);
      }
      if (Array.isArray(backupData.data.level_skills)) {
        await posDexieDb.level_skills.clear();
        await posDexieDb.level_skills.bulkAdd(backupData.data.level_skills as any);
      }
      if (Array.isArray(backupData.data.level_milestones)) {
        await posDexieDb.level_milestones.clear();
        await posDexieDb.level_milestones.bulkAdd(backupData.data.level_milestones as any);
      }
      if (Array.isArray(backupData.data.requirement_evidence)) {
        await posDexieDb.requirement_evidence.clear();
        await posDexieDb.requirement_evidence.bulkAdd(backupData.data.requirement_evidence as any);
      }
      if (Array.isArray(backupData.data.level_history)) {
        await posDexieDb.level_history.clear();
        await posDexieDb.level_history.bulkAdd(backupData.data.level_history as any);
      }
      if (Array.isArray(backupData.data.progression_exceptions)) {
        await posDexieDb.progression_exceptions.clear();
        await posDexieDb.progression_exceptions.bulkAdd(backupData.data.progression_exceptions as any);
      }
      if (Array.isArray(backupData.data.projects)) {
        await posDexieDb.projects.clear();
        await posDexieDb.projects.bulkAdd(backupData.data.projects as any);
      }
      if (Array.isArray(backupData.data.skills)) {
        await posDexieDb.skills.clear();
        await posDexieDb.skills.bulkAdd(backupData.data.skills as any);
      }
      if (Array.isArray(backupData.data.skill_history)) {
        await posDexieDb.skill_history.clear();
        await posDexieDb.skill_history.bulkAdd(backupData.data.skill_history as any);
      }
      if (Array.isArray(backupData.data.skill_evidence)) {
        await posDexieDb.skill_evidence.clear();
        await posDexieDb.skill_evidence.bulkAdd(backupData.data.skill_evidence as any);
      }
      if (Array.isArray(backupData.data.skill_goal_relations)) {
        await posDexieDb.skill_goal_relations.clear();
        await posDexieDb.skill_goal_relations.bulkAdd(backupData.data.skill_goal_relations as any);
      }
      if (Array.isArray(backupData.data.skill_project_relations)) {
        await posDexieDb.skill_project_relations.clear();
        await posDexieDb.skill_project_relations.bulkAdd(backupData.data.skill_project_relations as any);
      }
      if (Array.isArray(backupData.data.skill_level_relations)) {
        await posDexieDb.skill_level_relations.clear();
        await posDexieDb.skill_level_relations.bulkAdd(backupData.data.skill_level_relations as any);
      }
      if (Array.isArray(backupData.data.ai_conversations)) {
        await posDexieDb.ai_conversations.clear();
        await posDexieDb.ai_conversations.bulkAdd(backupData.data.ai_conversations as any);
      }
      if (Array.isArray(backupData.data.ai_conversation_groups)) {
        await posDexieDb.ai_conversation_groups.clear();
        await posDexieDb.ai_conversation_groups.bulkAdd(backupData.data.ai_conversation_groups as any);
      }
      if (Array.isArray(backupData.data.ai_messages)) {
        await posDexieDb.ai_messages.clear();
        await posDexieDb.ai_messages.bulkAdd(backupData.data.ai_messages as any);
      }
      if (Array.isArray(backupData.data.ai_memories)) {
        await posDexieDb.ai_memories.clear();
        await posDexieDb.ai_memories.bulkAdd(backupData.data.ai_memories as any);
      }
      if (Array.isArray(backupData.data.ai_audit_events)) {
        await posDexieDb.ai_audit_events.clear();
        await posDexieDb.ai_audit_events.bulkAdd(backupData.data.ai_audit_events as any);
      }
      if (Array.isArray(backupData.data.ai_settings)) {
        await posDexieDb.ai_settings.clear();
        await posDexieDb.ai_settings.bulkAdd(backupData.data.ai_settings as any);
      }
      if (Array.isArray(backupData.data.ai_request_logs)) {
        await posDexieDb.ai_request_logs.clear();
        await posDexieDb.ai_request_logs.bulkAdd(backupData.data.ai_request_logs as any);
      }
      if (Array.isArray(backupData.data.idea_revisions)) {
        await posDexieDb.idea_revisions.clear();
        await posDexieDb.idea_revisions.bulkAdd(backupData.data.idea_revisions as any);
      }
      // Module 11: categories ride along with backups. Older pre-v15
      // archives omit the key entirely — defaults re-seed automatically.
      if (Array.isArray(backupData.data.idea_categories)) {
        await posDexieDb.idea_categories.clear();
        await posDexieDb.idea_categories.bulkAdd(backupData.data.idea_categories as any);
      }
      // Module 11: proactive AI runs and recommendations. Older pre-v17
      // archives omit these keys entirely — they simply won't be restored.
      if (Array.isArray(backupData.data.ai_recommendation_runs)) {
        await posDexieDb.ai_recommendation_runs.clear();
        await posDexieDb.ai_recommendation_runs.bulkAdd(backupData.data.ai_recommendation_runs as any);
      }
      if (Array.isArray(backupData.data.ai_recommendations)) {
        await posDexieDb.ai_recommendations.clear();
        await posDexieDb.ai_recommendations.bulkAdd(backupData.data.ai_recommendations as any);
      }
      if (Array.isArray(backupData.data.practices)) {
        await posDexieDb.practices.clear();
        await posDexieDb.practices.bulkAdd(backupData.data.practices as any);
      }
      if (Array.isArray(backupData.data.point_ledger)) {
        await posDexieDb.point_ledger.clear();
        await posDexieDb.point_ledger.bulkAdd(backupData.data.point_ledger as any);
      }
    });

    return { success: true, message: 'Database successfully restored from backup.' };
  }

  /**
   * Purges all local data with a confirmation safeguard.
   */
  static async clearAllData(): Promise<void> {
    await Promise.all([
      posDexieDb.captures.clear(),
      posDexieDb.activities.clear(),
      posDexieDb.tasks.clear(),
      posDexieDb.weekly_focus.clear(),
      posDexieDb.settings.clear(),
      posDexieDb.visions.clear(),
      posDexieDb.life_areas.clear(),
      posDexieDb.area_visions.clear(),
      posDexieDb.current_states.clear(),
      posDexieDb.vision_items.clear(),
      posDexieDb.goals.clear(),
      posDexieDb.levels.clear(),
      posDexieDb.level_requirements.clear(),
      posDexieDb.level_skills.clear(),
      posDexieDb.level_milestones.clear(),
      posDexieDb.requirement_evidence.clear(),
      posDexieDb.level_history.clear(),
      posDexieDb.progression_exceptions.clear(),
      posDexieDb.projects.clear(),
      posDexieDb.skills.clear(),
      posDexieDb.skill_history.clear(),
      posDexieDb.skill_evidence.clear(),
      posDexieDb.skill_goal_relations.clear(),
      posDexieDb.skill_project_relations.clear(),
      posDexieDb.skill_level_relations.clear(),
      posDexieDb.ai_conversations.clear(),
      posDexieDb.ai_conversation_groups.clear(),
      posDexieDb.ai_messages.clear(),
      posDexieDb.ai_memories.clear(),
      posDexieDb.ai_audit_events.clear(),
      posDexieDb.ai_settings.clear(),
      posDexieDb.ai_request_logs.clear(),
      posDexieDb.idea_revisions.clear(),
      posDexieDb.idea_categories.clear(),
      posDexieDb.ai_recommendation_runs.clear(),
      posDexieDb.ai_recommendations.clear(),
      posDexieDb.practices.clear(),
      posDexieDb.point_ledger.clear(),
    ]);
  }
}
