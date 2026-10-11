import { AIToolResult, IToolExecutionContext } from '../../../types/aiTool.types';

export class WriteToolExecutors {
  static async createGoal(params: any, ctx: IToolExecutionContext): Promise<AIToolResult> {
    try {
      const created = await ctx.repositories.goalRepo.createGoal({
        title: params.title,
        goal_type: params.goal_type || 'outcome',
        time_horizon: params.time_horizon || 'annual',
        priority: params.priority || 'medium',
        life_area_id: params.life_area_id,
        status: 'active',
      });

      await ctx.repositories.aiRepo.logAuditEvent({
        conversation_id: ctx.conversationId,
        tool_name: 'createGoal',
        action_type: 'write',
        target_type: 'Goal',
        target_id: created.id,
        parameters_summary: `Created Goal "${created.title}"`,
        confirmation_required: true,
        confirmation_status: 'confirmed',
        result_status: 'success',
      });

      return { success: true, data: created };
    } catch (err: any) {
      await ctx.repositories.aiRepo.logAuditEvent({
        conversation_id: ctx.conversationId,
        tool_name: 'createGoal',
        action_type: 'write',
        target_type: 'Goal',
        parameters_summary: `Failed to create Goal "${params?.title}"`,
        confirmation_required: true,
        confirmation_status: 'confirmed',
        result_status: 'failure',
        error_code: 'GOAL_CREATE_FAILED',
      });
      return { success: false, error: { code: 'GOAL_CREATE_FAILED', message: err.message } };
    }
  }

  static async updateGoal(params: any, ctx: IToolExecutionContext): Promise<AIToolResult> {
    try {
      const updated = await ctx.repositories.goalRepo.updateGoal(params.id, params);
      await ctx.repositories.aiRepo.logAuditEvent({
        conversation_id: ctx.conversationId,
        tool_name: 'updateGoal',
        action_type: 'write',
        target_type: 'Goal',
        target_id: params.id,
        parameters_summary: `Updated Goal ${params.id}`,
        confirmation_required: true,
        confirmation_status: 'confirmed',
        result_status: 'success',
      });
      return { success: true, data: updated };
    } catch (err: any) {
      return { success: false, error: { code: 'GOAL_UPDATE_FAILED', message: err.message } };
    }
  }

  static async archiveGoal(params: any, ctx: IToolExecutionContext): Promise<AIToolResult> {
    try {
      const archived = await ctx.repositories.goalRepo.archiveGoal(params.id);
      await ctx.repositories.aiRepo.logAuditEvent({
        conversation_id: ctx.conversationId,
        tool_name: 'archiveGoal',
        action_type: 'archive',
        target_type: 'Goal',
        target_id: params.id,
        parameters_summary: `Archived Goal ${params.id}`,
        confirmation_required: true,
        confirmation_status: 'confirmed',
        result_status: 'success',
      });
      return { success: true, data: archived };
    } catch (err: any) {
      return { success: false, error: { code: 'GOAL_ARCHIVE_FAILED', message: err.message } };
    }
  }

  static async createProject(params: any, ctx: IToolExecutionContext): Promise<AIToolResult> {
    try {
      const created = await ctx.repositories.projectRepo.createProject({
        title: params.title,
        desired_outcome: params.desired_outcome || 'Completed Project',
        priority: params.priority || 'medium',
        life_area_id: params.life_area_id,
        primary_goal_id: params.primary_goal_id,
        status: 'active',
      });

      await ctx.repositories.aiRepo.logAuditEvent({
        conversation_id: ctx.conversationId,
        tool_name: 'createProject',
        action_type: 'write',
        target_type: 'Project',
        target_id: created.id,
        parameters_summary: `Created Project "${created.title}"`,
        confirmation_required: true,
        confirmation_status: 'confirmed',
        result_status: 'success',
      });

      return { success: true, data: created };
    } catch (err: any) {
      return { success: false, error: { code: 'PROJECT_CREATE_FAILED', message: err.message } };
    }
  }

  static async archiveProject(params: any, ctx: IToolExecutionContext): Promise<AIToolResult> {
    try {
      const archived = await ctx.repositories.projectRepo.archiveProject(params.id);
      await ctx.repositories.aiRepo.logAuditEvent({
        conversation_id: ctx.conversationId,
        tool_name: 'archiveProject',
        action_type: 'archive',
        target_type: 'Project',
        target_id: params.id,
        parameters_summary: `Archived Project ${params.id}`,
        confirmation_required: true,
        confirmation_status: 'confirmed',
        result_status: 'success',
      });
      return { success: true, data: archived };
    } catch (err: any) {
      return { success: false, error: { code: 'PROJECT_ARCHIVE_FAILED', message: err.message } };
    }
  }

