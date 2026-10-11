// ============================================================
// MODULE 10 — SCOPED IDEA AGENT TOOLS
// ============================================================
// The Idea Capture agent operates ONLY on the currently opened Idea.
//
// Hard boundaries enforced here (not by prompts):
// - These definitions are NEVER merged into the global AI_TOOL_DEFINITIONS.
// - Executors receive only capture/revision/ai repositories — the agent has
//   no path to Goals/Tasks/Projects/Skills/Levels/Activities/Life Areas.
// - Every execution verifies params.idea_id === ctx.ideaId (session-fixed).
//   Mismatch → IDEA_ID_MISMATCH, zero mutation. Model-supplied ids are
//   never trusted.
// - Structured edits run through utils/ideaContent.ts — the application
//   applies mutations; the model only proposes them.
// ============================================================

import { AIToolDefinition, AIToolResult, IToolExecutionContext } from '../../../types/aiTool.types';
import { Capture } from '../../../types/capture.types';
import {
  applyAppend,
  applyCreateSection,
  applyInsert,
  applyRemove,
  applyRename,
  applyReplace,
  applyReorder,
  applyFullRewrite,
  getIdeaOutline,
} from '../../../utils/ideaContent';

export const MAX_IDEA_CONTENT_LENGTH = 100_000;

