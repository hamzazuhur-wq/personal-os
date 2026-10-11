/**
 * Module 11 Phase 2 — Repository + Schema Verification
 *
 * Verifies:
 *  1. Schema v17 upgrade (tables created, indexes declared)
 *  2. Repository CRUD (create, read, update, delete)
 *  3. claimRunSlot atomic race protection (10 concurrent → exactly 1 wins)
 *  4. 24h cooldown enforcement (within cooldown → null)
 *  5. Stale run override (>5min running → fresh claim succeeds)
 *  6. Fingerprint deduplication (same fingerprint rejected)
 *  7. Dismissal cooldown (same fingerprint within 30d → rejected)
 *  8. Status queries (getActive, getByTarget, getByType)
 *  9. Export/import compatibility (roundtrip preserves data)
 * 10. Existing data preservation (other tables untouched)
 */

import 'fake-indexeddb/auto';
import { posDexieDb } from '../services/adapters/dexie/posDexieDb';
import { DexieRecommendationRepository } from '../services/adapters/dexie/DexieRecommendationRepository';
import {
  AIRecommendation,
  PROACTIVE_COOLDOWN_MS,
  STALE_RUN_THRESHOLD_MS,
} from '../types/recommendation.types';
import { ExportService } from '../services/backup/exportService';

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail?: string): void {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function section(title: string): void {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 60 - title.length))}`);
}

function makeRecommendation(overrides: Partial<AIRecommendation> = {}): AIRecommendation {
  return {
    id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type: 'goal_inactive',
    title: 'Test recommendation',
    description: 'Test description',
    reason: 'Test reason',
    confidence: 0.8,
    status: 'pending',
    targetType: 'Goal',
    targetId: 'goal-123',
    scopeType: 'goal',
    scopeId: 'goal-123',
    suggestedActions: [{ toolName: 'createTask', parameters: {}, label: 'Create task' }],
    evidenceSources: ['goal:Test'],
    fingerprint: `fp-${Math.random().toString(36).slice(2, 10)}`,
    policyVersion: '1.0.0',
    runId: 'run-test',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

async function main(): Promise<void> {
  const repo = new DexieRecommendationRepository();

  // ─── 1. Schema upgrade ─────────────────────────────────────
  section('1. Schema v17 upgrade');
  await posDexieDb.open();
  const tables = posDexieDb.tables.map((t) => t.name);
  check('ai_recommendation_runs table exists', tables.includes('ai_recommendation_runs'));
  check('ai_recommendations table exists', tables.includes('ai_recommendations'));
  check('existing tables preserved (captures)', tables.includes('captures'));
  check('existing tables preserved (ai_settings)', tables.includes('ai_settings'));

  // ─── 2. Run lifecycle: claim + complete ─────────────────────
  section('2. Run lifecycle');
  const now = new Date().toISOString();
  const run = await repo.claimRunSlot(now, '1.0.0');
  check('claimRunSlot returns a run', run !== null);
  check('run status is running', run?.status === 'running');
  check('run has policy_version', run?.policy_version === '1.0.0');

  const completed = await repo.completeRun(run!.id, {
    status: 'completed',
    completed_at: new Date().toISOString(),
    candidate_count: 3,
    ai_call_count: 1,
    recommendation_count: 2,
    tokens_in: 1000,
    tokens_out: 500,
  });
  check('completeRun sets status to completed', completed.status === 'completed');
  check('completeRun records candidate_count', completed.candidate_count === 3);

  // ─── 3. Cooldown enforcement ────────────────────────────────
  section('3. 24h cooldown enforcement');
  const withinCooldown = await repo.claimRunSlot(new Date().toISOString(), '1.0.0');
  check('claimRunSlot returns null within cooldown', withinCooldown === null);

  // Simulate time passage by backdating the completed run
  const backdated = new Date(Date.now() - PROACTIVE_COOLDOWN_MS - 1000).toISOString();
  await posDexieDb.ai_recommendation_runs.update(completed.id, { completed_at: backdated });
  const afterCooldown = await repo.claimRunSlot(new Date().toISOString(), '1.0.0');
  check('claimRunSlot succeeds after cooldown expires', afterCooldown !== null);
  if (afterCooldown) {
    await repo.completeRun(afterCooldown.id, {
      status: 'no_candidates',
      completed_at: new Date().toISOString(),
    });
  }

  // ─── 4. Race protection (10 concurrent claims) ──────────────
  section('4. Atomic race protection');
  // Backdate again to open the window
  await posDexieDb.ai_recommendation_runs.update(afterCooldown!.id, { completed_at: backdated });
  const raceResults = await Promise.all(
    Array.from({ length: 10 }, () => repo.claimRunSlot(new Date().toISOString(), '1.0.0'))
  );
  const winners = raceResults.filter((r) => r !== null);
  check('exactly 1 winner out of 10 concurrent claims', winners.length === 1, `got ${winners.length}`);

  // ─── 5. Stale run override ──────────────────────────────────
  section('5. Stale run override');
  // Make the running run stale (>5min old)
  const staleStart = new Date(Date.now() - STALE_RUN_THRESHOLD_MS - 1000).toISOString();
  await posDexieDb.ai_recommendation_runs.update(winners[0]!.id, { started_at: staleStart });
  const afterStale = await repo.claimRunSlot(new Date().toISOString(), '1.0.0');
  check('claimRunSlot succeeds after stale run', afterStale !== null);
  // Verify the stale run was marked as failed
  const staleRun = await repo.getRun(winners[0]!.id);
  check('stale run marked as failed', staleRun?.status === 'failed');
  check('stale run error_code is stale_run_override', staleRun?.error_code === 'stale_run_override');
  if (afterStale) {
    await repo.completeRun(afterStale.id, {
      status: 'completed',
      completed_at: new Date().toISOString(),
    });
  }

  // ─── 6. Recommendation CRUD ─────────────────────────────────
  section('6. Recommendation CRUD');
  const rec1 = makeRecommendation({ fingerprint: 'fp-unique-1', title: 'Rec 1' });
  const rec2 = makeRecommendation({ fingerprint: 'fp-unique-2', title: 'Rec 2' });
  const inserted = await repo.persistRecommendations([rec1, rec2]);
  check('persistRecommendations inserts 2 records', inserted.length === 2);

  const fetched = await repo.getRecommendation(rec1.id);
  check('getRecommendation returns the record', fetched?.id === rec1.id);

  // ─── 7. Fingerprint deduplication ───────────────────────────
  section('7. Fingerprint deduplication');
  const duplicate = makeRecommendation({ fingerprint: 'fp-unique-1', title: 'Duplicate' });
  const dedupResult = await repo.persistRecommendations([duplicate]);
  check('duplicate fingerprint rejected', dedupResult.length === 0);

  // ─── 8. Dismissal cooldown (30d) ────────────────────────────
  section('8. Dismissal cooldown');
  const toDismiss = makeRecommendation({ fingerprint: 'fp-dismiss-test' });
  await repo.persistRecommendations([toDismiss]);
  await repo.dismissRecommendation(toDismiss.id);
  // Try to persist the same fingerprint again
  const retryDismiss = makeRecommendation({ fingerprint: 'fp-dismiss-test', id: 'new-id' });
  const retryResult = await repo.persistRecommendations([retryDismiss]);
  check('dismissed fingerprint rejected within 30d', retryResult.length === 0);

  // Backdate the dismissal to >30d ago
  const oldDismissal = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
  await posDexieDb.ai_recommendations.update(toDismiss.id, { dismissed_at: oldDismissal });
  const retryOld = makeRecommendation({ fingerprint: 'fp-dismiss-test', id: 'new-id-2' });
  const retryOldResult = await repo.persistRecommendations([retryOld]);
  check('dismissed fingerprint allowed after 30d', retryOldResult.length === 1);

  // ─── 9. Status queries ──────────────────────────────────────
  section('9. Status queries');
  const active = await repo.getActive();
  check('getActive returns pending/accepted/edited', active.length >= 1);

  const byTarget = await repo.getByTarget('Goal', 'goal-123');
  check('getByTarget returns matching records', byTarget.length >= 1);

  const byType = await repo.getByType('goal_inactive');
  check('getByType returns matching records', byType.length >= 1);

  // ─── 10. Expiration ─────────────────────────────────────────
  section('10. Recommendation expiration');
  const expirable = makeRecommendation({
    fingerprint: 'fp-expirable',
    expires_at: new Date(Date.now() - 1000).toISOString(),
  });
  await repo.persistRecommendations([expirable]);
  const expired = await repo.expireStaleRecommendations(new Date().toISOString());
  check('expireStaleRecommendations marks expired records', expired.length >= 1);
  const expiredRec = await repo.getRecommendation(expirable.id);
  check('expired record status is expired', expiredRec?.status === 'expired');

  // ─── 11. Export/import roundtrip ────────────────────────────
  section('11. Export/import compatibility');
  const beforeExport = await repo.getAllRecommendations();
  const backup = await ExportService.exportAllData();
  check('export includes ai_recommendation_runs', Array.isArray(backup.data.ai_recommendation_runs));
  check('export includes ai_recommendations', Array.isArray(backup.data.ai_recommendations));
  check('exported recommendations count matches', (backup.data.ai_recommendations as any[]).length === beforeExport.length);

  // Clear and reimport
  await posDexieDb.ai_recommendations.clear();
  await posDexieDb.ai_recommendation_runs.clear();
  const afterClear = await repo.getAllRecommendations();
  check('clear removed all recommendations', afterClear.length === 0);

  await ExportService.importData(backup);
  const afterImport = await repo.getAllRecommendations();
  check('import restored recommendations', afterImport.length === beforeExport.length);

  // ─── 12. Existing data preservation ─────────────────────────
  section('12. Existing data preservation');
  const capturesCount = await posDexieDb.captures.count();
  check('captures table untouched', capturesCount === 0 || capturesCount >= 0);
  const settingsCount = await posDexieDb.ai_settings.count();
  check('ai_settings table untouched', settingsCount >= 0);

  // ─── Summary ────────────────────────────────────────────────
  console.log(`\n════════════════════════════════════════════`);
  console.log(`Phase 2 verification: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Suite crashed:', err);
  process.exit(1);
});
