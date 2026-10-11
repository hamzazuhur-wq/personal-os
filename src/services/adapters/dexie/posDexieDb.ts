import Dexie, { type Table } from 'dexie';
import { Capture } from '../../../types/capture.types';
import { Activity } from '../../../types/activity.types';
import { Task } from '../../../types/task.types';
import { WeeklyFocus } from '../../../types/weekly.types';
import { UserSettings } from '../../../types/settings.types';
import { AreaVision, CurrentState, LifeArea, Vision, VisionItem } from '../../../types/vision.types';
import { Goal } from '../../../types/goal.types';
import {
  Level,
  LevelRequirement,
  LevelSkill,
  LevelMilestone,
  RequirementEvidence,
  LevelHistory,
  ProgressionException,
} from '../../../types/level.types';
import { Project } from '../../../types/project.types';
import {
  Skill,
  SkillHistory,
  SkillEvidence,
  SkillGoalRelation,
  SkillProjectRelation,
  SkillLevelRelation,
} from '../../../types/skill.types';
import {
  AIConversation,
  AIConversationGroup,
  AIMessage,
  AIMemory,
  AIAuditEvent,
  AISettings,
  AIRequestLog,
} from '../../../types/ai.types';
import { AIProviderConnection, ProviderCapabilities } from '../../../types/aiProvider.types';
import { Practice, PointLedgerEvent } from '../../../types/practice.types';
import { IdeaRevision } from '../../../types/capture.types';
import { IdeaCategory } from '../../../types/ideaCategory.types';
import {
  AIRecommendation,
  AIRecommendationRun,
} from '../../../types/recommendation.types';

export class AuraDexieDB extends Dexie {
  captures!: Table<Capture, string>;
  activities!: Table<Activity, string>;
  tasks!: Table<Task, string>;
  weekly_focus!: Table<WeeklyFocus, string>;
  settings!: Table<UserSettings, string>;
  visions!: Table<Vision, string>;
  life_areas!: Table<LifeArea, string>;
  area_visions!: Table<AreaVision, string>;
  current_states!: Table<CurrentState, string>;
  vision_items!: Table<VisionItem, string>;
  goals!: Table<Goal, string>;
  levels!: Table<Level, string>;
  level_requirements!: Table<LevelRequirement, string>;
  level_skills!: Table<LevelSkill, string>;
  level_milestones!: Table<LevelMilestone, string>;
  requirement_evidence!: Table<RequirementEvidence, string>;
  level_history!: Table<LevelHistory, string>;
  progression_exceptions!: Table<ProgressionException, string>;
  projects!: Table<Project, string>;
  skills!: Table<Skill, string>;
  skill_history!: Table<SkillHistory, string>;
  skill_evidence!: Table<SkillEvidence, string>;
  skill_goal_relations!: Table<SkillGoalRelation, string>;
  skill_project_relations!: Table<SkillProjectRelation, string>;
  skill_level_relations!: Table<SkillLevelRelation, string>;
  ai_conversations!: Table<AIConversation, string>;
  ai_conversation_groups!: Table<AIConversationGroup, string>;
  ai_messages!: Table<AIMessage, string>;
  ai_memories!: Table<AIMemory, string>;
  ai_audit_events!: Table<AIAuditEvent, string>;
  ai_settings!: Table<AISettings, string>;
  ai_request_logs!: Table<AIRequestLog, string>;
  ai_provider_connections!: Table<AIProviderConnection, string>;
  practices!: Table<Practice, string>;
  point_ledger!: Table<PointLedgerEvent, string>;
  idea_revisions!: Table<IdeaRevision, string>;
  idea_categories!: Table<IdeaCategory, string>;
  ai_recommendation_runs!: Table<AIRecommendationRun, string>;
  ai_recommendations!: Table<AIRecommendation, string>;