export const IDEA_TOOL_DEFINITIONS: AIToolDefinition[] = [
  // ─── Read Tools (scoped to current idea) ──────────────────
  {
    name: 'getCurrentIdea',
    description:
      'Returns the FULL current Idea: title, category, content and metadata. Always read the idea before proposing edits.',
    classification: 'read',
    domain: 'ideas',
    confirmationRequired: false,
    parameters: [],
  },
  {
    name: 'getIdeaConversation',
    description: 'Returns the recent messages of this Idea-scoped conversation.',
    classification: 'read',
    domain: 'ideas',
    confirmationRequired: false,
    parameters: [
      { name: 'limit', type: 'number', description: 'Max messages to return (default 20)', required: false },
    ],
  },
  {
    name: 'getIdeaAttachments',
    description: "Returns the current Idea's attachment/link metadata (no binary content).",
    classification: 'read',
    domain: 'ideas',
    confirmationRequired: false,
    parameters: [],
  },
  {
    name: 'getIdeaCategory',
    description: "Returns the current Idea's category plus a compact structural outline.",
    classification: 'read',
    domain: 'ideas',
    confirmationRequired: false,
    parameters: [],
  },

  // ─── Write Tools (structured edit operations) ─────────────
  {
    name: 'updateIdeaTitle',
    description: 'Updates ONLY the title of the current Idea. Content is untouched.',
    classification: 'write',
    domain: 'ideas',
    confirmationRequired: true,
    parameters: [
      { name: 'idea_id', type: 'string', description: 'Must equal the current Idea id', required: true },
      { name: 'title', type: 'string', description: 'New title', required: true },
    ],
  },
  {
    name: 'appendToIdea',
    description:
      'Appends new text at the end of the Idea, or at the end of a named section if `section` is provided. Nothing existing is modified.',
    classification: 'write',
    domain: 'ideas',
    confirmationRequired: true,
    parameters: [
      { name: 'idea_id', type: 'string', description: 'Must equal the current Idea id', required: true },
      { name: 'content', type: 'string', description: 'Text to append', required: true },
      { name: 'section', type: 'string', description: 'Optional section title to append inside', required: false },
    ],
  },
  {
    name: 'insertIntoIdea',
    description: 'Inserts new text before or after an existing target section/block.',
    classification: 'write',
    domain: 'ideas',
    confirmationRequired: true,
    parameters: [
      { name: 'idea_id', type: 'string', description: 'Must equal the current Idea id', required: true },
      { name: 'content', type: 'string', description: 'Text to insert', required: true },
      { name: 'anchor', type: 'string', description: 'Target section/block to anchor against', required: false },
      { name: 'position', type: 'string', description: 'before|after|start|end (default after anchor / end)', required: false },
    ],
  },
  {
    name: 'replaceIdeaSection',
    description:
      "Replaces one identified section's BODY (its heading is preserved) or a single block. Never rewrites unrelated content.",
    classification: 'write',
    domain: 'ideas',
    confirmationRequired: true,
    parameters: [
      { name: 'idea_id', type: 'string', description: 'Must equal the current Idea id', required: true },
      { name: 'target', type: 'string', description: 'Section title or exact text fragment identifying the block', required: true },
      { name: 'content', type: 'string', description: 'Replacement text', required: true },
    ],
  },
  {
    name: 'removeIdeaSection',
    description: 'Removes one identified section (including its heading) or block. Destructive — target must be unambiguous.',
    classification: 'write',
    domain: 'ideas',
    confirmationRequired: true,
    parameters: [
      { name: 'idea_id', type: 'string', description: 'Must equal the current Idea id', required: true },
      { name: 'target', type: 'string', description: 'Section title or exact text fragment identifying the block', required: true },
    ],
  },
  {
    name: 'reorderIdeaSection',
    description: 'Moves an identified section/block before or after another anchor section/block.',
    classification: 'write',
    domain: 'ideas',
    confirmationRequired: true,
    parameters: [
      { name: 'idea_id', type: 'string', description: 'Must equal the current Idea id', required: true },
      { name: 'target', type: 'string', description: 'Section/block to move', required: true },
      { name: 'anchor', type: 'string', description: 'Reference section/block', required: true },
      { name: 'position', type: 'string', description: 'before|after', required: true },
    ],
  },
  {
    name: 'renameIdeaSection',
    description: 'Renames an existing heading. Refuses to convert prose into headings.',
    classification: 'write',
    domain: 'ideas',
    confirmationRequired: true,
    parameters: [
      { name: 'idea_id', type: 'string', description: 'Must equal the current Idea id', required: true },
      { name: 'target', type: 'string', description: 'Heading to rename', required: true },
      { name: 'new_title', type: 'string', description: 'New heading text', required: true },
    ],
  },
  {
    name: 'createIdeaSection',
    description: 'Creates a new heading (with optional body), optionally positioned relative to an anchor.',
    classification: 'write',
    domain: 'ideas',
    confirmationRequired: true,
    parameters: [
      { name: 'idea_id', type: 'string', description: 'Must equal the current Idea id', required: true },
      { name: 'title', type: 'string', description: 'New section heading', required: true },
      { name: 'content', type: 'string', description: 'Body text of the new section', required: false },
      { name: 'anchor', type: 'string', description: 'Position relative to this target', required: false },
      { name: 'position', type: 'string', description: 'before|after|start|end', required: false },
    ],
  },
  {
    name: 'rewriteIdeaContent',
    description:
      'Full-content rewrite of the current Idea. Use ONLY when the user explicitly asks to rewrite/restructure the whole idea.',
    classification: 'write',
    domain: 'ideas',
    confirmationRequired: true,
    parameters: [
      { name: 'idea_id', type: 'string', description: 'Must equal the current Idea id', required: true },
      { name: 'content', type: 'string', description: 'Complete replacement body', required: true },
    ],
  },
];

export function getIdeaToolDefinition(name: string): AIToolDefinition | undefined {
  return IDEA_TOOL_DEFINITIONS.find((t) => t.name === name);
}

// ─── Executors ───────────────────────────────────────────────

function scopeFail(tool: string): AIToolResult {
  return {
    success: false,
    error: {
      code: 'IDEA_ID_MISMATCH',
      message: `${tool}: the supplied idea_id does not match the Idea open in this session. No mutation was made.`,
    },
  };
}

