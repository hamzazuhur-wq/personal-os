// ============================================================
// MODULE 10 — IDEA-SCOPED MOCK PROVIDER (development/testing)
// ============================================================
// Mirrors DevelopmentMockProvider's role, but for the Idea Capture
// workspace ONLY. It never emits global tools (goals/tasks/projects/
// memories...) — the physical tool boundary of §19 holds even in dev mode.
//
// It recognizes the spec's example intents in Arabic and English:
// - Discussion ("شو رأيك؟", "what do you think", "كيف أحسن", "how can I improve")
//     → conversational answer, NO tool call, NO mutation.
// - Structured edits ("أضف ...", "add ...", "احذف ...", "remove ...",
//   "انقل X قبل Y", "put X before Y", "اجعل القسم X أولاً", "make X first",
//   "غيّر عنوان", "rename") → ONE structured edit proposal per turn,
//   always bound to the CURRENT idea id from relevantStructuredData.idea.
// ============================================================

import {
  AIProviderRequest,
  AIProviderResponse,
  IAIProvider,
} from './IAIProvider';
import { generateId } from '../../../utils/idGenerator';

interface IdeaSnapshot {
  id: string;
  title: string;
  category: string;
  content: string;
  attachments?: Array<Record<string, unknown>>;
}

const DISCUSS_PATTERNS = [
  'شو رأيك', 'ايه رأيك', 'ما رأيك', 'رأيك', 'كيف أحسن', 'كيف احسن', 'أحسّن', 'احسنت',
  'what do you think', 'what do u think', 'your opinion', 'how can i improve',
  'any ideas', 'thoughts?', 'why ', 'لماذا', 'ليش', 'اشرح', 'explain',
];

function isDiscussion(text: string): boolean {
  const lower = text.toLowerCase();
  return DISCUSS_PATTERNS.some((p) => lower.includes(p));
}

/** Extracts a quoted segment ("..." or «...» or «...») if present. */
function extractQuoted(text: string): string | null {
  const m = text.match(/"([^"]{1,200})"|«([^»]{1,200})»|„([^"]{1,200})"/);
  return m ? (m[1] || m[2] || m[3]).trim() : null;
}

/** Text after an explicit content separator (colon or Arabic colon). */
function afterColon(text: string): string | null {
  const idx = text.search(/[:：]/);
  if (idx >= 0 && idx < text.length - 1) return text.slice(idx + 1).trim();
  return null;
}

export class IdeaMockProvider implements IAIProvider {
  readonly id = 'idea-mock-provider';
  readonly name = 'Idea Mock Provider (Testing Only)';
  readonly isDevelopmentMock = true;

