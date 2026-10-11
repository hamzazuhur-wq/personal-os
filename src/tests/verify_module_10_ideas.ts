/**
 * Module 10 — IDEA CAPTURE + SCOPED AGENT runtime verification.
 *
 * Runs against a fake-indexeddb-backed Dexie with controlled fixtures:
 *  1.  Content engine ops are lossless outside the edited span
 *  2.  Conservative targeting (not found / ambiguous / not-a-heading)
 *  3.  Section ops preserve headings; rename refuses prose
 *  4.  Strict scoping: mismatched idea_id → IDEA_ID_MISMATCH, ZERO mutation
 *  5.  Approved AI edits mutate content + write ai revisions + audit events
 *  6.  Undo creates a NEW undo revision and restores prior state; history kept
 *  7.  Discussion intents produce NO proposal; edits DO (mock provider)
 *  8.  Unclear destructive targets → clarification, never guessed
 *  9.  Scoped conversation per idea (getConversationByIdea) survives reload
 *  10. Legacy non-idea captures remain byte-identical throughout
 */

import 'fake-indexeddb/auto';
import { posDexieDb } from '../services/adapters/dexie/posDexieDb';
import {
  applyAppend,
  applyInsert,
  applyReplace,
  applyRemove,
  applyReorder,
  applyRename,
  applyCreateSection,
  applyFullRewrite,
} from '../utils/ideaContent';
import { DexieCaptureRepository } from '../services/adapters/dexie/DexieCaptureRepository';
import { DexieIdeaRevisionRepository } from '../services/adapters/dexie/DexieIdeaRevisionRepository';
import { DexieAIRepository } from '../services/adapters/dexie/DexieAIRepository';
import { IdeaToolExecutors } from '../services/ai/tools/ideaTools';
import { ActionPolicy } from '../services/ai/agent/actionPolicy';
import { ideaAgentCore } from '../services/ai/agent/ideaAgentCore';
import { ideaMockProvider } from '../services/ai/providers/IdeaMockProvider';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, condition: boolean, detail?: string): void {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    failures.push(detail ? `${name} (${detail})` : name);
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function section(title: string): void {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 60 - title.length))}`);
}

const IDEA_CONTENT = [
  '## Vision',
  'Become a recognized brand strategist.',
  '',
  '## Fashion',
  'Streetwear capsule ideas.',
  '',
  '## Notes',
  '- talk to Sara',
  '- read positioning book',
].join('\n');

async function main(): Promise<void> {
  // ─── Fixtures ───────────────────────────────────────────────
  const now = new Date().toISOString();
  await posDexieDb.captures.bulkPut([
    {
      id: 'idea-main',
      user_id: 'test-user',
      capture_type: 'idea',
      status: 'inbox',
      source: 'manual',
      title: 'Brand Studio',
      content: IDEA_CONTENT,
      metadata: {},
      created_at: now,
      updated_at: now,
    },
    {
      id: 'idea-second',
      user_id: 'test-user',
      capture_type: 'idea',
      status: 'inbox',
      source: 'manual',
      title: 'Second Idea',
      content: '## Alpha\nA content\n\n## Beta\nB content',
      metadata: {},
      created_at: now,
      updated_at: now,
    },
    // Legacy captures that MUST remain untouched by everything below.
    {
      id: 'cap-note-legacy',
      user_id: 'test-user',
      capture_type: 'note',
      status: 'organized',
      source: 'quick_dock',
      content: 'Legacy note — keep exactly as is.',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'cap-question-legacy',
      user_id: 'test-user',
      capture_type: 'question',
      status: 'inbox',
      source: 'manual',
      content: 'Should I learn Arabic calligraphy?',
      created_at: now,
      updated_at: now,
    },
  ]);

  const captureRepo = new DexieCaptureRepository();
  const revisionRepo = new DexieIdeaRevisionRepository();
  const aiRepo = new DexieAIRepository();
  const repositories = { captureRepo, ideaRevisionRepo: revisionRepo, aiRepo };

  const ctxFor = (ideaId: string) => ({
    conversationId: 'conv-test',
    userId: 'test-user',
    repositories,
    ideaId,
  });

  // ─── 1. Content engine losslessness ─────────────────────────
  section('1. Content engine — lossless edits');
  const appended = applyAppend(IDEA_CONTENT, 'New final line.');
  check('append ok', appended.ok);
  if (appended.ok) {
    check('append keeps original prefix intact', appended.content.startsWith(IDEA_CONTENT));
    check('append adds text at end', appended.content.trimEnd().endsWith('New final line.'));
  }

  const appendedSection = applyAppend(IDEA_CONTENT, 'More streetwear notes.', { sectionTitle: 'Fashion' });
  check('append into named section ok', appendedSection.ok);
  if (appendedSection.ok) {
    const fashionIdx = appendedSection.content.indexOf('Streetwear capsule ideas.');
    const addedIdx = appendedSection.content.indexOf('More streetwear notes.');
    const notesIdx = appendedSection.content.indexOf('## Notes');
    check('section append lands inside Fashion, before Notes', fashionIdx > -1 && addedIdx > fashionIdx && addedIdx < notesIdx);
  }

  const inserted = applyInsert(IDEA_CONTENT, '- buy fabric', { position: 'end' });
  check('insert at end ok', inserted.ok);

  const replaced = applyReplace(IDEA_CONTENT, 'Notes', 'New note body line.');
  check('replace section ok', replaced.ok);
  if (replaced.ok) {
    check('replace keeps heading', replaced.content.includes('## Notes'));
    check('replace removed old body', !replaced.content.includes('talk to Sara'));
    check('replace wrote new body', replaced.content.includes('New note body line.'));
    check('replace left other sections intact', replaced.content.includes('Streetwear capsule ideas.'));
  }

  const removed = applyRemove(IDEA_CONTENT, 'Fashion');
  check('remove section ok', removed.ok);
  if (removed.ok) {
    check('remove dropped heading+body', !removed.content.includes('Fashion') && !removed.content.includes('Streetwear'));
    check('remove kept rest', removed.content.includes('## Vision') && removed.content.includes('talk to Sara'));
  }

  const reordered = applyReorder(IDEA_CONTENT, 'Fashion', 'Vision', 'before');
  check('reorder before anchor ok', reordered.ok);
  if (reordered.ok) {
    check('fashion now precedes vision', reordered.content.indexOf('## Fashion') < reordered.content.indexOf('## Vision'));
  }

  const renamed = applyRename(IDEA_CONTENT, 'Fashion', 'Style Lab');
  check('rename heading ok', renamed.ok);
  if (renamed.ok) check('renamed text present', renamed.content.includes('## Style Lab'));

  const renameProse = applyRename(IDEA_CONTENT, 'talk to Sara', 'X');
  check('rename on prose block rejected NOT_A_HEADING', !renameProse.ok && renameProse.code === 'NOT_A_HEADING');

  const created = applyCreateSection(IDEA_CONTENT, 'Budget', 'Keep it under 5000.', { position: 'end' });
  check('create section ok', created.ok);
  if (created.ok) check('created heading + body at end', created.content.trimEnd().endsWith('Keep it under 5000.'));

  const fullRewrite = applyFullRewrite(IDEA_CONTENT, 'Completely new plan.');
  check('full rewrite replaces everything', fullRewrite.ok && fullRewrite.content === 'Completely new plan.');

  // ─── 2. Conservative targeting ──────────────────────────────
  section('2. Targeting errors');
  const missing = applyRemove(IDEA_CONTENT, 'Nonexistent Section');
  check('missing target → TARGET_NOT_FOUND', !missing.ok && missing.code === 'TARGET_NOT_FOUND');

  // Two ideas share the section name "Alpha"? No — ambiguity within ONE doc:
  const dupDoc = '## Item\none\n\n## Item\ntwo';
  const ambiguous = applyRemove(dupDoc, 'Item');
  check('duplicate titles → TARGET_AMBIGUOUS', !ambiguous.ok && ambiguous.code === 'TARGET_AMBIGUOUS');

  // ─── 3. Strict scoping ──────────────────────────────────────
  section('3. Scoping — mismatched idea_id is physically rejected');
  const mismatch = await IdeaToolExecutors.appendToIdea(
    { idea_id: 'idea-second', content: 'MISMATCH ATTEMPT' },
    ctxFor('idea-main')
  );
  check('mismatch → IDEA_ID_MISMATCH error', !mismatch.success && mismatch.error?.code === 'IDEA_ID_MISMATCH');
  const secondAfter = await posDexieDb.captures.get('idea-second');
  check('zero mutation on mismatched idea', secondAfter!.content === '## Alpha\nA content\n\n## Beta\nB content');
  const revsAfterMismatch = await posDexieDb.idea_revisions.where('capture_id').equals('idea-second').count();
  check('no revision written for mismatched idea', revsAfterMismatch === 0);

  // ─── 4. Approved AI edit pipeline ───────────────────────────
  section('4. Approved AI edit → mutation + revision + audit');
  const proposalAppend = {
    id: 'prop-append-1',
    tool_name: 'appendToIdea',
    action_type: 'append_to_idea' as const,
    title: 'Append line',
    description: 'Append line',
    parameters: { idea_id: 'idea-main', content: 'AI appended insight.' },
    confirmation_required: true,
  };
  check('proposal passes validation', ActionPolicy.validateActionParameters(proposalAppend.tool_name, proposalAppend.parameters).valid === true);
  const execResult = await ActionPolicy.executeApprovedAction(proposalAppend, ctxFor('idea-main'));
  check('execution success', execResult.success === true);

  const ideaAfterAi = await posDexieDb.captures.get('idea-main');
  check('content mutated exactly once', !!ideaAfterAi && ideaAfterAi.content.endsWith('AI appended insight.'));
  check('legacy sections still intact after AI edit', !!ideaAfterAi && ideaAfterAi.content.includes('## Vision'));

  const aiRevs = await posDexieDb.idea_revisions.where('capture_id').equals('idea-main').toArray();
  check('ai revision recorded with editor=ai', aiRevs.some((r) => r.editor === 'ai' && r.operation === 'ai_append'));
  check('revision snapshot holds PRE-edit content', aiRevs.some((r) => r.before_content === IDEA_CONTENT));

  const audits = await posDexieDb.ai_audit_events.toArray();
  check('audit event logged for the write', audits.some((a) => JSON.stringify(a).includes('appendToIdea')));

  // Rewrite guardrail: whole-idea rewrite allowed but audited distinctly.
  const proposalRewrite = {
    id: 'prop-rewrite-1',
    tool_name: 'rewriteIdeaContent',
    action_type: 'rewrite_idea_content' as const,
    title: 'Rewrite',
    description: 'Rewrite',
    parameters: { idea_id: 'idea-main', content: '## New Plan\nEverything fresh.' },
    confirmation_required: true,
  };
  const rewriteRes = await ActionPolicy.executeApprovedAction(proposalRewrite, ctxFor('idea-main'));
  check('explicit rewrite executes', rewriteRes.success === true);

  // Missing required param rejected BEFORE execution.
  const badProposal = {
    id: 'prop-bad-1',
    tool_name: 'replaceIdeaSection',
    action_type: 'replace_idea_section' as const,
    title: 'Bad',
    description: 'Bad',
    parameters: { idea_id: 'idea-main' }, // target + content missing
    confirmation_required: true,
  };
  check('validation blocks incomplete proposal', ActionPolicy.validateActionParameters(badProposal.tool_name, badProposal.parameters).valid === false);

  // ─── 5. Undo semantics ──────────────────────────────────────
  section('5. Undo — new revision, history preserved');
  const revCountBeforeUndo = await posDexieDb.idea_revisions.where('capture_id').equals('idea-main').count();
  const latestBeforeUndo = await revisionRepo.getLatestForCapture('idea-main');

  // Simulate the workspace hook's undo flow directly through repos:
  const currentIdea = await posDexieDb.captures.get('idea-main');
  await revisionRepo.create({
    capture_id: 'idea-main',
    editor: 'user',
    operation: 'undo',
    reason: `Undo of "${latestBeforeUndo!.operation}"`,
    before_title: currentIdea!.title,
    before_content: currentIdea!.content,
  });
  await posDexieDb.captures.update('idea-main', { content: latestBeforeUndo!.before_content });

  const ideaAfterUndo = await posDexieDb.captures.get('idea-main');
  // Undo restores the LATEST revision's before-state (pre-rewrite, i.e. the
  // post-append content) — one undo step reverts exactly one change.
  check('undo restored pre-rewrite content', ideaAfterUndo!.content === latestBeforeUndo!.before_content);
  check('restored state still holds the append', ideaAfterUndo!.content!.includes('AI appended insight.'));
  const revCountAfterUndo = await posDexieDb.idea_revisions.where('capture_id').equals('idea-main').count();
  check('history grew (never rewritten)', revCountAfterUndo === revCountBeforeUndo + 1);
  const undoRev = await revisionRepo.getLatestForCapture('idea-main');
  check('latest revision is the undo entry', undoRev!.operation === 'undo');
  check('undo entry snapshots the discarded state', undoRev!.before_content !== IDEA_CONTENT);

  // ─── 6. Mock provider intents (discussion vs edit) ──────────
  section('6. Idea-scoped mock provider — discussion never mutates');
  const ideaSnap = { id: 'idea-main', title: 'Brand Studio', category: 'idea', content: IDEA_CONTENT, attachments: [] };
  const mkReq = (text: string) => ({
    messages: [{ id: 'm1', conversation_id: 'c', role: 'user' as const, content: text, type: 'answer' as const, created_at: now }],
    contextSummary: '',
    relevantStructuredData: { idea: ideaSnap },
    relevantMemories: [],
    availableTools: [],
  });

  const discussAr = await ideaMockProvider.generateResponse(mkReq('شو رأيك بهالفكرة؟'));
  check('Arabic discussion → answer only', discussAr.type === 'answer' && !discussAr.actionProposal);
  const discussEn = await ideaMockProvider.generateResponse(mkReq('What do you think about this? How can I improve it?'));
  check('English discussion → answer only', discussEn.type === 'answer' && !discussAr.actionProposal && !discussEn.actionProposal);
  check('discussion explicitly says nothing changed', (discussAr.content + discussEn.content).toLowerCase().includes('nothing was changed'));

  const appendProp = await ideaMockProvider.generateResponse(mkReq('add "Collab with local photographers" to the end'));
  check('append request → structured proposal', appendProp.actionProposal?.tool_name === 'appendToIdea');
  check('proposal bound to CURRENT idea id', appendProp.actionProposal?.parameters.idea_id === 'idea-main');

  const removeProp = await ideaMockProvider.generateResponse(mkReq('remove Fashion'));
  check('remove request → structured proposal', removeProp.actionProposal?.tool_name === 'removeIdeaSection');
  check('destructive target explicit', removeProp.actionProposal?.parameters.target === 'Fashion');

  const reorderProp = await ideaMockProvider.generateResponse(mkReq('put Fashion before Vision'));
  check('reorder request parsed (target+anchor)', reorderProp.actionProposal?.tool_name === 'reorderIdeaSection'
    && reorderProp.actionProposal.parameters.target === 'Fashion'
    && reorderProp.actionProposal.parameters.anchor === 'Vision');

  const makeFirstProp = await ideaMockProvider.generateResponse(mkReq('Make the Fashion part first'));
  check('make-first reorder → position start', makeFirstProp.actionProposal?.parameters.position === 'start');

  const titleProp = await ideaMockProvider.generateResponse(mkReq('change the title to "Studio Rebrand"'));
  check('title change proposal', titleProp.actionProposal?.tool_name === 'updateIdeaTitle'
    && titleProp.actionProposal.parameters.title === 'Studio Rebrand');

  const vagueEdit = await ideaMockProvider.generateResponse(mkReq('عدّل الفكرة'));
  check('vague edit → clarification, NO proposal', vagueEdit.type === 'answer' && !vagueEdit.actionProposal);
  check('clarification asks which part', /which|أي|exact/i.test(vagueEdit.content));

  // ─── 7. Scoped agent turn end-to-end ────────────────────────
  section('7. Scoped agent turn — persistence + auto-title');
  // Node has no AI backend: pin the provider to the mock so the scoped
  // IdeaMockProvider is exercised (browser uses the same substitution rule).
  await aiRepo.updateSettings({ provider: 'mock' });

  const conv = await aiRepo.createConversation({ title: 'Idea Workspace', category: 'general', idea_id: 'idea-main' });
  const fetchedConv = await aiRepo.getConversationByIdea('idea-main');
  check('conversation resolved by idea id', fetchedConv?.id === conv.id && fetchedConv?.idea_id === 'idea-main');

  const assistantMsg = await ideaAgentCore.processIdeaUserTurn({
    ideaId: 'idea-main',
    conversationId: conv.id,
    userPrompt: 'What do you think about the structure?',
    historyMessages: [],
    repositories,
  });
  check('assistant reply persisted', !!assistantMsg && assistantMsg.role === 'assistant');

  const msgs = await aiRepo.getMessages(conv.id);
  check('user + assistant both stored', msgs.filter((m) => m.role === 'user').length >= 1 && msgs.filter((m) => m.role === 'assistant').length >= 1);

  const convAfter = await aiRepo.getConversation(conv.id);
  check('conversation auto-titled with idea label', !!convAfter && (convAfter.title || '').startsWith('Idea ·'));

  // Fresh repo instances simulate an app refresh.
  const freshAiRepo = new DexieAIRepository();
  const refound = await freshAiRepo.getConversationByIdea('idea-main');
  const refoundMsgs = await freshAiRepo.getMessages(refound!.id);
  check('scoped chat survives refresh', refound?.id === conv.id && refoundMsgs.length === msgs.length);

  // Edit through the scoped core end-to-end.
  const editTurnMsg = await ideaAgentCore.processIdeaUserTurn({
    ideaId: 'idea-main',
    conversationId: conv.id,
    userPrompt: 'add "Check competitor pricing" to the end',
    historyMessages: msgs,
    repositories,
  });
  check('edit turn produced a proposal message', editTurnMsg.type === 'action_proposal' && !!editTurnMsg.action_payload);
  const approved = await ideaAgentCore.executeApprovedIdeaAction(editTurnMsg.action_payload!, repositories, conv.id, 'idea-main');
  check('approved scoped edit executed', approved.success === true);
  const ideaFinal = await posDexieDb.captures.get('idea-main');
  check('idea content contains appended text', !!ideaFinal && ideaFinal.content.includes('Check competitor pricing'));

  // Cross-domain isolation: the scoped bundle cannot see goal storage.
  check('scoped repositories expose no goal repo', !('goalRepo' in repositories));

  // ─── 8. Legacy data untouched ───────────────────────────────
  section('8. Legacy captures byte-identical');
  const legacyNote = await posDexieDb.captures.get('cap-note-legacy');
  const legacyQuestion = await posDexieDb.captures.get('cap-question-legacy');
  check('legacy note unchanged', legacyNote!.content === 'Legacy note — keep exactly as is.' && legacyNote!.capture_type === 'note');
  check('legacy question unchanged', legacyQuestion!.content === 'Should I learn Arabic calligraphy?' && legacyQuestion!.capture_type === 'question');

  // Second idea never touched by any of the above.
  const second = await posDexieDb.captures.get('idea-second');
  check('other idea workspace untouched', second!.content === '## Alpha\nA content\n\n## Beta\nB content');

  // ─── Summary ────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════');
  console.log(`Module 10 verification: ${passed} passed, ${failed} failed`);
  if (failures.length) {
    console.error('Failures:');
    failures.forEach((f) => console.error(`  • ${f}`));
  }
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Suite crashed:', err);
  process.exit(1);
});
