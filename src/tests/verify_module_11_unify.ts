/**
 * Module 11 — UNIFIED IDEA CAPTURE runtime verification.
 *
 *  1. Category seeding: exactly the four defaults, seeded once.
 *  2. Category CRUD: create (dupes rejected), rename, archive, restore.
 *     Archived categories leave selectors but remain resolvable.
 *     No hard delete exists.
 *  3. New captures are ALWAYS capture_type 'idea' + metadata.idea_category_id.
 *  4. Legacy captures stay byte-identical through every category operation.
 *  5. One-call organizer: deterministic local results; empty → error.
 *  6. Backup roundtrip carries idea_categories.
 *  7. Static wiring: single composer, /quick-capture alias → /ideas,
 *     old Quick Capture implementation files gone.
 */

import 'fake-indexeddb/auto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { posDexieDb } from '../services/adapters/dexie/posDexieDb';
import { DexieCaptureRepository } from '../services/adapters/dexie/DexieCaptureRepository';
import { DexieIdeaCategoryRepository } from '../services/adapters/dexie/DexieIdeaCategoryRepository';
import { DEFAULT_IDEA_CATEGORY_NAMES } from '../types/ideaCategory.types';
import { organizeTranscriptLocally, organizeIdeaTranscript } from '../services/ai/idea/ideaOrganizer';
import { buildIdeaSystemContext } from '../services/ai/agent/ideaAgentCore';
import { categoryLabel } from '../hooks/useIdeaCategories';
import { ExportService } from '../services/backup/exportService';
import { DexieAIRepository } from '../services/adapters/dexie/DexieAIRepository';
import { personalAgentCore } from '../services/ai/agent/agentCore';

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

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

