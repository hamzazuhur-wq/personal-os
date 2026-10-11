// ============================================================
// MODULE 10 — SCOPED IDEA AGENT CORE
// ============================================================
// A specialized tool scope over the EXISTING AI foundation (§17):
// - Same IAIProvider abstraction / provider configuration as the global
//   assistant (no second provider architecture).
// - Same conversation persistence (ai_conversations / ai_messages), scoped
//   by ai_conversations.idea_id.
// - Same ActionPolicy + audit pipeline for approved writes.
//
// Differences from the global agent:
// - NO ContextRouter / ContextBuilder: the only context is the CURRENT Idea
//   (+ its category, attachment metadata, and this idea's conversation).
// - availableTools = IDEA_TOOL_DEFINITIONS only. Goals/Tasks/Projects/
//   Skills/Levels/Activities/Life Areas tools are physically absent.
// - Every execution binds to the session-fixed ideaId (IDEA_ID_MISMATCH
//   otherwise). Model-supplied ids are never trusted.
// ============================================================

import { AIMessage } from '../../../types/ai.types';
import { AIActionProposalPayload } from '../../../types/ai.types';
import { Capture } from '../../../types/capture.types';
import { APP_CONFIG } from '../../../config/app.config';
import { ActionPolicy } from './actionPolicy';
import { IDEA_TOOL_DEFINITIONS } from '../tools/ideaTools';
import { getIdeaOutline } from '../../../utils/ideaContent';
import { AIToolResult } from '../../../types/aiTool.types';
import { providerResolver } from '../providerResolver';
import { AIProviderConnection } from '../../../types/aiProvider.types';
import { ideaMockProvider } from '../providers/IdeaMockProvider';

const MAX_CONTEXT_CONTENT = 20_000;

function truncateForContext(content: string): string {
  if (content.length <= MAX_CONTEXT_CONTENT) return content;
  const head = content.slice(0, Math.floor(MAX_CONTEXT_CONTENT * 0.7));
  const tail = content.slice(-Math.floor(MAX_CONTEXT_CONTENT * 0.2));
  return `${head}\n\n[…content truncated for context window…]\n\n${tail}`;
}

export function buildIdeaSystemContext(
  idea: Capture,
  attachments: Array<Record<string, unknown>>
): string {
  const outline = getIdeaOutline(idea.content);
  const outlineLines = outline.length
    ? outline.map((b) => `- [${b.kind}] ${b.title || b.preview.replace(/\n/g, ' ')}`).join('\n')
    : '- (empty idea body)';
  const attachmentLines = attachments.length
    ? attachments
        .map((a) => {
          const url = typeof a.url === 'string' ? a.url : '';
          // Security/cost guard: embedded files are stored as data URLs.
          // The base64 payload must NEVER be dumped into an AI prompt.
          const display = url.startsWith('data:')
            ? `[embedded ${a.type ?? 'file'}] ${a.label || 'file'}`
            : (a.label || url);
          return `- [${a.type}] ${display}`;
        })
        .join('\n')
    : '- none';

  return [
    'You are the Idea Assistant operating inside ONE Idea workspace.',
    'You help the user think about, discuss, and edit THIS Idea only.',
    '',
    'ABSOLUTE RULES:',
    '1. Never convert this Idea into a Task, Goal, Project, Skill, Level, Activity, Note or Question. You have no such tools.',
    '2. Distinguish intents: DISCUSS/SUGGEST questions must be answered conversationally WITHOUT calling any tool. Only call an edit tool when the user explicitly asks to change/add/remove/reorganize the Idea.',
    '3. When editing, prefer ONE precise structured operation per turn (append / insert / replace section / remove / reorder / rename / create section). Use rewriteIdeaContent ONLY when the user explicitly asks to rewrite the whole idea.',
    '4. Reference targets exactly as they appear in the Idea. If you cannot identify an unambiguous target, ask a clarifying question instead of guessing.',
    '5. Always respond in the same language the user writes in (Arabic or English).',
    '6. The idea_id parameter MUST be exactly the id given below.',
    '',
    'CURRENT IDEA:',
    `id: ${idea.id}`,
    `title: ${idea.title ?? '(untitled)'}`,
    `category: ${idea.capture_type}`,
    `attachments:\n${attachmentLines}`,
    '',
    'STRUCTURE OUTLINE (block kinds in order):',
    outlineLines,
    '',
    'CURRENT CONTENT:',
    '<<<IDEA_CONTENT_START>>>',
    truncateForContext(idea.content),
    '<<<IDEA_CONTENT_END>>>',
  ].join('\n');
}

export interface IdeaUserTurnOptions {
  onChunk?: (partialText: string) => void;
  signal?: AbortSignal;
}