async function loadCurrentIdea(ctx: IToolExecutionContext): Promise<{ ok: true; idea: Capture } | { ok: false; result: AIToolResult }> {
  if (!ctx.ideaId) {
    return { ok: false, result: { success: false, error: { code: 'NO_IDEA_IN_CONTEXT', message: 'No Idea is open in this session.' } } };
  }
  const idea = await ctx.repositories.captureRepo.getById(ctx.ideaId);
  if (!idea || idea.status === 'archived') {
    return { ok: false, result: { success: false, error: { code: 'IDEA_NOT_FOUND', message: 'The current Idea could not be found.' } } };
  }
  return { ok: true, idea };
}

function checkScope(params: any, ctx: IToolExecutionContext, tool: string): AIToolResult | null {
  if (!ctx.ideaId) {
    return { success: false, error: { code: 'NO_IDEA_IN_CONTEXT', message: `${tool}: no Idea is open in this session.` } };
  }
  if (!params || typeof params !== 'object' || String(params.idea_id ?? '') !== String(ctx.ideaId)) {
    return scopeFail(tool);
  }
  return null;
}

function checkContent(params: any, field = 'content'): AIToolResult | null {
  const value = params?.[field];
  if (typeof value !== 'string' || !value.trim()) {
    return { success: false, error: { code: 'VALIDATION_FAILED', message: `${field} is required and must be non-empty.` } };
  }
  if (value.length > MAX_IDEA_CONTENT_LENGTH) {
    return { success: false, error: { code: 'CONTENT_TOO_LARGE', message: `Content exceeds the ${MAX_IDEA_CONTENT_LENGTH}-character limit.` } };
  }
  return null;
}

/** Snapshot before-state, then persist the mutation. Revision write happens FIRST. */
async function commitIdeaEdit(
  ctx: IToolExecutionContext,
  idea: Capture,
  opts: {
    tool: string;
    operation: 'ai_title' | 'ai_append' | 'ai_insert' | 'ai_replace' | 'ai_remove' | 'ai_reorder' | 'ai_rename' | 'ai_rewrite';
    reason?: string;
    nextContent?: string;
    nextTitle?: string;
  }
): Promise<AIToolResult> {
  const revisionRepo = ctx.repositories.ideaRevisionRepo;
  await revisionRepo.create({
    capture_id: idea.id,
    editor: 'ai',
    operation: opts.operation,
    reason: opts.reason,
    before_title: idea.title,
    before_content: idea.content,
  });

  const updated = await ctx.repositories.captureRepo.update(idea.id, {
    ...(opts.nextContent !== undefined ? { content: opts.nextContent } : {}),
    ...(opts.nextTitle !== undefined ? { title: opts.nextTitle } : {}),
  });

  await ctx.repositories.aiRepo.logAuditEvent({
    conversation_id: ctx.conversationId,
    tool_name: opts.tool,
    action_type: 'write',
    target_type: 'idea',
    target_id: idea.id,
    parameters_summary: opts.reason ?? opts.operation,
    confirmation_required: true,
    confirmation_status: 'confirmed',
    result_status: 'success',
  }).catch(() => undefined);

  return {
    success: true,
    data: {
      idea: updated,
      message: `Applied ${opts.tool}.`,
    },
  };
}

function engineError(detail?: string, code?: string): AIToolResult {
  const map: Record<string, { code: string; prefix: string }> = {
    TARGET_NOT_FOUND: { code: 'TARGET_NOT_FOUND', prefix: 'The requested target was not found in the Idea' },
    TARGET_AMBIGUOUS: { code: 'TARGET_AMBIGUOUS', prefix: 'The requested target matches multiple places in the Idea' },
    NOT_A_HEADING: { code: 'NOT_A_HEADING', prefix: 'The target exists but is not a heading' },
    EMPTY_CONTENT: { code: 'EMPTY_CONTENT', prefix: 'Empty content is not allowed for this operation' },
    INVALID_POSITION: { code: 'INVALID_POSITION', prefix: 'This operation is not valid here' },
    SELF_REFERENCE: { code: 'SELF_REFERENCE', prefix: 'Target and anchor refer to the same place' },
  };
  const entry = map[code ?? ''] ?? map.TARGET_NOT_FOUND;
  return {
    success: false,
    error: {
      code: entry.code,
      message: `${entry.prefix}${detail ? ` ("${detail}")` : ''}. Ask the user for clarification; nothing was modified.`,
    },
  };
}

