import { posDexieDb } from './posDexieDb';
import { IRecommendationRepository } from '../../contracts/IRecommendationRepository';
import {
  AIRecommendation,
  AIRecommendationRun,
  ClaimRunSlotResult,
  RecommendationRunStatus,
  RecommendationStatus,
  UpdateRecommendationDTO,
  UpdateRunDTO,
  PROACTIVE_COOLDOWN_MS,
  STALE_RUN_THRESHOLD_MS,
} from '../../../types/recommendation.types';
import { generateId } from '../../../utils/idGenerator';

/**
 * Dexie-backed proactive recommendation repository (schema v17).
 *
 * Race protection: claimRunSlot runs inside a single Dexie
 * transaction on ai_recommendation_runs. Concurrent claimers
 * (two tabs, StrictMode double-fire, session restore) serialize
 * at the IndexedDB level — the second caller sees the first
 * caller's 'running' record and backs off. The 24h cooldown is
 * enforced against any finished run within PROACTIVE_COOLDOWN_MS.
 *
 * Fingerprint dedup: persistRecommendations filters against
 * existing active records and recent dismissals (30d) before
 * inserting.
 */
export class DexieRecommendationRepository implements IRecommendationRepository {
  // ── Run lifecycle ──────────────────────────────────────────

  async claimRunSlot(now: string, policyVersion: string): Promise<ClaimRunSlotResult> {
    const nowMs = Date.parse(now);
    if (Number.isNaN(nowMs)) throw new Error('claimRunSlot: invalid `now` ISO timestamp.');
    const cooldownCutoff = new Date(nowMs - PROACTIVE_COOLDOWN_MS).toISOString();
    const staleCutoff = new Date(nowMs - STALE_RUN_THRESHOLD_MS).toISOString();

    return await posDexieDb.transaction('rw', posDexieDb.ai_recommendation_runs, async () => {
      const all = await posDexieDb.ai_recommendation_runs.toArray();

      // ── Cooldown: any finished run within 24h → back off ──
      const withinCooldown = all.some(
        (r) =>
          (r.status === 'completed' || r.status === 'no_candidates') &&
          !!r.completed_at &&
          r.completed_at >= cooldownCutoff
      );
      if (withinCooldown) return null;

      // ── Another tab is running (non-stale) → back off ──
      const freshRunning = all.find(
        (r) => r.status === 'running' && r.started_at >= staleCutoff
      );
      if (freshRunning) return null;

      // ── Stale 'running' run(s) → mark as failed before claiming ──
      const staleRunning = all.filter(
        (r) => r.status === 'running' && r.started_at < staleCutoff
      );
      for (const stale of staleRunning) {
        await posDexieDb.ai_recommendation_runs.update(stale.id, {
          status: 'failed' as RecommendationRunStatus,
          completed_at: now,
          error_code: 'stale_run_override',
        });
      }

      // ── Claim the slot ──
      const id = generateId();
      const run: AIRecommendationRun = {
        id,
        started_at: now,
        status: 'running',
        candidate_count: 0,
        ai_call_count: 0,
        recommendation_count: 0,
        policy_version: policyVersion,
      };
      await posDexieDb.ai_recommendation_runs.add(run);
      return run;
    });
  }

  async completeRun(runId: string, dto: UpdateRunDTO): Promise<AIRecommendationRun> {
    const current = await posDexieDb.ai_recommendation_runs.get(runId);
    if (!current) throw new Error(`Run with id "${runId}" not found.`);
    if (current.status !== 'running') {
      throw new Error(`Run "${runId}" is not in 'running' state (current: ${current.status}).`);
    }
    const updated: AIRecommendationRun = {
      ...current,
      status: dto.status,
      completed_at: dto.completed_at,
      ...(dto.candidate_count !== undefined && { candidate_count: dto.candidate_count }),
      ...(dto.ai_call_count !== undefined && { ai_call_count: dto.ai_call_count }),
      ...(dto.recommendation_count !== undefined && { recommendation_count: dto.recommendation_count }),
      ...(dto.error_code !== undefined && { error_code: dto.error_code }),
      ...(dto.tokens_in !== undefined && { tokens_in: dto.tokens_in }),
      ...(dto.tokens_out !== undefined && { tokens_out: dto.tokens_out }),
      ...(dto.estimated_cost !== undefined && { estimated_cost: dto.estimated_cost }),
    };
    await posDexieDb.ai_recommendation_runs.put(updated);
    return updated;
  }

