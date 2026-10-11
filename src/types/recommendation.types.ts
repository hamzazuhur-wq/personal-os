// ============================================================
// MODULE 11 — PROACTIVE AI INTELLIGENCE TYPES
// ============================================================
// Domain types for the proactive recommendation pipeline.
//
// The signal engine, ranker, and AI generator all produce
// ProactiveCandidate / AIRecommendation instances. The persistence
// layer stores AIRecommendation + AIRecommendationRun records.
//
// Recommendations are PROPOSALS — they never mutate the system
// directly. Only user acceptance routes through ActionPolicy.
// ============================================================

/**
 * Supported recommendation types. Each type maps to a specific
 * deterministic signal and has an explicit tool allowlist defined
 * in RECOMMENDATION_RULES.md §11.
 */
export type RecommendationType =
  | 'goal_next_action'
  | 'goal_inactive'
  | 'project_next_action'
  | 'project_stalled'
  | 'learning_gap'
  | 'learning_without_application'
  | 'skill_evidence_gap'
  | 'life_area_attention'
  | 'execution_decline'
  | 'idea_opportunity'
  | 'completed_goal_followup';

/**
 * Lifecycle status of a recommendation. Terminal states are
 * 'dismissed', 'completed', and 'expired' — once reached, the
 * recommendation is read-only for historical purposes.
 */
export type RecommendationStatus =
  | 'pending'
  | 'accepted'
  | 'edited'
  | 'dismissed'
  | 'completed'
  | 'expired';

/**
 * Status of a proactive AI run. 'running' indicates an in-flight
 * batch that has claimed the run slot; any concurrent caller
 * finding a non-stale 'running' run must back off immediately.
 */
export type RecommendationRunStatus =
  | 'running'
  | 'completed'
  | 'no_candidates'
  | 'failed';

/**
 * Severity classification produced by the deterministic signal
 * engine. Drives candidate ranking but is NOT authoritative —
 * the AI may reject a 'high' candidate if evidence is weak.
 */
export type SignalSeverity = 'low' | 'medium' | 'high';

/**
 * Scope kind a signal/recommendation targets. Maps to existing
 * repository entities (Goal, Project, Skill, LifeArea, Capture).
 */
export type RecommendationScopeType =
  | 'goal'
  | 'project'
  | 'skill'
  | 'life_area'
  | 'idea'
  | 'global';

/**
 * Target entity type for the suggestion's downstream write.
 * Kept distinct from RecommendationScopeType because the scope
 * may be global while the target is a Goal (e.g. execution_decline
 * recommending a Goal review).
 */
export type RecommendationTargetType =
  | 'Goal'
  | 'Project'
  | 'Task'
  | 'Skill'
  | 'Level'
  | 'Practice'
  | 'Idea';

/**
 * One executable action proposed by the AI. toolName MUST be in
 * the allowlist for the parent recommendation type (validated by
 * recommendationValidator). Parameters MUST satisfy the tool's
 * parameter schema.
 */
export interface SuggestedAction {
  toolName: string;
  parameters: Record<string, unknown>;
  label: string;
}

/**
 * Persisted recommendation record. Stored in IndexedDB table
 * `ai_recommendations` (schema v17). The fingerprint uniquely
 * identifies the semantic intent; duplicate fingerprints are
 * rejected before persistence.
 */
export interface AIRecommendation {
  id: string;
  type: RecommendationType;
  title: string;
  description: string;
  reason: string;
  confidence: number;
  status: RecommendationStatus;
  targetType?: RecommendationTargetType;
  targetId?: string;
  scopeType?: RecommendationScopeType;
  scopeId?: string;
  suggestedActions: SuggestedAction[];
  evidenceSources: string[];
  fingerprint: string;
  policyVersion: string;
  runId: string;
  created_at: string;
  updated_at: string;
  expires_at?: string;
  dismissed_at?: string;
  accepted_at?: string;
  completed_at?: string;
}

/**
 * Persisted run record. One record per eligible daily evaluation.
 * The [status+completed_at] index drives the 24h cooldown query.
 */
export interface AIRecommendationRun {
  id: string;
  started_at: string;
  completed_at?: string;
  status: RecommendationRunStatus;
  candidate_count: number;
  ai_call_count: number;
  recommendation_count: number;
  error_code?: string;
  tokens_in?: number;
  tokens_out?: number;
  estimated_cost?: number;
  policy_version: string;
}

/**
 * Partial update shape for AIRecommendation. Only fields that
 * should change on a status transition.
 */
export interface UpdateRecommendationDTO {
  status?: RecommendationStatus;
  suggestedActions?: SuggestedAction[];
  title?: string;
  description?: string;
  expires_at?: string | null;
  dismissed_at?: string | null;
  accepted_at?: string | null;
  completed_at?: string | null;
}