export class IdeaToolExecutors {
  // ─── Reads ─────────────────────────────────────────────

  static async getCurrentIdea(_params: any, ctx: IToolExecutionContext): Promise<AIToolResult> {
    const loaded = await loadCurrentIdea(ctx);
    if (!loaded.ok) return loaded.result;
    const { idea } = loaded;
    return {
      success: true,
      data: {
        idea_id: idea.id,
        title: idea.title ?? '',
        category: idea.capture_type,
        status: idea.status,
        created_at: idea.created_at,
        updated_at: idea.updated_at,
        content: idea.content,
      },
    };
  }

  static async getIdeaConversation(params: any, ctx: IToolExecutionContext): Promise<AIToolResult> {
    if (!ctx.ideaId || !ctx.conversationId) {
      return { success: false, error: { code: 'NO_IDEA_IN_CONTEXT', message: 'No Idea conversation is active.' } };
    }
    const limit = Math.min(Math.max(Number(params?.limit) || 20, 1), 100);
    const messages = await ctx.repositories.aiRepo.getMessages(ctx.conversationId);
    return { success: true, data: { idea_id: ctx.ideaId, messages: messages.slice(-limit) } };
  }

  static async getIdeaAttachments(_params: any, ctx: IToolExecutionContext): Promise<AIToolResult> {
    const loaded = await loadCurrentIdea(ctx);
    if (!loaded.ok) return loaded.result;
    const attachments = Array.isArray((loaded.idea.metadata as any)?.attachments)
      ? (loaded.idea.metadata as any).attachments
      : [];
    // Metadata only — never binary payloads.
    return { success: true, data: { idea_id: loaded.idea.id, attachments } };
  }

  static async getIdeaCategory(_params: any, ctx: IToolExecutionContext): Promise<AIToolResult> {
    const loaded = await loadCurrentIdea(ctx);
    if (!loaded.ok) return loaded.result;
    const outline = getIdeaOutlineSafe(loaded.idea.content);
    return {
      success: true,
      data: { idea_id: loaded.idea.id, category: loaded.idea.capture_type, title: loaded.idea.title ?? '', outline },
    };
  }

  // ─── Writes ────────────────────────────────────────────

  static async updateIdeaTitle(params: any, ctx: IToolExecutionContext): Promise<AIToolResult> {
    const scopeErr = checkScope(params, ctx, 'updateIdeaTitle');
    if (scopeErr) return scopeErr;
    const loaded = await loadCurrentIdea(ctx);
    if (!loaded.ok) return loaded.result;
    const title = typeof params.title === 'string' ? params.title.trim() : '';
    if (!title || title.length > 200) {
      return { success: false, error: { code: 'VALIDATION_FAILED', message: 'title is required (max 200 chars).' } };
    }
    return commitIdeaEdit(ctx, loaded.idea, { tool: 'updateIdeaTitle', operation: 'ai_title', nextTitle: title, reason: `Title → "${title}"` });
  }

  static async appendToIdea(params: any, ctx: IToolExecutionContext): Promise<AIToolResult> {
    const scopeErr = checkScope(params, ctx, 'appendToIdea');
    if (scopeErr) return scopeErr;
    const loaded = await loadCurrentIdea(ctx);
    if (!loaded.ok) return loaded.result;
    const contentErr = checkContent(params);
    if (contentErr) return contentErr;

    const result = applyAppend(loaded.idea.content, params.content, { sectionTitle: params.section });
    if (!result.ok) return engineError(params.section ?? undefined, result.code);

    return commitIdeaEdit(ctx, loaded.idea, {
      tool: 'appendToIdea',
      operation: 'ai_append',
      nextContent: result.content,
      reason: params.section ? `Appended inside "${params.section}"` : 'Appended at end',
    });
  }