export class IdeaAgentCore {
  /**
   * Processes one user message inside an Idea-scoped conversation.
   * Mirrors PersonalAgentCore.processUserTurn but with idea-local context
   * and the restricted tool set.
   */
  async processIdeaUserTurn(opts: {
    ideaId: string;
    conversationId: string;
    userPrompt: string;
    historyMessages: AIMessage[];
    repositories: any;
    options?: IdeaUserTurnOptions;
  }): Promise<AIMessage> {
    const { ideaId, conversationId, userPrompt, historyMessages, repositories, options } = opts;

    // Provider configured from the SAME settings as the global assistant.
    // Use the provider resolver to bind the actual connection.
    const settings = await repositories.aiRepo.getSettings().catch(() => null);
    let provider;
    if (settings) {
      const connection: AIProviderConnection | null = await repositories.aiRepo.getActiveProviderConnection(settings.user_id).catch(() => null);

      // Safety net: clear stale active_connection_id if the connection is missing
      if (!connection && settings.active_connection_id) {
        await repositories.aiRepo.updateSettings({ active_connection_id: null }).catch(() => {});
      }

      provider = providerResolver.resolveForIdea(connection, settings);
    } else {
      provider = ideaMockProvider;
    }

    const idea: Capture | null = await repositories.captureRepo.getById(ideaId);
    if (!idea) throw new Error('Current Idea not found.');

    // 1. Persist user message
    await repositories.aiRepo.addMessage(conversationId, 'user', userPrompt, 'answer');

    // 2. Auto-title the idea conversation on first turn
    const conv = await repositories.aiRepo.getConversation(conversationId).catch(() => null);
    if (conv && (!conv.title || ['New Conversation', 'Untitled Session', 'Idea Workspace'].includes(conv.title))) {
      const label = idea.title?.trim() || idea.content.slice(0, 48);
      await repositories.aiRepo.updateConversation(conversationId, {
        title: `Idea · ${label}`.slice(0, 80),
        provider: settings?.provider,
        model: settings?.selected_model,
      }).catch(() => undefined);
    }

    // 3. Scoped context (current idea + attachment metadata only)
    const attachments = Array.isArray((idea.metadata as any)?.attachments)
      ? (idea.metadata as any).attachments
      : [];
    const contextSummary = buildIdeaSystemContext(idea, attachments);

    // 4. Invoke provider with RESTRICTED tool set
    let response: any;
    try {
      response = await provider.generateResponse(
        {
          messages: [
            ...historyMessages,
            {
              id: 'current-turn',
              conversation_id: conversationId,
              role: 'user',
              content: userPrompt,
              type: 'answer',
              created_at: new Date().toISOString(),
            },
          ],
          contextSummary,
          relevantStructuredData: {
            idea: {
              id: idea.id,
              title: idea.title ?? '',
              category: idea.capture_type,
              content: idea.content,
              attachments,
            },
          },
          relevantMemories: [],
          availableTools: IDEA_TOOL_DEFINITIONS,
        },
        options
      );
    } catch (err: any) {
      await repositories.aiRepo.logRequest({
        conversation_id: conversationId,
        timestamp: new Date().toISOString(),
        provider: settings?.provider || 'openrouter',
        model: settings?.selected_model || 'unknown',
        latency_ms: 0,
        status: 'failed',
        error_message: err.message || 'AI request failed',
        fallback_used: false,
      }).catch(() => undefined);

      // Failure safety: the Idea itself was never touched; surface a calm error.
      await repositories.aiRepo.addMessage(
        conversationId,
        'assistant',
        'AI is currently unavailable. Your Idea is safe.',
        'error'
      ).catch(() => undefined);
      throw err;
    }

    // 5. Usage log
    await repositories.aiRepo.logRequest({
      conversation_id: conversationId,
      timestamp: new Date().toISOString(),
      provider: settings?.provider || 'openrouter',
      model: response.model_used || settings?.selected_model || 'unknown',
      input_tokens: response.usage?.input_tokens,
      output_tokens: response.usage?.output_tokens,
      total_tokens: response.usage?.total_tokens,
      latency_ms: response.latency_ms || 0,
      status: 'success',
      fallback_used: !!response.fallback_used,
      estimated_cost: response.estimated_cost,
    }).catch(() => undefined);

    // 6. Persist assistant reply (with structured edit proposal if present)
    const assistantMessage = await repositories.aiRepo.addMessage(
      conversationId,
      'assistant',
      response.content,
      response.type,
      ['Current Idea'],
      response.actionProposal,
      {
        model_used: response.model_used || settings?.selected_model,
        provider_used: settings?.provider,
        input_tokens: response.usage?.input_tokens,
        output_tokens: response.usage?.output_tokens,
        total_tokens: response.usage?.total_tokens,
        latency_ms: response.latency_ms,
      }
    );

    return assistantMessage;
  }

  /**
   * Executes an approved idea edit through the shared ActionPolicy.
   * The session-fixed ideaId travels in the execution context — executors
   * re-verify it against the proposal parameters.
   */
  async executeApprovedIdeaAction(
    proposal: AIActionProposalPayload,
    repositories: any,
    conversationId: string | undefined,
    ideaId: string
  ): Promise<AIToolResult> {
    return ActionPolicy.executeApprovedAction(proposal, {
      conversationId,
      userId: APP_CONFIG.defaultUserId,
      repositories,
      ideaId,
    });
  }
}

export const ideaAgentCore = new IdeaAgentCore();