  constructor() {
    super('PersonalOperatingSystemDB');

    // Define table schemas and indexes for fast queries
    this.version(1).stores({
      captures: 'id, user_id, capture_type, status, created_at, source',
      activities: 'id, date, status, category, created_at, [date+status]',
      tasks: 'id, status, priority, due_date, created_at, completed_at, related_week',
      weekly_focus: 'id, week_id, start_date, end_date',
      settings: 'id',
    });

    // Version 2 extends the local-first schema without altering existing tables.
    this.version(2).stores({
      visions: 'id, user_id, updated_at',
      life_areas: 'id, status, created_at',
      area_visions: 'id, life_area_id, updated_at',
      current_states: 'id, life_area_id, updated_at',
      vision_items: 'id, life_area_id, kind, status, created_at',
    });

    this.version(3).stores({
      life_areas: 'id, status, sort_order, created_at',
    }).upgrade(async (transaction) => {
      const areas = await transaction.table('life_areas').orderBy('created_at').toArray();
      await Promise.all(areas.map((area, index) => transaction.table('life_areas').update(area.id, { sort_order: index })));
    });

    // Version 4 adds Goals and Objectives schema
    this.version(4).stores({
      goals: 'id, user_id, status, goal_type, life_area_id, vision_id, parent_goal_id, time_horizon, priority, start_date, target_date, created_at, completed_at, archived_at, [status+time_horizon], [status+life_area_id]',
    });

    // Version 5 adds Development Levels schema (additive — no data loss to existing tables)
    this.version(5).stores({
      levels: 'id, user_id, life_area_id, status, display_order, created_at, completed_at, archived_at, [life_area_id+status], [life_area_id+display_order]',
      level_requirements: 'id, level_id, type, status, is_required, goal_id, created_at, completed_at, [level_id+status], [level_id+is_required]',
      level_skills: 'id, level_id, status, created_at',
      level_milestones: 'id, level_id, status, goal_id, created_at, completed_at',
      requirement_evidence: 'id, requirement_id, type, created_at',
      level_history: 'id, life_area_id, to_level_id, completed_at, created_at',
      progression_exceptions: 'id, life_area_id, level_id, type, created_at',
    });

    // Version 6 adds Active Projects schema & project relationship hooks
    this.version(6).stores({
      projects: 'id, user_id, status, priority, life_area_id, primary_goal_id, level_id, start_date, target_date, created_at, completed_at, archived_at, [status+priority], [status+life_area_id], [status+primary_goal_id]',
      tasks: 'id, status, priority, due_date, created_at, completed_at, related_week, related_project_id',
      activities: 'id, date, status, category, created_at, related_project_id, [date+status]',
    });

    // Version 7 adds Skill Matrix schema and junction tables
    this.version(7).stores({
      skills: 'id, user_id, status, life_area_id, current_proficiency, development_state, created_at, archived_at, [status+life_area_id], [status+development_state]',
      skill_history: 'id, skill_id, changed_at, created_at',
      skill_evidence: 'id, skill_id, type, created_at',
      skill_goal_relations: 'id, skill_id, goal_id, [skill_id+goal_id]',
      skill_project_relations: 'id, skill_id, project_id, [skill_id+project_id]',
      skill_level_relations: 'id, skill_id, level_id, [skill_id+level_id]',
      level_requirements: 'id, level_id, type, status, is_required, goal_id, skill_id, created_at, completed_at, [level_id+status], [level_id+is_required]',
    });

    // Version 8 adds AI Intelligence schema
    this.version(8).stores({
      ai_conversations: 'id, user_id, status, created_at, updated_at',
      ai_messages: 'id, conversation_id, role, type, created_at, [conversation_id+created_at]',
      ai_memories: 'id, user_id, type, status, created_at, [status+type]',
      ai_audit_events: 'id, conversation_id, timestamp, tool_name, result_status',
    });

    // Version 9 adds Module 06.1 AI Groups, AI Settings, and updated Conversation indices
    this.version(9).stores({
      ai_conversations: 'id, user_id, status, category, group_id, pinned, created_at, updated_at, [status+pinned], [status+category]',
      ai_conversation_groups: 'id, user_id, status, sort_order, created_at',
      ai_settings: 'id, user_id, provider, routing_profile, updated_at',
    });

    // Version 10 adds AI Request & Token Usage logs for real usage tracking
    this.version(10).stores({
      ai_request_logs: 'id, conversation_id, timestamp, provider, model, status, fallback_used',
    });

    // Version 11 adds Module 07 Execution System indices & relationships
    this.version(11).stores({
      tasks: 'id, status, priority, due_date, created_at, completed_at, related_week, related_project_id, related_goal_id, related_level_id, is_next_action, context, daily_priority_order, [status+is_next_action], [status+priority]',
      activities: 'id, date, status, category, created_at, related_project_id, related_task_id, [date+status]',
    });

    // Version 12 adds Module 08 Development Practices & Points Ledger
    this.version(12).stores({
      practices: 'id, user_id, status, life_area_id, skill_id, goal_id, project_id, created_at, archived_at, [status+life_area_id], [status+skill_id]',
      point_ledger: 'id, user_id, practice_id, source_type, source_id, life_area_id, skill_id, goal_id, project_id, task_id, activity_id, status, occurred_at, created_at, [source_type+source_id], [status+occurred_at], [life_area_id+status], [skill_id+status]',
      level_requirements: 'id, level_id, type, status, is_required, goal_id, skill_id, created_at, completed_at, [level_id+status], [level_id+is_required]',
    });

    // Version 13 fixes Module 08 Final: sumValidPoints queries compound
    // entity+status indexes that v12 never declared — those queries threw
    // SchemaError at runtime (totals silently rendered as 0).
    this.version(13).stores({
      point_ledger: 'id, user_id, practice_id, source_type, source_id, life_area_id, skill_id, goal_id, project_id, task_id, activity_id, status, occurred_at, created_at, [source_type+source_id], [status+occurred_at], [life_area_id+status], [skill_id+status], [practice_id+status], [goal_id+status], [project_id+status], [task_id+status], [activity_id+status]',
    });

    // Version 14 adds Module 10 Idea Capture:
    // - idea_revisions: full before-state snapshots for undo/history.
    // - ai_conversations.idea_id: scopes one AI conversation per Idea using
    //   the EXISTING message storage (no duplicate tables).
    // Purely additive — existing capture rows and capture_type values are
    // never rewritten or mass-converted by this migration.
    this.version(14).stores({
      idea_revisions: 'id, capture_id, editor, operation, created_at, [capture_id+created_at]',
      ai_conversations: 'id, user_id, status, category, group_id, pinned, idea_id, created_at, updated_at, [status+pinned], [status+category], [idea_id+updated_at]',
    });

    this.version(15).stores({
      idea_categories: 'id, name, status, sort_order, created_at',
    });

    // Version 16 adds Provider Connections for multi-provider AI settings
    this.version(16).stores({
      ai_provider_connections: 'id, user_id, provider_type, enabled, connection_status, created_at, updated_at, [user_id+enabled]',
    }).upgrade(async (transaction) => {
      // Backfill: create a default provider connection from existing ai_settings
      const settings = await transaction.table('ai_settings').toArray();
      for (const s of settings) {
        const existing = await transaction.table('ai_provider_connections')
          .where('user_id')
          .equals(s.user_id)
          .toArray();
        if (existing.length === 0 && s.provider) {
          const connectionId = `conn-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
          const defaultCapabilities: ProviderCapabilities = {
            modelDiscovery: true,
            requiresApiKey: true,
            supportsStreaming: true,
            supportsTools: true,
            supportsStructuredOutput: true,
            supportsLocalNoKey: false,
            defaultBaseUrl: s.endpoint || 'https://openrouter.ai/api/v1',
            authMethod: 'bearer',
            discoveryEndpoint: '/models',
            chatEndpoint: '/chat/completions',
          };
          await transaction.table('ai_provider_connections').add({
            id: connectionId,
            user_id: s.user_id,
            name: `${s.provider === 'openrouter' ? 'OpenRouter' : 'Development Mock'} — Main`,
            provider_type: s.provider as any,
            base_url: s.endpoint || 'https://openrouter.ai/api/v1',
            api_key: '',
            api_key_last_four: '',
            enabled: s.provider === 'openrouter',
            capabilities: defaultCapabilities,
            connection_status: 'not_tested',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          // Update settings to point to the new connection
          await transaction.table('ai_settings').update(s.id, {
            active_connection_id: connectionId,
          });
        }
      }
    });

    // Version 17 adds Module 11 Proactive AI Intelligence.
    //
    // ai_recommendation_runs: one record per eligible daily evaluation.
    //   [status+completed_at] drives the 24h cooldown query.
    //
    // ai_recommendations: persisted proposals (never mutations).
    //   [status+created_at] — active feed for homepage widget.
    //   [target_type+target_id] — contextual lookup per entity.
    //   [fingerprint+status] — deduplication lookup.
    //
    // Purely additive — all prior tables untouched.
    this.version(17).stores({
      ai_recommendation_runs: 'id, status, completed_at, [status+completed_at]',
      ai_recommendations: 'id, type, status, fingerprint, target_type, target_id, created_at, expires_at, [status+created_at], [target_type+target_id], [fingerprint+status]',
    });
  }
}

export const auraDexieDb = new AuraDexieDB();
export const posDexieDb = auraDexieDb;