  static async insertIntoIdea(params: any, ctx: IToolExecutionContext): Promise<AIToolResult> {
    const scopeErr = checkScope(params, ctx, 'insertIntoIdea');
    if (scopeErr) return scopeErr;
    const loaded = await loadCurrentIdea(ctx);
    if (!loaded.ok) return loaded.result;
    const contentErr = checkContent(params);
    if (contentErr) return contentErr;
    const position = ['before', 'after', 'start', 'end'].includes(params.position) ? params.position : undefined;

    const result = applyInsert(loaded.idea.content, params.content, {
      anchor: params.anchor,
      position,
    });
    if (!result.ok) return engineError(params.anchor ?? undefined, result.code);

    return commitIdeaEdit(ctx, loaded.idea, {
      tool: 'insertIntoIdea',
      operation: 'ai_insert',
      nextContent: result.content,
      reason: params.anchor ? `Inserted ${position ?? 'after'} "${params.anchor}"` : 'Inserted',
    });
  }

  static async replaceIdeaSection(params: any, ctx: IToolExecutionContext): Promise<AIToolResult> {
    const scopeErr = checkScope(params, ctx, 'replaceIdeaSection');
    if (scopeErr) return scopeErr;
    const loaded = await loadCurrentIdea(ctx);
    if (!loaded.ok) return loaded.result;
    const contentErr = checkContent(params);
    if (contentErr) return contentErr;
    if (typeof params.target !== 'string' || !params.target.trim()) {
      return { success: false, error: { code: 'VALIDATION_FAILED', message: 'target is required.' } };
    }

    const result = applyReplace(loaded.idea.content, params.target, params.content);
    if (!result.ok) return engineError(params.target, result.code);

    return commitIdeaEdit(ctx, loaded.idea, {
      tool: 'replaceIdeaSection',
      operation: 'ai_replace',
      nextContent: result.content,
      reason: `Replaced "${params.target}"`,
    });
  }

  static async removeIdeaSection(params: any, ctx: IToolExecutionContext): Promise<AIToolResult> {
    const scopeErr = checkScope(params, ctx, 'removeIdeaSection');
    if (scopeErr) return scopeErr;
    const loaded = await loadCurrentIdea(ctx);
    if (!loaded.ok) return loaded.result;
    if (typeof params.target !== 'string' || !params.target.trim()) {
      return { success: false, error: { code: 'VALIDATION_FAILED', message: 'target is required.' } };
    }

    const result = applyRemove(loaded.idea.content, params.target);
    if (!result.ok) return engineError(params.target, result.code);

    return commitIdeaEdit(ctx, loaded.idea, {
      tool: 'removeIdeaSection',
      operation: 'ai_remove',
      nextContent: result.content,
      reason: `Removed "${params.target}"`,
    });
  }

  static async reorderIdeaSection(params: any, ctx: IToolExecutionContext): Promise<AIToolResult> {
    const scopeErr = checkScope(params, ctx, 'reorderIdeaSection');
    if (scopeErr) return scopeErr;
    const loaded = await loadCurrentIdea(ctx);
    if (!loaded.ok) return loaded.result;
    for (const field of ['target', 'anchor']) {
      if (typeof params?.[field] !== 'string' || !params[field].trim()) {
        return { success: false, error: { code: 'VALIDATION_FAILED', message: `${field} is required.` } };
      }
    }
    const position = params.position === 'before' ? 'before' : params.position === 'after' ? 'after' : null;
    if (!position) {
      return { success: false, error: { code: 'VALIDATION_FAILED', message: 'position must be "before" or "after".' } };
    }

    const result = applyReorder(loaded.idea.content, params.target, params.anchor, position);
    if (!result.ok) return engineError(result.code === 'SELF_REFERENCE' ? undefined : params.target, result.code);

    return commitIdeaEdit(ctx, loaded.idea, {
      tool: 'reorderIdeaSection',
      operation: 'ai_reorder',
      nextContent: result.content,
      reason: `Moved "${params.target}" ${position} "${params.anchor}"`,
    });
  }