  async failRun(runId: string, errorCode: string, errorMessage?: string): Promise<AIRecommendationRun> {
    const now = new Date().toISOString();
    return this.completeRun(runId, {
      status: 'failed',
      completed_at: now,
      error_code: errorMessage ? `${errorCode}:${errorMessage.slice(0, 100)}` : errorCode,
    });
  }

  async getLatestFinishedRun(): Promise<AIRecommendationRun | null> {
    const all = await posDexieDb.ai_recommendation_runs.toArray();
    const finished = all
      .filter((r) => (r.status === 'completed' || r.status === 'no_candidates') && !!r.completed_at)
      .sort((a, b) => (b.completed_at as string).localeCompare(a.completed_at as string));
    return finished[0] ?? null;
  }

  async getRun(runId: string): Promise<AIRecommendationRun | null> {
    const rec = await posDexieDb.ai_recommendation_runs.get(runId);
    return rec ?? null;
  }

  async getRunsByStatus(status: RecommendationRunStatus, limit = 25): Promise<AIRecommendationRun[]> {
    const all = await posDexieDb.ai_recommendation_runs
      .where('status')
      .equals(status)
      .reverse()
      .sortBy('started_at');
    return all.sort((a, b) => b.started_at.localeCompare(a.started_at)).slice(0, limit);
  }

  // ── Recommendation CRUD ────────────────────────────────────

  async persistRecommendations(records: AIRecommendation[]): Promise<AIRecommendation[]> {
    if (records.length === 0) return [];

    const existing = await posDexieDb.ai_recommendations.toArray();
    const activeFingerprints = new Set(
      existing
        .filter((r) => r.status === 'pending' || r.status === 'accepted' || r.status === 'edited')
        .map((r) => r.fingerprint)
    );

      const dismissedCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const recentlyDismissed = new Set(
        existing
          .filter(
            (r) =>
              r.status === 'dismissed' &&
              !!r.dismissed_at &&
              r.dismissed_at >= dismissedCutoff
          )
          .map((r) => r.fingerprint)
      );

      const toInsert: AIRecommendation[] = [];
      const seenInBatch = new Set<string>();

      for (const rec of records) {
        if (!rec.fingerprint) continue;
        if (activeFingerprints.has(rec.fingerprint)) continue;
        if (recentlyDismissed.has(rec.fingerprint)) continue;
        if (seenInBatch.has(rec.fingerprint)) continue;
        seenInBatch.add(rec.fingerprint);
        toInsert.push(rec);
      }

      if (toInsert.length === 0) return [];
      await posDexieDb.ai_recommendations.bulkAdd(toInsert);
      return toInsert;
    }

  async updateRecommendation(id: string, dto: UpdateRecommendationDTO): Promise<AIRecommendation> {
    const current = await posDexieDb.ai_recommendations.get(id);
    if (!current) throw new Error(`Recommendation with id "${id}" not found.`);

    // Build next without spreading null-able timestamp fields (which would
    // violate AIRecommendation's `string | undefined` contract).
    const { expires_at, dismissed_at, accepted_at, completed_at, ...rest } = dto;
    const next: AIRecommendation = {
      ...current,
      ...rest,
      updated_at: new Date().toISOString(),
    };
    // Only assign non-null values for optional timestamp fields.
    if (typeof expires_at === 'string') next.expires_at = expires_at;
    else if (expires_at === null) delete next.expires_at;
    if (typeof dismissed_at === 'string') next.dismissed_at = dismissed_at;
    else if (dismissed_at === null) delete next.dismissed_at;
    if (typeof accepted_at === 'string') next.accepted_at = accepted_at;
    else if (accepted_at === null) delete next.accepted_at;
    if (typeof completed_at === 'string') next.completed_at = completed_at;
    else if (completed_at === null) delete next.completed_at;

    await posDexieDb.ai_recommendations.put(next);
    return next;
  }

