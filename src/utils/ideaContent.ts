// ============================================================
// MODULE 10 — IDEA CONTENT ENGINE
// ============================================================
// Deterministic structured-edit engine for freeform Idea content.
//
// Design guarantees (per approved spec corrections):
// - The Idea body is ONE canonical freeform string. This engine never
//   becomes a second source of truth — every operation takes the current
//   canonical content in and returns new canonical content out.
// - Offset-based splicing: operations modify only the byte range they
//   target. Untouched regions stay byte-identical (no silent reformatting,
//   never a whole-document rewrite to achieve a small edit).
// - Conservative targeting: a target must resolve uniquely (exact heading,
//   unique heading substring, or unique block-line containment) otherwise
//   the caller receives TARGET_NOT_FOUND / TARGET_AMBIGUOUS and must ask
//   the user for clarification. Destructive ops NEVER guess.
// ============================================================

export interface IdeaBlock {
  /** Span in the source string: [start, end). */
  start: number;
  end: number;
  kind: 'heading' | 'list' | 'paragraph';
  /** Heading depth 1–6 (headings only). */
  level?: number;
  /** Heading text without the #'s (headings only). */
  headingText?: string;
  /** Exact raw text of the block. */
  text: string;
}

export interface IdeaSection {
  /** Section title = heading text; undefined for untitled groups. */
  title?: string;
  level?: number;
  start: number;
  end: number;
  /** Whether this section begins with an explicit heading. */
  hasHeading: boolean;
  blockRange: [number, number];
}

export type TargetResolution =
  | { status: 'resolved'; kind: 'section' | 'block'; sectionIndex?: number; blockIndex?: number }
  | { status: 'not_found' }
  | { status: 'ambiguous'; matches: number };

export type IdeaEditErrorCode =
  | 'TARGET_NOT_FOUND'
  | 'TARGET_AMBIGUOUS'
  | 'NOT_A_HEADING'
  | 'EMPTY_CONTENT'
  | 'INVALID_POSITION'
  | 'SELF_REFERENCE';

export type IdeaEditResult =
  | { ok: true; content: string }
  | { ok: false; code: IdeaEditErrorCode; detail?: string };

const HEADING_RE = /^#{1,6}[ \t]+(.*)$/;
const LIST_ITEM_RE = /^[ \t]*(?:[-*+]|\d+[.)])[ \t]+/;
const BLANK_RE = /^[ \t]*$/;

/** Parse freeform content into offset-addressed blocks. Never throws. */
export function parseIdeaBlocks(content: string): IdeaBlock[] {
  const blocks: IdeaBlock[] = [];
  if (!content) return blocks;

  // Line spans (excluding the newline character itself)
  const lineSpans: Array<[number, number]> = [];
  let cursor = 0;
  for (const line of content.split('\n')) {
    lineSpans.push([cursor, cursor + line.length]);
    cursor += line.length + 1;
  }

  // Group consecutive non-blank lines into blocks. Headings are ALWAYS
  // self-contained single-line blocks — freeform ideas often omit the blank
  // line after a heading, so a heading line also terminates the previous run.
  let group: Array<[number, number]> = [];
  const flush = () => {
    if (group.length === 0) return;
    const start = group[0][0];
    const end = group[group.length - 1][1];
    const text = content.slice(start, end);
    blocks.push(classifyBlock(start, end, text));
    group = [];
  };
  for (const span of lineSpans) {
    const lineText = content.slice(span[0], span[1]);
    if (BLANK_RE.test(lineText)) {
      flush();
    } else if (HEADING_RE.test(lineText)) {
      flush();
      blocks.push(classifyBlock(span[0], span[1], lineText));
    } else {
      group.push(span);
    }
  }
  flush();
  return blocks;
}