/**
 * Partial update shape for AIRecommendationRun. Used by the
 * trigger service to finalize a 'running' run.
 */
export interface UpdateRunDTO {
  status: Exclude<RecommendationRunStatus, 'running'>;
  completed_at: string;
  candidate_count?: number;
  ai_call_count?: number;
  recommendation_count?: number;
  error_code?: string;
  tokens_in?: number;
  tokens_out?: number;
  estimated_cost?: number;
}

/**
 * Result returned by claimRunSlot. `null` means the slot was not
 * claimed — either within cooldown, another run is in flight, or
 * the race was lost. The caller must NOT invoke the AI in that case.
 */
export type ClaimRunSlotResult = AIRecommendationRun | null;

/** Cooldown window used by the trigger service (24h in ms). */
export const PROACTIVE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/** Stale-run threshold: a 'running' run older than this is considered crashed and may be overridden. */
export const STALE_RUN_THRESHOLD_MS = 5 * 60 * 1000;

// ============================================================
// MODULE 11 PHASE 3 — DETERMINISTIC SIGNAL ENGINE TYPES
// ============================================================

/**
 * All signal types emitted by the deterministic signal engine.
 *
 * Each type maps 1:1 to a RecommendationType that the AI layer
 * will produce downstream. The signal engine itself does NOT
 * create recommendations — it produces ProactiveCandidate records
 * that the ranker and AI layer consume.
 *
 * Note on goal_without_clear_next_action vs goal_next_action:
 * - goal_without_clear_next_action: active goal has NO evidence path
 *   whatsoever (no tasks, no activities, no sub-goals, no projects).
 * - goal_next_action: active goal has engagement evidence but lacks
 *   an explicit is_next_action task. Lighter-weight signal.
 */
export type SignalType =
  | 'goal_inactive'
  | 'goal_without_clear_next_action'
  | 'goal_next_action'
  | 'project_stalled'
  | 'project_next_action'
  | 'skill_evidence_gap'
  | 'life_area_attention'
  | 'execution_decline'
  | 'learning_without_application'
  | 'completed_goal_followup'
  | 'idea_opportunity';

/**
 * A candidate produced by the deterministic signal engine.
 *
 * Candidates are PURE DATA — no AI has touched them. The ranker
 * scores them, the context builder bounds them, and the AI layer
 * interprets them into structured recommendations.
 *
 * Every field must be factual and traceable to domain data.
 * No generated prose. No inferred feelings. No invented metrics.
 *
 * The downstream `Why am I seeing this?` explanation is built
 * from the `evidence` bag — it must be self-sufficient.
 */
export interface ProactiveCandidate {
  /**
   * The signal type. Maps to the RecommendationType the AI will
   * produce for this candidate.
   */
  signalType: SignalType;

  /**
   * Scope entity type. Mirrors RecommendationScopeType but typed
   * to the signal engine's output contract.
   */
  scopeType: RecommendationScopeType;

  /**
   * ID of the scoped entity (goalId, projectId, skillId, areaId,
   * captureId). Use the literal string 'global' for cross-cutting
   * signals (execution_decline, learning_without_application).
   */
  scopeId: string;

  /**
   * Deterministic severity classification.
   *
   * Rules per signal type are documented in deterministicSignalEngine.ts.
   * Severity is derived only from facts already present in Module 10
   * metric output — no new thresholds are introduced.
   */
  severity: SignalSeverity;

  /**
   * Factual evidence bag. All values must be counts, dates, statuses,
   * or metric values — never inferred feelings or invented numbers.
   *
   * This bag is passed verbatim to the AI context builder and forms
   * the basis of the user-visible "Why am I seeing this?" disclosure.
   */
  evidence: Record<string, unknown>;

  /**
   * Deterministic deduplication key.
   *
   * Format per signal:
   *   goal_inactive            → goal_inactive:{goalId}
   *   goal_without_clear_next_action → goal_no_action:{goalId}
   *   goal_next_action         → goal_next_action:{goalId}
   *   project_stalled          → project_stalled:{projectId}
   *   project_next_action      → project_next_action:{projectId}
   *   skill_evidence_gap       → skill_gap:{skillId}
   *   life_area_attention      → life_area:{areaId}
   *   execution_decline        → exec_decline:{periodStartDate}
   *   learning_without_application → learning_gap:{periodStartDate}
   *   completed_goal_followup  → goal_done:{goalId}
   *   idea_opportunity         → idea_opp:{captureId}:{relatedGoalId}
   *
   * Used by the fingerprint service and the repository's
   * persistRecommendations dedup check.
   */
  dedupeKey: string;

  /**
   * ISO timestamp of the engine run that produced this candidate.
   * Always equals SignalEngineInput.now — never Date.now().
   */
  detectedAt: string;
}