  async acceptRecommendation(id: string): Promise<AIRecommendation> {
    const now = new Date().toISOString();
    return this.updateRecommendation(id, {
      status: 'accepted',
      accepted_at: now,
    });
  }

  async editRecommendation(
    id: string,
    modifications: { title?: string; description?: string; suggestedActions?: AIRecommendation['suggestedActions'] }
  ): Promise<AIRecommendation> {
    return this.updateRecommendation(id, {
      status: 'edited',
      ...modifications,
    });
  }

  async dismissRecommendation(id: string): Promise<AIRecommendation> {
    const now = new Date().toISOString();
    return this.updateRecommendation(id, {
      status: 'dismissed',
      dismissed_at: now,
    });
  }

  async completeRecommendation(id: string): Promise<AIRecommendation> {
    const now = new Date().toISOString();
    return this.updateRecommendation(id, {
      status: 'completed',
      completed_at: now,
    });
  }

  async expireStaleRecommendations(now: string, completedTargetIds: string[] = []): Promise<string[]> {
    const all = await posDexieDb.ai_recommendations.toArray();
    const completedSet = new Set(completedTargetIds);
    const expired: string[] = [];

    for (const rec of all) {
      if (rec.status !== 'pending') continue;
      const timeExpired = !!rec.expires_at && rec.expires_at < now;
      const targetCompleted = !!rec.targetId && completedSet.has(rec.targetId);
      if (!timeExpired && !targetCompleted) continue;
      await posDexieDb.ai_recommendations.update(rec.id, {
        status: 'expired',
        expires_at: now,
        updated_at: now,
      });
      expired.push(rec.id);
    }
    return expired;
  }

  async getRecommendation(id: string): Promise<AIRecommendation | null> {
    const rec = await posDexieDb.ai_recommendations.get(id);
    return rec ?? null;
  }

  async getByFingerprint(
    fingerprint: string,
    statuses?: RecommendationStatus[]
  ): Promise<AIRecommendation | null> {
    const all = await posDexieDb.ai_recommendations.toArray();
    const matches = all
      .filter((r) => r.fingerprint === fingerprint)
      .filter((r) => !statuses || statuses.includes(r.status))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    return matches[0] ?? null;
  }

  async getActive(limit = 3): Promise<AIRecommendation[]> {
    const all = await posDexieDb.ai_recommendations.toArray();
    return all
      .filter((r) => r.status === 'pending' || r.status === 'accepted' || r.status === 'edited')
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit);
  }

  async getByTarget(targetType: string, targetId: string, limit = 10): Promise<AIRecommendation[]> {
    const all = await posDexieDb.ai_recommendations.toArray();
    return all
      .filter((r) => r.targetType === targetType && r.targetId === targetId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit);
  }

  async getByType(type: AIRecommendation['type'], limit = 25): Promise<AIRecommendation[]> {
    const all = await posDexieDb.ai_recommendations.toArray();
    return all
      .filter((r) => r.type === type)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit);
  }

  async getAllRuns(): Promise<AIRecommendationRun[]> {
    const all = await posDexieDb.ai_recommendation_runs.toArray();
    return all.sort((a, b) => b.started_at.localeCompare(a.started_at));
  }

  async getAllRecommendations(): Promise<AIRecommendation[]> {
    const all = await posDexieDb.ai_recommendations.toArray();
    return all.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
}