function classifyBlock(start: number, end: number, text: string): IdeaBlock {
  const lines = text.split('\n');
  const first = lines[0];
  const headingMatch = HEADING_RE.exec(first);

  if (headingMatch && lines.length === 1) {
    const hashRun = first.match(/^#+/);
    const level = Math.min(6, hashRun ? hashRun[0].length : 2);
    return { start, end, kind: 'heading', level, headingText: headingMatch[1].trim(), text };
  }

  const nonBlankLines = lines.filter((l) => !BLANK_RE.test(l));
  const isList = nonBlankLines.length > 0 && nonBlankLines.every((l) => LIST_ITEM_RE.test(l));
  return { start, end, kind: isList ? 'list' : 'paragraph', text };
}

/** Group blocks into sections: a heading plus everything until the next heading. */
export function buildIdeaSections(content: string, blocks?: IdeaBlock[]): IdeaSection[] {
  const bs = blocks ?? parseIdeaBlocks(content);
  if (bs.length === 0) return [];

  const sections: IdeaSection[] = [];
  let currentHeading: IdeaBlock | undefined;
  let groupStart = 0;

  const pushGroup = (from: number, toExclusive: number) => {
    if (from >= toExclusive) return;
    const group = bs.slice(from, toExclusive);
    sections.push({
      title: currentHeading?.headingText,
      level: currentHeading?.level,
      start: group[0].start,
      end: group[group.length - 1].end,
      hasHeading: !!currentHeading,
      blockRange: [from, toExclusive],
    });
  };

  for (let i = 0; i < bs.length; i++) {
    if (bs[i].kind === 'heading') {
      pushGroup(groupStart, i);
      currentHeading = bs[i];
      groupStart = i;
    }
  }
  pushGroup(groupStart, bs.length);

  // Merge a leading untitled group into the first titled section? No —
  // a preamble before the first heading is its own section so it can be
  // targeted/reordered independently.
  return sections;
}

/**
 * Conservative target resolution. Order:
 *  1. unique exact section-title match
 *  2. unique section-title substring match
 *  3. unique block whose text contains the target as a substring
 * Everything else → not_found / ambiguous (caller must clarify, never guess).
 */
export function resolveTarget(
  content: string,
  target: string,
  blocks?: IdeaBlock[],
  sections?: IdeaSection[]
): TargetResolution {
  const needle = target.trim().toLowerCase();
  if (!needle) return { status: 'not_found' };

  const bs = blocks ?? parseIdeaBlocks(content);
  const ss = sections ?? buildIdeaSections(content, bs);

  const exactTitles = ss.filter((s) => s.title && s.title.trim().toLowerCase() === needle);
  if (exactTitles.length === 1) {
    return { status: 'resolved', kind: 'section', sectionIndex: ss.indexOf(exactTitles[0]) };
  }

  const partialTitles = ss.filter((s) => s.title && s.title.toLowerCase().includes(needle));
  if (partialTitles.length === 1) {
    return { status: 'resolved', kind: 'section', sectionIndex: ss.indexOf(partialTitles[0]) };
  }

  const containingBlocks = bs.filter((b) => b.text.toLowerCase().includes(needle));
  if (containingBlocks.length === 1) {
    return { status: 'resolved', kind: 'block', blockIndex: bs.indexOf(containingBlocks[0]) };
  }

  if (exactTitles.length + partialTitles.length + containingBlocks.length > 1) {
    return { status: 'ambiguous', matches: exactTitles.length + partialTitles.length + containingBlocks.length };
  }
  return { status: 'not_found' };
}

// ─── Seam helpers ────────────────────────────────────────────

/** Padding needed BEFORE inserted text so it starts after a blank line. */
function padBefore(left: string): string {
  if (left.length === 0) return '';
  if (/(^|\n)[ \t]*\n[ \t]*$/.test(left)) return '';
  if (/\n[ \t]*$/.test(left)) return '\n';
  return '\n\n';
}

/** Padding needed AFTER inserted text so the next block starts clean. */
function padAfter(right: string): string {
  if (right.length === 0) return '';
  if (/^[ \t]*\n[ \t]*\n/.test(right)) return '';
  if (/^[ \t]*\n/.test(right)) return '\n';
  return '\n\n';
}

function normalizeNewText(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function fail(code: IdeaEditErrorCode, detail?: string): IdeaEditResult {
  return { ok: false, code, detail };
}

function resolveSpanUnit(
  resolution: TargetResolution,
  blocks: IdeaBlock[],
  sections: IdeaSection[]
): { start: number; end: number } | null {
  if (resolution.status !== 'resolved') return null;
  if (resolution.kind === 'block' && resolution.blockIndex != null) {
    const b = blocks[resolution.blockIndex];
    return { start: b.start, end: b.end };
  }
  if (resolution.kind === 'section' && resolution.sectionIndex != null) {
    const s = sections[resolution.sectionIndex];
    return { start: s.start, end: s.end };
  }
  return null;
}

/**
 * Remove a span plus exactly one adjacent separator so the seam stays clean
 * without touching any other bytes.
 */
function spliceOut(content: string, start: number, end: number): string {
  let s = start;
  let e = end;
  const wsRe = /[ \t]/;
  // Consume following blank run (up to next non-blank char)
  let k = e;
  while (k < content.length && (content[k] === '\n' || wsRe.test(content[k]))) k++;
  if (k < content.length) {
    e = k;
  } else {
    // Span ends the document — consume the preceding separator instead
    let j = s;
    while (j > 0 && (content[j - 1] === '\n' || wsRe.test(content[j - 1]))) j--;
    s = j;
  }
  return content.slice(0, s) + content.slice(e);
}

// ─── Operations ──────────────────────────────────────────────

export interface InsertOptions {
  sectionTitle?: string;
  anchor?: string;
  position?: 'before' | 'after' | 'start' | 'end';
}

/** Append text at the end of the Idea, or inside a named section. */
export function applyAppend(content: string, text: string, opts?: InsertOptions): IdeaEditResult {
  const clean = normalizeNewText(text);
  if (!clean) return fail('EMPTY_CONTENT');

  let point: number;
  if (opts?.sectionTitle) {
    const res = resolveTarget(content, opts.sectionTitle);
    if (res.status === 'not_found') return fail('TARGET_NOT_FOUND', opts.sectionTitle);
    if (res.status === 'ambiguous') return fail('TARGET_AMBIGUOUS');
    const blocks = parseIdeaBlocks(content);
    const sections = buildIdeaSections(content, blocks);
    const span = resolveSpanUnit(res, blocks, sections);
    if (!span) return fail('TARGET_NOT_FOUND', opts.sectionTitle);
    point = span.end;
  } else {
    point = content.length;
  }
  const left = content.slice(0, point);
  const right = content.slice(point);
  return { ok: true, content: left + padBefore(left) + clean + padAfter(right) + right };
}

/** Insert text before/after an anchored target, or at start/end. */
export function applyInsert(content: string, text: string, opts: InsertOptions): IdeaEditResult {
  const clean = normalizeNewText(text);
  if (!clean) return fail('EMPTY_CONTENT');

  if (!opts.anchor) {
    if (opts.position === 'start') {
      const right = content.slice(0, content.search(/\S/) === -1 ? content.length : content.search(/\S/));
      const rest = content.slice(right.length);
      return { ok: true, content: clean + padAfter(rest) + rest };
    }
    if (opts.position === 'end' || !opts.position) return applyAppend(content, text);
    return fail('INVALID_POSITION', 'insert requires an anchor or position start|end');
  }

  const res = resolveTarget(content, opts.anchor);
  if (res.status === 'not_found') return fail('TARGET_NOT_FOUND', opts.anchor);
  if (res.status === 'ambiguous') return fail('TARGET_AMBIGUOUS');
  const blocks = parseIdeaBlocks(content);
  const sections = buildIdeaSections(content, blocks);
  const span = resolveSpanUnit(res, blocks, sections);
  if (!span) return fail('TARGET_NOT_FOUND', opts.anchor);

  const point = opts.position === 'before' ? span.start : span.end;
  const left = content.slice(0, point);
  const right = content.slice(point);
  return { ok: true, content: left + padBefore(left) + clean + padAfter(right) + right };
}

/**
 * Replace a target section's BODY (heading preserved) or a single block.
 * Refuses to rewrite the whole document implicitly: replacing the entire
 * untitled document is allowed only when it IS the resolved target and the
 * caller passes allowFullRewrite (used by the explicit ai_rewrite op).
 */
export function applyReplace(
  content: string,
  target: string,
  newText: string,
  options?: { allowFullRewrite?: boolean }
): IdeaEditResult {
  const clean = normalizeNewText(newText);
  if (!clean) return fail('EMPTY_CONTENT');

  const res = resolveTarget(content, target);
  if (res.status === 'not_found') return fail('TARGET_NOT_FOUND', target);
  if (res.status === 'ambiguous') return fail('TARGET_AMBIGUOUS');

  const blocks = parseIdeaBlocks(content);
  const sections = buildIdeaSections(content, blocks);

  if (res.kind === 'block' && res.blockIndex != null) {
    const b = blocks[res.blockIndex];
    return { ok: true, content: content.slice(0, b.start) + clean + content.slice(b.end) };
  }

  const section = sections[res.sectionIndex!];
  if (!section) return fail('TARGET_NOT_FOUND', target);

  // Whole-document replacement guard
  if (!section.hasHeading && sections.length === 1 && !options?.allowFullRewrite) {
    return fail('INVALID_POSITION', 'Full-document rewrite requires the explicit rewrite operation.');
  }

  if (!section.hasHeading) {
    return { ok: true, content: content.slice(0, section.start) + clean + content.slice(section.end) };
  }

  // Preserve the heading; replace only the body span.
  const bodyIdx = section.blockRange[0] + 1;
  const hasOwnBody = bodyIdx < section.blockRange[1]; // blockRange end is exclusive
  let bodyStart: number;
  let prefixSep = '';
  if (hasOwnBody) {
    // Left side already carries the heading's trailing blank-line separator.
    bodyStart = blocks[bodyIdx].start;
  } else {
    // Section had an empty body — introduce separation after the heading.
    bodyStart = section.end;
    prefixSep = '\n\n';
  }
  const left = content.slice(0, bodyStart);
  const right = content.slice(section.end);
  return { ok: true, content: `${left}${prefixSep}${clean}${padAfter(right)}${right}` };
}

/** Explicit full-content rewrite (highest guardrail op). */
export function applyFullRewrite(_current: string, newText: string): IdeaEditResult {
  const clean = normalizeNewText(newText);
  if (!clean) return fail('EMPTY_CONTENT');
  return { ok: true, content: clean };
}

/** Remove a target section (incl. heading) or a single block. */
export function applyRemove(content: string, target: string): IdeaEditResult {
  const res = resolveTarget(content, target);
  if (res.status === 'not_found') return fail('TARGET_NOT_FOUND', target);
  if (res.status === 'ambiguous') return fail('TARGET_AMBIGUOUS');

  const blocks = parseIdeaBlocks(content);
  const sections = buildIdeaSections(content, blocks);
  const span = resolveSpanUnit(res, blocks, sections);
  if (!span) return fail('TARGET_NOT_FOUND', target);

  const result = spliceOut(content, span.start, span.end);
  return { ok: true, content: result };
}

/** Move a target section/block before or after an anchor section/block. */
export function applyReorder(
  content: string,
  target: string,
  anchor: string,
  position: 'before' | 'after'
): IdeaEditResult {
  const targetRes = resolveTarget(content, target);
  if (targetRes.status === 'not_found') return fail('TARGET_NOT_FOUND', target);
  if (targetRes.status === 'ambiguous') return fail('TARGET_AMBIGUOUS');
  const anchorRes = resolveTarget(content, anchor);
  if (anchorRes.status === 'not_found') return fail('TARGET_NOT_FOUND', anchor);
  if (anchorRes.status === 'ambiguous') return fail('TARGET_AMBIGUOUS');

  const blocks = parseIdeaBlocks(content);
  const sections = buildIdeaSections(content, blocks);
  const targetSpan = resolveSpanUnit(targetRes, blocks, sections);
  const anchorSpan = resolveSpanUnit(anchorRes, blocks, sections);
  if (!targetSpan || !anchorSpan) return fail('TARGET_NOT_FOUND');

  if (
    targetSpan.start === anchorSpan.start ||
    (anchorSpan.start >= targetSpan.start && anchorSpan.end <= targetSpan.end)
  ) {
    return fail('SELF_REFERENCE');
  }

  const moved = content.slice(targetSpan.start, targetSpan.end);
  const withoutTarget = spliceOut(content, targetSpan.start, targetSpan.end);

  // Recompute the anchor position AFTER removal (offsets shifted).
  const blocks2 = parseIdeaBlocks(withoutTarget);
  const sections2 = buildIdeaSections(withoutTarget, blocks2);
  const anchorRes2 = resolveTarget(withoutTarget, anchor, blocks2, sections2);
  if (anchorRes2.status !== 'resolved') return fail('TARGET_NOT_FOUND', anchor);
  const anchorSpan2 = resolveSpanUnit(anchorRes2, blocks2, sections2);
  if (!anchorSpan2) return fail('TARGET_NOT_FOUND', anchor);

  const point = position === 'before' ? anchorSpan2.start : anchorSpan2.end;
  const left = withoutTarget.slice(0, point);
  const right = withoutTarget.slice(point);
  return { ok: true, content: left + padBefore(left) + moved + padAfter(right) + right };
}

/** Rename a heading. Refuses non-heading targets (never converts prose). */
export function applyRename(content: string, target: string, newTitle: string): IdeaEditResult {
  const cleanTitle = newTitle.trim();
  if (!cleanTitle) return fail('EMPTY_CONTENT');

  const res = resolveTarget(content, target);
  if (res.status === 'not_found') return fail('TARGET_NOT_FOUND', target);
  if (res.status === 'ambiguous') return fail('TARGET_AMBIGUOUS');

  const blocks = parseIdeaBlocks(content);
  if (res.kind !== 'block' && res.blockIndex == null) {
    // Resolve section → its heading block
    const sections = buildIdeaSections(content, blocks);
    const section = sections[res.sectionIndex!];
    if (!section?.hasHeading) return fail('NOT_A_HEADING', target);
    const hb = blocks[section.blockRange[0]];
    const hashes = '#'.repeat(hb.level ?? 2);
    return { ok: true, content: content.slice(0, hb.start) + `${hashes} ${cleanTitle}` + content.slice(hb.end) };
  }

  const b = blocks[res.blockIndex!];
  if (b.kind !== 'heading') return fail('NOT_A_HEADING', target);
  const hashes = '#'.repeat(b.level ?? 2);
  return { ok: true, content: content.slice(0, b.start) + `${hashes} ${cleanTitle}` + content.slice(b.end) };
}

/** Create a new section (heading + body), optionally positioned by anchor. */
export function applyCreateSection(
  content: string,
  title: string,
  bodyText: string,
  opts?: InsertOptions
): IdeaEditResult {
  const cleanTitle = title.trim();
  if (!cleanTitle) return fail('EMPTY_CONTENT');
  const cleanBody = normalizeNewText(bodyText);

  // Match existing heading style when present; default to ##.
  const blocks = parseIdeaBlocks(content);
  const firstHeading = blocks.find((b) => b.kind === 'heading');
  const hashes = '#'.repeat(firstHeading?.level ?? 2);

  const composed = cleanBody ? `${hashes} ${cleanTitle}\n\n${cleanBody}` : `${hashes} ${cleanTitle}`;
  return applyInsert(content, composed, { anchor: opts?.anchor, position: opts?.position ?? (opts?.anchor ? 'after' : 'end') });
}

/** Compact outline for AI context / UI structure hints. Never mutates. */
export function getIdeaOutline(content: string): Array<{ title: string; kind: string; preview: string }> {
  const blocks = parseIdeaBlocks(content);
  return blocks.slice(0, 40).map((b) => ({
    title: b.kind === 'heading' ? b.headingText || '' : '',
    kind: b.kind,
    preview: b.text.slice(0, 120),
  }));
}