  static async renameIdeaSection(params: any, ctx: IToolExecutionContext): Promise<AIToolResult> {
    const scopeErr = checkScope(params, ctx, 'renameIdeaSection');
    if (scopeErr) return scopeErr;
    const loaded = await loadCurrentIdea(ctx);
    if (!loaded.ok) return loaded.result;
    if (typeof params.target !== 'string' || !params.target.trim()) {
      return { success: false, error: { code: 'VALIDATION_FAILED', message: 'target is required.' } };
    }
    const newTitle = typeof params.new_title === 'string' ? params.new_title.trim() : '';
    if (!newTitle) {
      return { success: false, error: { code: 'VALIDATION_FAILED', message: 'new_title is required.' } };
    }

    const result = applyRename(loaded.idea.content, params.target, newTitle);
    if (!result.ok) return engineError(params.target, result.code);

    return commitIdeaEdit(ctx, loaded.idea, {
      tool: 'renameIdeaSection',
      operation: 'ai_rename',
      nextContent: result.content,
      reason: `Renamed "${params.target}" → "${newTitle}"`,
    });
  }

  static async createIdeaSection(params: any, ctx: IToolExecutionContext): Promise<AIToolResult> {
    const scopeErr = checkScope(params, ctx, 'createIdeaSection');
    if (scopeErr) return scopeErr;
    const loaded = await loadCurrentIdea(ctx);
    if (!loaded.ok) return loaded.result;
    const title = typeof params.title === 'string' ? params.title.trim() : '';
    if (!title) {
      return { success: false, error: { code: 'VALIDATION_FAILED', message: 'title is required.' } };
    }
    const body = typeof params.content === 'string' ? params.content : '';
    if (body.length > MAX_IDEA_CONTENT_LENGTH) {
      return { success: false, error: { code: 'CONTENT_TOO_LARGE', message: 'Content exceeds the length limit.' } };
    }

    const result = applyCreateSection(loaded.idea.content, title, body, {
      anchor: params.anchor,
      position: ['before', 'after', 'start', 'end'].includes(params.position) ? params.position : undefined,
    });
    if (!result.ok) return engineError(params.anchor ?? undefined, result.code);

    return commitIdeaEdit(ctx, loaded.idea, {
      tool: 'createIdeaSection',
      operation: 'ai_insert',
      nextContent: result.content,
      reason: `Created section "${title}"`,
    });
  }

  static async rewriteIdeaContent(params: any, ctx: IToolExecutionContext): Promise<AIToolResult> {
    const scopeErr = checkScope(params, ctx, 'rewriteIdeaContent');
    if (scopeErr) return scopeErr;
    const loaded = await loadCurrentIdea(ctx);
    if (!loaded.ok) return loaded.result;
    const contentErr = checkContent(params);
    if (contentErr) return contentErr;

    const result = applyFullRewrite(loaded.idea.content, params.content);
    if (!result.ok) return engineError(undefined, result.code);

    return commitIdeaEdit(ctx, loaded.idea, {
      tool: 'rewriteIdeaContent',
      operation: 'ai_rewrite',
      nextContent: result.content,
      reason: 'Full rewrite (explicit request)',
    });
  }
}

function getIdeaOutlineSafe(content: string): Array<{ kind: string; preview: string; title: string }> {
  try {
    return getIdeaOutline(content);
  } catch {
    return [];
  }
}
