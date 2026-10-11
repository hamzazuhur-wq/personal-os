import { AIActionProposalPayload } from '../../../types/ai.types';
import { AIToolResult, IToolExecutionContext } from '../../../types/aiTool.types';
import { WriteToolExecutors } from '../tools/writeTools';
import { IdeaToolExecutors } from '../tools/ideaTools';
import { getToolDefinition } from '../tools/toolRegistry';
import { getIdeaToolDefinition } from '../tools/ideaTools';

/** Module 10: tools reserved for the scoped Idea Capture agent. */
const IDEA_WRITE_TOOLS = new Set([
  'updateIdeaTitle',
  'appendToIdea',
  'insertIntoIdea',
  'replaceIdeaSection',
  'removeIdeaSection',
  'reorderIdeaSection',
  'renameIdeaSection',
  'createIdeaSection',
  'rewriteIdeaContent',
]);

export class ActionPolicy {
  /**
   * Evaluates if a proposed tool execution requires explicit user confirmation.
   */
  static isConfirmationRequired(toolName: string): boolean {
    const def = getToolDefinition(toolName);
    if (def) return def.confirmationRequired;
    const ideaDef = getIdeaToolDefinition(toolName);
    if (ideaDef) return ideaDef.confirmationRequired;
    return true;
  }

  /**
   * Validates parameters against security guardrails.
   */
  static validateActionParameters(toolName: string, params: Record<string, any>): { valid: boolean; error?: string } {
    if (!params || typeof params !== 'object') {
      return { valid: false, error: 'Parameters must be a valid object' };
    }

    // Guardrail: Permanent deletion forbidden
    if (toolName.toLowerCase().includes('delete') && !toolName.includes('Memory')) {
      return { valid: false, error: 'Permanent deletion is prohibited. Use archival instead.' };
    }

    // Specific tool parameter rules
    if (toolName === 'createGoal' && (!params.title || !params.title.trim())) {
      return { valid: false, error: 'Goal title is required.' };
    }
    if (toolName === 'updateGoal' && (!params.id || !params.id.trim())) {
      return { valid: false, error: 'Goal ID is required.' };
    }
    if (toolName === 'createProject' && (!params.title || !params.title.trim())) {
      return { valid: false, error: 'Project title is required.' };
    }
    if (toolName === 'createSkill' && (!params.name || !params.name.trim())) {
      return { valid: false, error: 'Skill name is required.' };
    }
    if (toolName === 'updateSkillProficiency' && (!params.id || !params.newProficiency || !params.reason)) {
      return { valid: false, error: 'Skill ID, new proficiency, and reason are mandatory.' };
    }
    if (toolName === 'saveMemory' && (!params.content || !params.content.trim())) {
      return { valid: false, error: 'Memory content cannot be empty.' };
    }
    // Module 10: Idea edit guardrails — session scope + required fields.
    if (IDEA_WRITE_TOOLS.has(toolName)) {
      if (!params.idea_id) return { valid: false, error: 'idea_id is required.' };
      if (['appendToIdea', 'insertIntoIdea', 'replaceIdeaSection', 'rewriteIdeaContent'].includes(toolName) && (!params.content || !String(params.content).trim())) {
        return { valid: false, error: 'content is required.' };
      }
      if (['replaceIdeaSection', 'removeIdeaSection', 'reorderIdeaSection', 'renameIdeaSection'].includes(toolName) && (!params.target || !String(params.target).trim())) {
        return { valid: false, error: 'target is required.' };
      }
      if (toolName === 'updateIdeaTitle' && (!params.title || !String(params.title).trim())) {
        return { valid: false, error: 'title is required.' };
      }
      if (toolName === 'renameIdeaSection' && (!params.new_title || !String(params.new_title).trim())) {
        return { valid: false, error: 'new_title is required.' };
      }
      if (toolName === 'createIdeaSection' && (!params.title || !String(params.title).trim())) {
        return { valid: false, error: 'title is required for the new section.' };
      }
    }

    return { valid: true };
  }

  /**
   * Executes an approved action proposal through the typed WriteToolExecutors.
   */
  static async executeApprovedAction(
    proposal: AIActionProposalPayload,
    ctx: IToolExecutionContext
  ): Promise<AIToolResult> {
    const settings = await ctx.repositories.aiRepo.getSettings().catch(() => null);
    if (settings && settings.action_policy === 'read_only') {
      return {
        success: false,
        error: {
          code: 'READ_ONLY_MODE',
          message: 'System is currently configured in Read-Only Action Policy. Write operations are blocked.',
        },
      };
    }

    const validation = this.validateActionParameters(proposal.tool_name, proposal.parameters);
    if (!validation.valid) {
      return { success: false, error: { code: 'GUARDRAIL_VIOLATION', message: validation.error! } };
    }

    switch (proposal.tool_name) {
      case 'createGoal':
        return WriteToolExecutors.createGoal(proposal.parameters, ctx);
      case 'updateGoal':
        return WriteToolExecutors.updateGoal(proposal.parameters, ctx);
      case 'archiveGoal':
        return WriteToolExecutors.archiveGoal(proposal.parameters, ctx);
      case 'createProject':
        return WriteToolExecutors.createProject(proposal.parameters, ctx);
      case 'archiveProject':
        return WriteToolExecutors.archiveProject(proposal.parameters, ctx);
      case 'createSkill':
        return WriteToolExecutors.createSkill(proposal.parameters, ctx);
      case 'updateSkillProficiency':
        return WriteToolExecutors.updateSkillProficiency(proposal.parameters, ctx);
      case 'createTask':
        return WriteToolExecutors.createTask(proposal.parameters, ctx);
      case 'saveMemory':
        return WriteToolExecutors.saveMemory(proposal.parameters, ctx);
      case 'archiveMemory':
        return WriteToolExecutors.archiveMemory(proposal.parameters, ctx);
      // Module 10 — scoped Idea edits. IdeaToolExecutors re-verifies
      // params.idea_id === ctx.ideaId (IDEA_ID_MISMATCH otherwise) and the
      // executor context only exposes capture/revision/ai repositories.
      case 'updateIdeaTitle':
        return IdeaToolExecutors.updateIdeaTitle(proposal.parameters, ctx);
      case 'appendToIdea':
        return IdeaToolExecutors.appendToIdea(proposal.parameters, ctx);
      case 'insertIntoIdea':
        return IdeaToolExecutors.insertIntoIdea(proposal.parameters, ctx);
      case 'replaceIdeaSection':
        return IdeaToolExecutors.replaceIdeaSection(proposal.parameters, ctx);
      case 'removeIdeaSection':
        return IdeaToolExecutors.removeIdeaSection(proposal.parameters, ctx);
      case 'reorderIdeaSection':
        return IdeaToolExecutors.reorderIdeaSection(proposal.parameters, ctx);
      case 'renameIdeaSection':
        return IdeaToolExecutors.renameIdeaSection(proposal.parameters, ctx);
      case 'createIdeaSection':
        return IdeaToolExecutors.createIdeaSection(proposal.parameters, ctx);
      case 'rewriteIdeaContent':
        return IdeaToolExecutors.rewriteIdeaContent(proposal.parameters, ctx);
      default:
        return { success: false, error: { code: 'UNKNOWN_TOOL', message: `Unknown write tool: ${proposal.tool_name}` } };
    }
  }
}