  static async createSkill(params: any, ctx: IToolExecutionContext): Promise<AIToolResult> {
    try {
      const created = await ctx.repositories.skillRepo.createSkill({
        name: params.name,
        current_proficiency: params.current_proficiency || 'foundation',
        target_proficiency: params.target_proficiency || 'competent',
        development_state: params.development_state || 'not_started',
        life_area_id: params.life_area_id,
        status: 'active',
      });

      await ctx.repositories.aiRepo.logAuditEvent({
        conversation_id: ctx.conversationId,
        tool_name: 'createSkill',
        action_type: 'write',
        target_type: 'Skill',
        target_id: created.id,
        parameters_summary: `Created Skill "${created.name}"`,
        confirmation_required: true,
        confirmation_status: 'confirmed',
        result_status: 'success',
      });

      return { success: true, data: created };
    } catch (err: any) {
      return { success: false, error: { code: 'SKILL_CREATE_FAILED', message: err.message } };
    }
  }

  static async updateSkillProficiency(params: any, ctx: IToolExecutionContext): Promise<AIToolResult> {
    try {
      const updated = await ctx.repositories.skillRepo.updateSkillProficiency(
        params.id,
        params.newProficiency,
        params.reason || 'AI-assisted update',
        params.note
      );

      await ctx.repositories.aiRepo.logAuditEvent({
        conversation_id: ctx.conversationId,
        tool_name: 'updateSkillProficiency',
        action_type: 'write',
        target_type: 'Skill',
        target_id: params.id,
        parameters_summary: `Updated skill ${params.id} to ${params.newProficiency}`,
        confirmation_required: true,
        confirmation_status: 'confirmed',
        result_status: 'success',
      });

      return { success: true, data: updated };
    } catch (err: any) {
      return { success: false, error: { code: 'SKILL_PROFICIENCY_UPDATE_FAILED', message: err.message } };
    }
  }

  static async createTask(params: any, ctx: IToolExecutionContext): Promise<AIToolResult> {
    try {
      const created = await ctx.repositories.taskRepo.create({
        title: params.title,
        priority: params.priority || 'medium',
        due_date: params.due_date,
        status: 'todo',
      });

      await ctx.repositories.aiRepo.logAuditEvent({
        conversation_id: ctx.conversationId,
        tool_name: 'createTask',
        action_type: 'write',
        target_type: 'Task',
        target_id: created.id,
        parameters_summary: `Created Task "${created.title}"`,
        confirmation_required: true,
        confirmation_status: 'confirmed',
        result_status: 'success',
      });

      return { success: true, data: created };
    } catch (err: any) {
      return { success: false, error: { code: 'TASK_CREATE_FAILED', message: err.message } };
    }
  }

  static async saveMemory(params: any, ctx: IToolExecutionContext): Promise<AIToolResult> {
    try {
      const saved = await ctx.repositories.aiRepo.saveMemory({
        content: params.content,
        type: params.type || 'preference',
        source: params.source || 'explicit_user',
        confidence: params.confidence ?? 1.0,
        status: 'active',
      });

      await ctx.repositories.aiRepo.logAuditEvent({
        conversation_id: ctx.conversationId,
        tool_name: 'saveMemory',
        action_type: 'memory',
        target_type: 'AIMemory',
        target_id: saved.id,
        parameters_summary: `Saved preference: "${saved.content}"`,
        confirmation_required: true,
        confirmation_status: 'confirmed',
        result_status: 'success',
      });

      return { success: true, data: saved };
    } catch (err: any) {
      return { success: false, error: { code: 'MEMORY_SAVE_FAILED', message: err.message } };
    }
  }

  static async archiveMemory(params: any, ctx: IToolExecutionContext): Promise<AIToolResult> {
    try {
      const archived = await ctx.repositories.aiRepo.archiveMemory(params.id);
      await ctx.repositories.aiRepo.logAuditEvent({
        conversation_id: ctx.conversationId,
        tool_name: 'archiveMemory',
        action_type: 'memory',
        target_type: 'AIMemory',
        target_id: params.id,
        parameters_summary: `Archived memory ${params.id}`,
        confirmation_required: true,
        confirmation_status: 'confirmed',
        result_status: 'success',
      });
      return { success: true, data: archived };
    } catch (err: any) {
      return { success: false, error: { code: 'MEMORY_ARCHIVE_FAILED', message: err.message } };
    }
  }
}