  async generateResponse(request: AIProviderRequest): Promise<AIProviderResponse> {
    const lastMsg = request.messages[request.messages.length - 1];
    const userText = lastMsg ? lastMsg.content.trim() : '';
    const lower = userText.toLowerCase();
    const idea: IdeaSnapshot | undefined = request.relevantStructuredData?.idea;

    if (!idea) {
      return {
        content: 'No current Idea is loaded in this workspace.',
        type: 'answer',
        sourcesUsed: ['Current Idea'],
      };
    }

    // ── 1. Discussion intent → answer WITHOUT any tool call ──────────────
    const looksLikeQuestion = /[?？؟]\s*$/.test(userText) || lower.startsWith('ما ') || lower.startsWith('شو ');
    if ((isDiscussion(userText) && !hasEditVerb(lower)) || (looksLikeQuestion && !hasEditVerb(lower))) {
      const preview = idea.content.slice(0, 400).replace(/\s+/g, ' ');
      return {
        content:
          `Discussion only — nothing was changed.\n\n` +
          `Your idea "${idea.title || '(untitled)'}" currently starts with:\n"${preview}${idea.content.length > 400 ? '…' : ''}"\n\n` +
          `If you want me to modify it, tell me exactly what to add, change, remove or reorder.`,
        type: 'answer',
        sourcesUsed: ['Current Idea'],
      };
    }

    const base = { confirmation_required: true };

    // ── 2. Reorder: "put X before Y" / "انقل X قبل Y" / "make X first" ───
    const reorderEn = userText.match(/put\s+(.+?)\s+before\s+(.+)/i) || userText.match(/move\s+(.+?)\s+before\s+(.+)/i);
    const reorderAr = userText.match(/انقل\s+(.+?)\s+قبل\s+(.+)/i);
    const makeFirst = /make\s+(.+?)\s+first/i.exec(userText) || /اجعل\s+(?:قسم\s+)?(.+?)\s+(?:اولاً|أولاً|اول)/i.exec(userText);
    if (reorderEn || reorderAr) {
      const m = (reorderEn || reorderAr)!;
      return this.edit('reorderIdeaSection', 'reorder_idea_section',
        `Move "${m[1].trim()}" before "${m[2].trim()}"`,
        { idea_id: idea.id, target: m[1].trim(), anchor: m[2].trim(), position: 'before', reason: userText }, base);
    }
    if (makeFirst) {
      return this.edit('reorderIdeaSection', 'reorder_idea_section',
        `Move "${makeFirst[1].trim()}" to the top`,
        { idea_id: idea.id, target: makeFirst[1].trim(), anchor: null, position: 'start', reason: userText }, base);
    }

    // ── 3. Remove: "remove/delete X" / "احذف X" ──────────────────────────
    const removeEn = /(?:remove|delete)\s+(?:the\s+)?(?:section\s+)?"?(.+?)"?\s*$/i.exec(userText);
    const removeAr = /احذف\s+(?:قسم\s+)?"?(.+?)"?\s*$/.exec(userText);
    if (removeEn || removeAr) {
      const target = ((removeEn ? removeEn[1] : removeAr![1]) || '').trim().replace(/[.。]$/, '');
      if (target) {
        return this.edit('removeIdeaSection', 'remove_idea_section',
          `Remove "${target}" from the Idea`,
          { idea_id: idea.id, target, reason: userText }, base);
      }
    }

    // ── 4. Rename section: "rename X to Y" ───────────────────────────────
    const renameSec = /rename\s+(?:the\s+)?(?:section\s+)?"(.+?)"\s+to\s+"(.+?)"/i.exec(userText);
    if (renameSec) {
      return this.edit('renameIdeaSection', 'rename_idea_section',
        `Rename section "${renameSec[1]}" to "${renameSec[2]}"`,
        { idea_id: idea.id, target: renameSec[1], new_title: renameSec[2], reason: userText }, base);
    }

    // ── 5. Title: "rename the idea to Y" / "change title to Y" ───────────
    const titleM = /(?:rename\s+the\s+idea\s+to|change\s+(?:the\s+)?title\s+to)\s+"?(.+?)"?\s*$/i.exec(userText)
      || /غيّر\s+العنوان\s+إلى\s+"?(.+?)"?\s*$/.exec(userText);
    if (titleM) {
      const title = titleM[1].trim();
      return this.edit('updateIdeaTitle', 'update_idea_title',
        `Set Idea title to "${title}"`,
        { idea_id: idea.id, title, reason: userText }, base);
    }

    // ── 6. Replace section body ──────────────────────────────────────────
    const replaceSec = /replace\s+(?:the\s+)?(?:section\s+)?"(.+?)"\s+(?:with|by)\s+"([\s\S]+?)"/i.exec(userText)
      || /استبدل\s+قسم\s+"(.+?)"\s+بـ?\s*"([\s\S]+?)"/.exec(userText);
    if (replaceSec) {
      return this.edit('replaceIdeaSection', 'replace_idea_section',
        `Replace section "${replaceSec[1]}" body`,
        { idea_id: idea.id, target: replaceSec[1], content: replaceSec[2], reason: userText }, base);
    }
    const rewriteAll = /^(rewrite|regenerate)\s+(?:the\s+)?(?:whole\s+|entire\s+)?idea/i.test(userText)
      || /^أعد\s+صياغة\s+الفكرة/.test(userText);
    if (rewriteAll) {
      const body = afterColon(userText) ?? '';
      if (!body.trim()) {
        return { content: 'What should the rewritten idea say? Provide the new full text after a colon.', type: 'answer', sourcesUsed: ['Current Idea'] };
      }
      return this.edit('rewriteIdeaContent', 'rewrite_idea_content',
        'Rewrite the whole Idea content',
        { idea_id: idea.id, content: body, reason: userText }, base);
    }

    // ── 7. Append / Insert ───────────────────────────────────────────────
    const appendPayload = extractQuoted(userText) ?? afterColon(userText);
    const appendIntent = /\b(add|append)\b/i.test(lower) || /\b(أضف|اضف|ضيف)\b/.test(userText)
      || /\b(insert)\b/i.test(lower) || /\b(ادرج|ادخل)\b/.test(userText);
    if (appendIntent) {
      let content = appendPayload ?? '';
      if (!content.trim()) {
        // Fallback: everything after the keyword.
        const kw = userText.match(/(?:add|append|insert|أضف|اضف|ضيف|ادرج)\s*:?\s*([\s\S]+)/i);
        content = kw ? kw[1].trim() : '';
      }
      if (!content.trim()) {
        return { content: 'What should I add to the Idea? Please provide the text.', type: 'answer', sourcesUsed: ['Current Idea'] };
      }
      const isInsert = /\b(insert)\b/i.test(lower) || /\b(ادرج|ادخل)\b/.test(userText);
      const tool = isInsert ? 'insertIntoIdea' : 'appendToIdea';
      const actionType = isInsert ? 'insert_into_idea' : 'append_to_idea';
      const params: Record<string, unknown> = { idea_id: idea.id, content, reason: userText };
      const secM = userText.match(/(?:section|قسم)\s+"(.+?)"/i);
      if (secM) params.section_title = secM[1];
      return this.edit(tool, actionType,
        `${isInsert ? 'Insert into' : 'Append to'} the Idea`,
        params, base);
    }

    // ── 8. Edit verb but unclear target → clarify, never guess ───────────
    if (hasEditVerb(lower)) {
      return {
        content:
          'I want to make sure I edit the right thing. Which exact section or line should I change? ' +
          'You can name it like: replace section "Fashion" with … , remove "Old notes", or put "X" before "Y".',
        type: 'answer',
        sourcesUsed: ['Current Idea'],
      };
    }

    // ── 9. Default: conversational reply, no mutation ────────────────────
    return {
      content:
        `Noted. This Idea workspace only discusses and edits the current idea` +
        ` ("${idea.title || '(untitled)'}"). Tell me what you would like to change.`,
      type: 'answer',
      sourcesUsed: ['Current Idea'],
    };
  }

  private edit(
    tool_name: string,
    action_type: any,
    title: string,
    parameters: Record<string, unknown>,
    extra: Record<string, unknown>
  ): AIProviderResponse {
    return {
      content: `I've prepared a structured edit for your Idea: **${title}**. Review and approve below — the previous state will be kept as a revision you can undo.`,
      type: 'action_proposal',
      actionProposal: {
        id: generateId(),
        tool_name,
        action_type,
        title,
        description: title,
        parameters,
        confirmation_required: true,
        ...(extra as any),
      },
      sourcesUsed: ['Current Idea'],
    };
  }
}

function hasEditVerb(lower: string): boolean {
  return EDIT_VERBS.some((v) => lower.includes(v));
}

const EDIT_VERBS = [
  'أضف', 'اضف', 'ضيف', 'احذف', 'عدّل', 'عدل', 'غير ', 'انقل', 'اجعل', 'استبدل',
  'غيّر', 'غير العنوان', 'أعد صياغة',
  'add ', 'append', 'insert', 'remove', 'delete', 'replace', 'rename',
  'move ', 'put ', 'make ', 'change', 'rewrite', 'reorder', 'update the title',
];

export const ideaMockProvider = new IdeaMockProvider();