async function main(): Promise<void> {
  const catRepo = new DexieIdeaCategoryRepository();
  const captureRepo = new DexieCaptureRepository();

  // ─── 1. Seeding ─────────────────────────────────────────────
  section('1. Default category seeding');
  const seeded = await catRepo.getActive();
  check('exactly four default categories', seeded.length === 4);
  const seededNames = seeded.map((c) => c.name);
  check(
    'default names match spec',
    DEFAULT_IDEA_CATEGORY_NAMES.every((n) => seededNames.includes(n)),
    seededNames.join(',')
  );
  check('defaults are active', seeded.every((c) => c.status === 'active'));
  await catRepo.getAll();
  check('second read does not re-seed', (await catRepo.getAll()).length === 4);

  // ─── 2. Category CRUD ───────────────────────────────────────
  section('2. Category CRUD (archive-only lifecycle)');
  const created = await catRepo.create({ name: 'Startup Pitches' });
  check('create returns active category', created.status === 'active' && created.name === 'Startup Pitches');
  try {
    await catRepo.create({ name: 'startup pitches' });
    check('duplicate (case-insensitive) rejected', false);
  } catch {
    check('duplicate (case-insensitive) rejected', true);
  }
  try {
    await catRepo.create({ name: '   ' });
    check('empty name rejected', false);
  } catch {
    check('empty name rejected', true);
  }
  const renamed = await catRepo.update(created.id, { name: 'Pitch Drafts' });
  check('rename works', renamed.name === 'Pitch Drafts');
  const archived = await catRepo.update(created.id, { status: 'archived' });
  check('archive keeps the record', archived.status === 'archived');
  const activeAfterArchive = await catRepo.getActive();
  check('archived category hidden from selectors', !activeAfterArchive.some((c) => c.id === created.id));
  check('archived category still listed in management', (await catRepo.getAll()).some((c) => c.id === created.id));
  check('archived category resolvable by id', (await catRepo.getById(created.id))?.name === 'Pitch Drafts');
  const restored = await catRepo.update(created.id, { status: 'active' });
  check('restore brings it back', restored.status === 'active');

  // Delete rules:
  //  - Referenced categories cannot be deleted (must archive).
  //  - Unreferenced categories can be permanently removed.
  const referencedCat = await catRepo.create({ name: 'Referenced' });
  await captureRepo.create({
    content: 'Ref-1',
    capture_type: 'idea',
    source: 'manual',
    metadata: { idea_category_id: referencedCat.id },
  });
  const refsCount = await catRepo.countReferences(referencedCat.id);
  check('countReferences reports live captures', refsCount >= 1);
  let blocked = false;
  try {
    await catRepo.remove(referencedCat.id);
  } catch (err: any) {
    blocked = /used by \d+ idea/i.test(err.message ?? '');
  }
  check('delete blocked when references > 0', blocked);
  check('blocked delete did not remove the row', (await catRepo.getById(referencedCat.id)) !== null);

  const unusedCat = await catRepo.create({ name: 'Unused' });
  await catRepo.remove(unusedCat.id);
  check('delete allowed when references === 0', (await catRepo.getById(unusedCat.id)) === null);

  // Concurrency safety: 10 parallel seed paths → exactly four defaults
  // (plus anything created above).
  await Promise.all(Array.from({ length: 10 }, () => catRepo.getActive()));
  const finalAll = await catRepo.getAll();
  check(
    'concurrent seeds do not produce duplicate rows',
    finalAll.filter((c) => c.id.startsWith('cat-default-')).length === 4,
    `${finalAll.length} total, ${finalAll.filter((c) => c.id.startsWith('cat-default-')).length} default-id rows`
  );
  // Simulate legacy duplicates: insert two rows with the same normalized
  // name but different random ids — the next ensureSeeded pass must
  // collapse them and remap references.
  await posDexieDb.idea_categories.add({
    id: 'dup-a',
    name: 'General Idea',
    status: 'active',
    sort_order: 99,
    created_at: '2020-01-01T00:00:00.000Z',
  });
  await posDexieDb.idea_categories.add({
    id: 'dup-b',
    name: 'General Idea',
    status: 'active',
    sort_order: 100,
    created_at: '2020-01-02T00:00:00.000Z',
  });
  // Capture referencing the to-be-removed duplicate.
  await captureRepo.create({
    content: 'Refers to duplicate',
    capture_type: 'idea',
    source: 'manual',
    metadata: { idea_category_id: 'dup-b' },
  });
  await catRepo.getAll();
  const afterDedupe = await posDexieDb.idea_categories.toArray();
  const generalRows = afterDedupe.filter((c) => c.name === 'General Idea');
  check('duplicate rows collapsed to one canonical record', generalRows.length === 1, `found ${generalRows.length}`);
  const refAfterRemap = await posDexieDb.captures.toArray();
  const remapped = refAfterRemap.find((c) => c.content === 'Refers to duplicate');
  check(
    'capture referencing a duplicate is remapped to canonical',
    typeof (remapped?.metadata as any)?.idea_category_id === 'string' &&
      (remapped!.metadata as any).idea_category_id !== 'dup-b',
  );

  // ─── 3. New captures are always 'idea' ──────────────────────
  section('3. New capture contract');
  const cat = (await catRepo.getActive()).find((c) => c.name === 'General Idea')!;
  const newIdea = await captureRepo.create({
    content: 'Launch a tiny newsletter studio\nWith a weekly craft section.',
    title: 'Newsletter studio',
    capture_type: 'idea',
    source: 'manual',
    metadata: {
      idea_category_id: cat.id,
      attachments: [{ id: 'a1', type: 'link', url: 'https://example.com/x', created_at: new Date().toISOString() }],
    },
  });
  check('new idea persisted as capture_type idea', newIdea.capture_type === 'idea');
  check('idea category id stored in metadata', (newIdea.metadata as any)?.idea_category_id === cat.id);
  check('title persisted', newIdea.title === 'Newsletter studio');
  check('attachments persisted', Array.isArray((newIdea.metadata as any)?.attachments) && ((newIdea.metadata as any).attachments.length === 1));

  // ─── 4. Legacy captures untouched ───────────────────────────
  section('4. Legacy data integrity');
  await posDexieDb.captures.bulkPut([
    {
      id: 'legacy-task-1',
      user_id: 'u',
      capture_type: 'task',
      status: 'inbox',
      source: 'manual',
      content: 'Legacy task record',
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    },
    {
      id: 'legacy-question-1',
      user_id: 'u',
      capture_type: 'question',
      status: 'inbox',
      source: 'manual',
      content: 'Legacy question record',
      created_at: '2025-01-02T00:00:00.000Z',
      updated_at: '2025-01-02T00:00:00.000Z',
    },
  ] as any);
  const before = {
    task: await posDexieDb.captures.get('legacy-task-1'),
    question: await posDexieDb.captures.get('legacy-question-1'),
  };
  await catRepo.create({ name: 'Temp Category' });
  const tempCat = (await catRepo.getActive()).find((c) => c.name === 'Temp Category')!;
  await catRepo.update(tempCat.id, { status: 'archived' });
  const after = {
    task: await posDexieDb.captures.get('legacy-task-1'),
    question: await posDexieDb.captures.get('legacy-question-1'),
  };
  check('legacy task byte-identical', JSON.stringify(before.task) === JSON.stringify(after.task));
  check('legacy question byte-identical', JSON.stringify(before.question) === JSON.stringify(after.question));
  check('legacy capture_type not rewritten', after.task!.capture_type === 'task' && after.question!.capture_type === 'question');
  check('legacy records gained no idea_category_id', !('idea_category_id' in ((after.task!.metadata as any) ?? {})));
  check(
    'categoryLabel: no id → null',
    categoryLabel(undefined, await catRepo.getAll()) === null
  );
  check('categoryLabel: unknown id → Uncategorized', categoryLabel('missing-id', await catRepo.getAll()) === 'Uncategorized');

  // ─── 5. One-call organizer (deterministic local path) ───────
  section('5. AI Voice organizer');
  const cats = await catRepo.getActive();
  const transcript =
    'I want to build a business around handmade candles. Customers keep asking for seasonal scents. Maybe a subscription box could work.';
  const organized = organizeTranscriptLocally(transcript, cats);
  check('title is concise', organized.title.length > 0 && organized.title.length <= 90);
  check('title strips filler words', !/^(i want|so|basically)\b/i.test(organized.title));
  check('body preserves full transcript', organized.body.includes(transcript.replace(/\s+/g, ' ').trim()));
  check('body contains Key Points section', organized.body.includes('## Key Points'));
  check('key points extracted (1–6)', organized.key_points.length >= 1 && organized.key_points.length <= 6);
  check('business keyword → Business Idea suggestion', organized.suggested_category_name === 'Business Idea');
  check('suggestion maps to ACTIVE category id', organized.suggested_category_id === cats.find((c) => c.name === 'Business Idea')!.id);

  const neutral = organizeTranscriptLocally('just a simple wandering thought about nothing in particular', cats);
  check('no keyword → no category suggestion', neutral.suggested_category_id === null && neutral.suggested_category_name === null);

  try {
    await organizeIdeaTranscript({ transcript: '   ', activeCategories: cats });
    check('empty transcript rejected', false);
  } catch (err: any) {
    check('empty transcript rejected', err.message === 'Nothing recorded.');
  }
  // Node has no AI backend: pin the provider to mock so the organizer
  // takes the deterministic local path (same substitution rule the app uses).
  const aiRepo = new DexieAIRepository();
  await aiRepo.updateSettings({ provider: 'mock' });
  await personalAgentCore.configureFromSettings((await aiRepo.getSettings())!, { aiRepo });
  const livePath = await organizeIdeaTranscript({ transcript, activeCategories: cats });
  check('organizer returns structured idea (mock provider path)', livePath.organized_by_ai === true && livePath.body.length > 0);
  check('organizer attaches category suggestion', livePath.suggested_category_name === 'Business Idea');

  // ─── 5.5. AI context: embedded files never leak into the prompt ──
  section('5.5. AI context data-URL redaction');
  const dummyIdea = {
    id: 'ai-ctx',
    user_id: 'u',
    capture_type: 'idea' as const,
    status: 'inbox' as const,
    source: 'manual' as const,
    title: 'Ctx check',
    content: '## Body\nShort',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const base64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABAQAAAAA3bvkkAAAACklEQVR4nGNiAAAAAgAAnQBzT4m3AAAAAElFTkSuQmCC';
  const context = buildIdeaSystemContext(dummyIdea as any, [
    { type: 'image', url: base64, label: 'sketch.png' },
    { type: 'link', url: 'https://example.com/article', label: 'Reference' },
  ]);
  check('data URL payload not leaked into context', !context.includes(base64));
  check('embedded image label is redacted', /\[embedded image\] sketch\.png/.test(context));
  check('regular link preserved', /\[link\] Reference/.test(context));

  // ─── 6. Backup roundtrip ────────────────────────────────────
  section('6. Backup includes idea_categories');
  const backup = await ExportService.exportAllData();
  check('export contains idea_categories array', Array.isArray(backup.data.idea_categories) && (backup.data.idea_categories as any[]).length >= 4);
  const allCats = await catRepo.getAll();
  check('every category exported', (backup.data.idea_categories as any[]).length === allCats.length);
  const importResult = await ExportService.importData(backup);
  check('import succeeds', importResult.success === true);
  check('categories survive roundtrip', (await catRepo.getAll()).length === allCats.length);

  // ─── 7. Static wiring ───────────────────────────────────────
  section('7. Product wiring (single system)');
  const appSrc = fs.readFileSync(path.join(ROOT, 'src', 'app', 'App.tsx'), 'utf8');
  check('/quick-capture maps to /ideas', appSrc.includes("'/quick-capture': '/ideas'"));
  check('URL normalization effect exists', appSrc.includes("window.history.replaceState({}, '', '/ideas')"));
  check('QuickCapturePage no longer rendered', !appSrc.includes('QuickCapturePage'));

  const navSrc = fs.readFileSync(path.join(ROOT, 'src', 'constants', 'navigation.ts'), 'utf8');
  check("nav exposes '/ideas' as Idea Capture", navSrc.includes("id: '/ideas'") && navSrc.includes('Idea Capture'));
  check('nav uses Lightbulb icon', navSrc.includes("iconName: 'Lightbulb'"));

  const qcDir = path.join(ROOT, 'src', 'features', 'quick-capture');
  check('old Quick Capture implementation removed', !fs.existsSync(qcDir));

  const composerSrc = fs.readFileSync(path.join(ROOT, 'src', 'features', 'idea-capture', 'IdeaComposer.tsx'), 'utf8');
  const organizerCalls = (composerSrc.match(/organizeIdeaTranscript\(/g) ?? []).length;
  check('exactly one organizer call site', organizerCalls === 1);
  check("composer always saves capture_type 'idea'", composerSrc.includes("capture_type: 'idea'") && !composerSrc.includes('capture_type: selectedType'));
  check('composer supports TEXT + VOICE + AI VOICE entries', composerSrc.includes('composer-voice-btn') && composerSrc.includes('composer-ai-voice-btn') && composerSrc.includes('idea-composer-input'));

  const modalSrc = fs.readFileSync(path.join(ROOT, 'src', 'features', 'idea-capture', 'IdeaComposerModal.tsx'), 'utf8');
  check('modal shell reuses the same composer', modalSrc.includes('<IdeaComposer'));

  const settingsSrc = fs.readFileSync(path.join(ROOT, 'src', 'features', 'settings', 'SettingsPage.tsx'), 'utf8');
  check('Settings hosts category management', settingsSrc.includes('IdeaCategoriesSettings'));

  const dashboardSrc = fs.readFileSync(path.join(ROOT, 'src', 'features', 'dashboard', 'DashboardPage.tsx'), 'utf8');
  check('Home has + Idea Capture shortcut', dashboardSrc.includes('+ Idea Capture'));
  check('Home has + Add Task shortcut', dashboardSrc.includes('+ Add Task'));
  check('Home uses the idea composer modal', dashboardSrc.includes('IdeaComposerModal'));

  // ─── 8. Voice + category UX corrections ─────────────────────
  section('8. Corrections (voice/category/attachment)');
  check("composer reads voice_language from settings", composerSrc.includes("settings?.voice_language"));
  check("composer voice labels show Transcribe", composerSrc.includes('Transcribe'));
  check("composer voice labels show Transcribe + Organize", composerSrc.includes('Transcribe + Organize'));
  check(
    'category selector is a floating popover (no page expansion)',
    composerSrc.includes('absolute top-[calc(100%+8px)]') && composerSrc.includes('max-h-64 overflow-y-auto')
  );
  check('composer opens AttachmentPickerModal', composerSrc.includes('AttachmentPickerModal') && composerSrc.includes('composer-add-attachment'));
  check('no permanent inline URL row remains in composer', !composerSrc.includes('composer-attachment-input'));

  const wsSrc = fs.readFileSync(path.join(ROOT, 'src', 'features', 'idea-capture', 'IdeaWorkspacePage.tsx'), 'utf8');
  check('workspace opens AttachmentPickerModal', wsSrc.includes('AttachmentPickerModal') && wsSrc.includes('workspace-add-attachment'));
  check('workspace no inline URL form', !wsSrc.includes('attachment-toggle-form') && !wsSrc.includes('Attachment URL'));
  check('workspace shows attachment thumbnails for images', wsSrc.includes('<img src={a.url}'));

  const catRepoSrc = fs.readFileSync(path.join(ROOT, 'src', 'services', 'adapters', 'dexie', 'DexieIdeaCategoryRepository.ts'), 'utf8');
  check('seeding uses deterministic default ids', catRepoSrc.includes('cat-default-'));
  check('seeding uses bulkPut (idempotent)', catRepoSrc.includes('bulkPut'));
  check('duplicate rows are collapsed by normalized name', catRepoSrc.includes('normalizeName') && catRepoSrc.includes('remap'));
  check('remove throws when referenced', catRepoSrc.includes('countReferences') && /used by/i.test(catRepoSrc));

  const settingsDefaultsSrc = fs.readFileSync(path.join(ROOT, 'src', 'services', 'adapters', 'dexie', 'DexieSettingsRepository.ts'), 'utf8');
  check("default voice_language is Arabic (ar-SA)", settingsDefaultsSrc.includes("voice_language: 'ar-SA'"));

  const settingsTypesSrc = fs.readFileSync(path.join(ROOT, 'src', 'types', 'settings.types.ts'), 'utf8');
  check('UserSettings declares voice_language', settingsTypesSrc.includes('voice_language'));
  check("VoiceLanguage is 'ar-SA' | 'en-US'", settingsTypesSrc.includes("'ar-SA'") && settingsTypesSrc.includes("'en-US'"));

  const pickerSrc = fs.readFileSync(path.join(ROOT, 'src', 'features', 'idea-capture', 'AttachmentPickerModal.tsx'), 'utf8');
  check('picker validates http(s) URLs', pickerSrc.includes('isValidHttpUrl'));
  check('picker uses native file input', pickerSrc.includes('<input') && pickerSrc.includes('type="file"'));
  check('picker stores image as data URL (durable)', pickerSrc.includes('readAsDataURL'));
  check('picker rejects blob-only storage', !pickerSrc.includes('URL.createObjectURL'));

  const agentCoreSrc = fs.readFileSync(path.join(ROOT, 'src', 'services', 'ai', 'agent', 'ideaAgentCore.ts'), 'utf8');
  check('buildIdeaSystemContext redacts data URLs', /embedded/.test(agentCoreSrc));

  // ─── Summary ────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════');
  console.log(`Module 11 verification: ${passed} passed, ${failed} failed`);
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
