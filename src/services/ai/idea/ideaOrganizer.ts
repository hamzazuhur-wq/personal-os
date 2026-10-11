// ============================================================
// MODULE 11 — AI VOICE ORGANIZATION (one-call idea organizer)
// ============================================================
// Takes a RAW VOICE TRANSCRIPT and organizes it into a single
// structured Idea. Exactly ONE provider call — no tool loop,
// no conversation persistence, no side effects.
// ============================================================

import { personalAgentCore } from '../agent/agentCore';
import { IdeaCategory } from '../../../types/ideaCategory.types';

export interface IdeaOrganizationResult {
  title: string;
  body: string;
  key_points: string[];
  /** Matched against ACTIVE user categories only; null when no confident match. */
  suggested_category_id: string | null;
  suggested_category_name: string | null;
  organized_by_ai: boolean;
}

const MAX_TITLE_LEN = 90;

function clamp(text: string, max: number): string {
  const t = text.trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?…])\s+|(?<=[.!?…])$/u)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Deterministic offline organizer — used for the development mock provider so AI Voice works without network/cost. */
export function organizeTranscriptLocally(
  transcript: string,
  categories: IdeaCategory[]
): IdeaOrganizationResult {
  const clean = transcript.replace(/\s+/g, ' ').trim();
  const sentences = splitSentences(clean);
  const firstSentence = sentences[0] || clean;
  let title = clamp(firstSentence.replace(/^(so|and|but|basically|okay|ok|i think|i want to|i want|i'd like|maybe)\s+/i, ''), MAX_TITLE_LEN);
  if (!title) title = clamp(clean, MAX_TITLE_LEN) || 'Voice Idea';

  const keyPoints = sentences
    .slice(0, 6)
    .map((s) => clamp(s, 140))
    .filter((s) => s.length > 2);

  const body = [
    clean,
    '',
    '## Key Points',
    ...(keyPoints.length ? keyPoints.map((p) => `- ${p}`) : ['- (no distinct points detected)']),
  ].join('\n');

  // Keyword-based category hint against the user's OWN active categories.
  const lower = clean.toLowerCase();
  const keywordMap: Array<[RegExp, string]> = [
    [/\b(business|revenue|customer|market|pricing|startup|sales|profit|product)\b/, 'business'],
    [/\b(creative|design|story|music|art|write|writing|paint|film|video|brand)\b/, 'creative'],
    [/\b(personal|family|health|home|life|friend|habit|energy)\b/, 'personal'],
    [/\b(general|idea)\b/, 'general'],
  ];
  let target: string | null = null;
  for (const [re, tag] of keywordMap) {
    if (re.test(lower)) {
      target = tag;
      break;
    }
  }
  const matched =
    (target &&
      categories.find((c) => c.name.toLowerCase().includes(target!))) ||
    undefined;

  return {
    title,
    body,
    key_points: keyPoints,
    suggested_category_id: matched ? matched.id : null,
    suggested_category_name: matched ? matched.name : null,
    organized_by_ai: true,
  };
}

function extractJsonBlock(content: string): Record<string, unknown> {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced && fenced[1].trim() ? fenced[1] : content;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('AI response did not contain a valid organization object.');
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

/**
 * Organize a raw voice transcript into one structured Idea.
 * Exactly ONE provider call. Throws on failure — callers must fall
 * back to saving the original transcript.
 */
export async function organizeIdeaTranscript(opts: {
  transcript: string;
  activeCategories: IdeaCategory[];
}): Promise<IdeaOrganizationResult> {
  const { transcript, activeCategories } = opts;
  const raw = transcript.trim();
  if (!raw) throw new Error('Nothing recorded.');

  // Same configuration source as the global assistant.
  const configured = personalAgentCore.getProvider();

  if (configured.isDevelopmentMock) {
    // Dev/mock mode: deterministic local organization, zero network.
    await new Promise((r) => setTimeout(r, 350));
    return organizeTranscriptLocally(raw, activeCategories);
  }

  const categoryList = activeCategories.map((c) => c.name).join(' | ');
  const systemInstruction = [
    'You organize raw voice transcripts into a single structured idea.',
    'Respond with ONLY a JSON object, no prose, in this exact shape:',
    '{"title":string,"body":string,"key_points":string[],"suggested_category":string|null}',
    'Rules:',
    '- title: concise headline, max 90 characters.',
    '- body: the organized idea text in markdown. Preserve ALL substance of the transcript; never invent facts.',
    '- key_points: 3-6 short bullet strings extracted from the transcript.',
    `- suggested_category: pick EXACTLY one of these user categories when clearly relevant, otherwise null: ${categoryList}`,
  ].join('\n');

  const response = await configured.generateResponse({
    messages: [
      {
        id: 'organize-system',
        conversation_id: 'idea-organizer',
        role: 'system',
        content: systemInstruction,
        type: 'answer',
        created_at: new Date().toISOString(),
      },
      {
        id: 'organize-user',
        conversation_id: 'idea-organizer',
        role: 'user',
        content: `Raw voice transcript:\n"""${raw}"""`,
        type: 'answer',
        created_at: new Date().toISOString(),
      },
    ],
    contextSummary: 'One-shot voice transcript organization for Idea Capture.',
    relevantStructuredData: {},
    relevantMemories: [],
    availableTools: [],
  });

  const parsed = extractJsonBlock(response.content ?? '');
  const body =
    typeof parsed.body === 'string' && parsed.body.trim() ? parsed.body.trim() : raw;
  const keyPoints = Array.isArray(parsed.key_points)
    ? parsed.key_points.filter((k): k is string => typeof k === 'string').map((k) => clamp(k, 160))
    : [];
  const suggestedName =
    typeof parsed.suggested_category === 'string' ? parsed.suggested_category.trim() : '';
  const matched = activeCategories.find(
    (c) => c.name.toLowerCase() === suggestedName.toLowerCase()
  );

  return {
    title:
      typeof parsed.title === 'string' && parsed.title.trim()
        ? clamp(parsed.title, MAX_TITLE_LEN)
        : clamp(splitSentences(raw)[0] || raw, MAX_TITLE_LEN),
    body,
    key_points: keyPoints,
    suggested_category_id: matched ? matched.id : null,
    suggested_category_name: matched ? matched.name : null,
    organized_by_ai: true,
  };
}
