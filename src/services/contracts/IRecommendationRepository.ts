import {
  AIRecommendation,
  AIRecommendationRun,
  ClaimRunSlotResult,
  RecommendationRunStatus,
  RecommendationStatus,
  UpdateRecommendationDTO,
  UpdateRunDTO,
} from '../../types/recommendation.types';

/**
 * Contract for proactive AI recommendation persistence.
 *
 * The repository is responsible for:
 *  1. Atomic run-slot claiming (claimRunSlot) — the 24h cooldown
 *     and cross-tab race protection.
 *  2. Run finalization (completeRun / failRun).
 *  3. Recommendation CRUD with fingerprint deduplication.
 *  4. Status transitions (accept, edit, dismiss, complete, expire).
 *  5. Efficient indexed lookups (by status, fingerprint, target, scope).
 *
 * Implementations MUST be additive-only on schema changes and MUST
 * preserve all existing data across migrations.
 */
export interface IRecommendationRepository {
  // ── Run lifecycle ──────────────────────────────────────────

  /**
   * Atomically claim the proactive-run slot for the current 24h window.
   *
   * Returns a newly created AIRecommendationRun (status='running')
   * when the slot was claimed, or null when:
   *  - a 'completed' or 'no_candidates' run has completed_at within
   *    the last 24 hours (cooldown active), OR
   *  - another 'running' run exists and is not stale (another tab
   *    is actively running), OR
   *  - the race was lost to a concurrent claimer.
   *
   * A 'running' run older than STALE_RUN_THRESHOLD_MS is considered
   * crashed and may be overridden by a fresh claim.
   *
   * Implementations MUST use a single transaction so the check-then-
   * insert sequence cannot interleave with another caller.
   */
  claimRunSlot(now: string, policyVersion: string): Promise<ClaimRunSlotResult>;

  /** Finalize a 'running' run with terminal status + metrics. */
  completeRun(runId: string, dto: UpdateRunDTO): Promise<AIRecommendationRun>;

  /** Shorthand for completeRun with status='failed' and error_code. */
  failRun(runId: string, errorCode: string, errorMessage?: string): Promise<AIRecommendationRun>;

  /**
   * Return the most recent completed/no_candidates run, or null.
   * Used by the trigger for pre-flight cooldown checks.
   */
  getLatestFinishedRun(): Promise<AIRecommendationRun | null>;

  /** Get a run by id. */
  getRun(runId: string): Promise<AIRecommendationRun | null>;

  /**
   * Return all runs matching the given status, newest first.
   * Primarily used for diagnostics / UI history.
   */
  getRunsByStatus(status: RecommendationRunStatus, limit?: number): Promise<AIRecommendationRun[]>;

  // ── Recommendation CRUD ────────────────────────────────────

  /**
   * Persist a batch of recommendations produced by a single run.
   *
   * - Each record's fingerprint is checked against existing
   *   active ('pending' | 'accepted' | 'edited') records; duplicates
   *   are silently skipped.
   * - Each record's fingerprint is checked against recent
   *   'dismissed' records (within 30 days at same severity proxy);
   *   duplicates are silently skipped.
   * - Returns the subset actually inserted.
   */
  persistRecommendations(records: AIRecommendation[]): Promise<AIRecommendation[]>;

  /** Update a recommendation's status and/or editable fields. */
  updateRecommendation(id: string, dto: UpdateRecommendationDTO): Promise<AIRecommendation>;

  /** Convenience: mark a recommendation as accepted. */
  acceptRecommendation(id: string): Promise<AIRecommendation>;

  /** Convenience: mark a recommendation as edited (user-modified suggestion). */
  editRecommendation(id: string, modifications: { title?: string; description?: string; suggestedActions?: AIRecommendation['suggestedActions'] }): Promise<AIRecommendation>;

  /** Convenience: mark a recommendation as dismissed. */
  dismissRecommendation(id: string): Promise<AIRecommendation>;

  /**
   * Convenience: mark a recommendation as completed (after the
   * user's accepted action was executed successfully).
   */
  completeRecommendation(id: string): Promise<AIRecommendation>;

  /**
   * Mark any 'pending' recommendation whose expires_at < now, OR
   * whose target entity has been completed/archived, as 'expired'.
   * Returns the ids that were expired.
   */
  expireStaleRecommendations(now: string, completedTargetIds?: string[]): Promise<string[]>;

  /** Get a recommendation by id. */
  getRecommendation(id: string): Promise<AIRecommendation | null>;

  /**
   * Find an existing recommendation by fingerprint, optionally
   * filtered to one or more statuses. Returns the most recent match.
   */
  getByFingerprint(fingerprint: string, statuses?: RecommendationStatus[]): Promise<AIRecommendation | null>;

  /**
   * All recommendations currently eligible for display on the
   * homepage: status in {'pending', 'accepted', 'edited'},
   * sorted newest-first, capped at the provided limit.
   */
  getActive(limit?: number): Promise<AIRecommendation[]>;

  /**
   * Recommendations targeting a specific entity. Used for
   * contextual displays inside Goal/Project/Skill detail views.
   */
  getByTarget(targetType: string, targetId: string, limit?: number): Promise<AIRecommendation[]>;

  /** All recommendations matching a given type. */
  getByType(type: AIRecommendation['type'], limit?: number): Promise<AIRecommendation[]>;

  /** All runs (newest first) — admin/export use. */
  getAllRuns(): Promise<AIRecommendationRun[]>;

  /** All recommendations — admin/export use. */
  getAllRecommendations(): Promise<AIRecommendation[]>;
}
