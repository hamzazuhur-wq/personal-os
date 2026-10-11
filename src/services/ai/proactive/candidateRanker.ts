// ============================================================
// MODULE 11 PHASE 4 — CANDIDATE RANKER
// ============================================================
//
// PURE · DETERMINISTIC · SIDE-EFFECT FREE
//
// Scores ProactiveCandidate[] produced by the deterministic
// signal engine and returns the top-N ranked candidates that
// meet the minimum score threshold.
//
// Contract:
//   - ZERO AI calls
//   - ZERO DB reads or writes
//   - ZERO imports from any Dexie adapter or IAIProvider
//   - Same input → same output (referential transparency)
//   - Does not query the recommendation repository directly
//     (dedup against stored recommendations is the caller's
//     responsibility via the repository layer)
//
// ── Scoring model ────────────────────────────────────────────
//
// Score is an integer 0–100 derived from five dimensions.
// Each dimension is independently capped to its max weight
// so no single dimension can dominate beyond its allocation.
//
// Dimension            Weight  Rationale
// ─────────────────────────────────────────────────────────────
// severity             40      Module 10 severity is the most
//                              authoritative signal strength
//                              indicator available.
// evidenceStrength     25      Number of evidence keys × recency
//                              decay. More factual evidence →
//                              more credible candidate.
// scopeImportance      15      Goal-scoped candidates are more
//                              immediately actionable than global
//                              cross-cutting signals.
// recency              10      Candidates detected very recently
//                              (relative to the run's `now`) are
//                              preferred. All Phase 3 candidates
//                              share the same detectedAt so this
//                              dimension is a tiebreaker only in
//                              multi-batch scenarios.
// actionability        10      Candidates with enough evidence
//                              for a useful next action receive
//                              a bonus. Signals that are inherently
//                              actionable (goal_inactive,
//                              project_stalled, skill_evidence_gap)
//                              always receive the full bonus.
//
// Total possible: 100
// Minimum threshold to be eligible: 35
// Maximum candidates returned: 3 (configurable via RankerOptions)
//
// Tie-breaking (when scores are equal):
//   1. severity (high > medium > low)
//   2. scopeImportance (goal > project > skill > life_area > idea > global)
//   3. evidenceKey count (more evidence = more specific)
//   4. original array order (stable, preserves signal engine order)
//
// No new product semantics are introduced. All thresholds are
// documented here and derive from the approved architecture.
// ============================================================

import { ProactiveCandidate, SignalSeverity, RecommendationScopeType, SignalType } from '../../../types/recommendation.types';

// ─── Configuration ────────────────────────────────────────────

export interface RankerOptions {
  /** Maximum number of candidates to return. Default: 3. */
  maxCandidates?: number;
  /** Minimum score (0–100) required for a candidate to be eligible. Default: 35. */
  minScore?: number;
}

const DEFAULT_MAX_CANDIDATES = 3;
const DEFAULT_MIN_SCORE = 35;

// ─── Ranked candidate output shape ───────────────────────────

export interface RankedCandidate {
  candidate: ProactiveCandidate;
  score: number;
  /** Per-dimension breakdown for diagnostics and tests. */
  scoreBreakdown: ScoreBreakdown;
}

export interface ScoreBreakdown {
  severity: number;        // 0–40
  evidenceStrength: number; // 0–25
  scopeImportance: number; // 0–15
  recency: number;         // 0–10
  actionability: number;   // 0–10
  total: number;           // sum, capped at 100
}

// ─── Dimension weights (documented) ──────────────────────────
// These are the maximum possible scores per dimension.
// Actual scores are 0..MAX inclusive.

const W_SEVERITY          = 40;
const W_EVIDENCE_STRENGTH = 25;
const W_SCOPE_IMPORTANCE  = 15;
const W_RECENCY           = 10;
const W_ACTIONABILITY     = 10;

// ─── Severity scoring (0–40) ─────────────────────────────────
// Directly maps Module 10 severity classification to score.
// high=40, medium=25, low=10.
// Conservative mapping: low is non-zero so low-severity candidates
// can still rank if other dimensions are strong.

const SEVERITY_SCORES: Record<SignalSeverity, number> = {
  high:   40,
  medium: 25,
  low:    10,
};

function scoreSeverity(candidate: ProactiveCandidate): number {
  return SEVERITY_SCORES[candidate.severity] ?? 10;
}

// ─── Evidence strength scoring (0–25) ────────────────────────
// Measures how much factual evidence backs the candidate.
//
// Base: number of keys in candidate.evidence, capped at 5.
// Scaling: each evidence key contributes up to 5 points.
// Max: 5 keys × 5 pts = 25.
//
// The evidence key count is a conservative proxy for specificity:
// a candidate with 6 concrete facts is more credible than one with 1.
// Capped at 5 to prevent gaming via evidence bloat.
//
// Recency decay is not applied here because:
//   - All candidates in a single run share the same detectedAt
//   - The recency dimension already handles time-based preference
//   - Evidence timestamps are not uniformly available across signals

const MAX_EVIDENCE_KEYS = 5;
const POINTS_PER_EVIDENCE_KEY = 5; // 5 × 5 = 25 max

function scoreEvidenceStrength(candidate: ProactiveCandidate): number {
  const keyCount = Object.keys(candidate.evidence).length;
  const capped = Math.min(keyCount, MAX_EVIDENCE_KEYS);
  return capped * POINTS_PER_EVIDENCE_KEY;
}

// ─── Scope importance scoring (0–15) ─────────────────────────
// Goal-scoped candidates are highest priority: they directly
// relate to the user's stated objectives. Project and skill are
// mid-tier. Life area and idea signals are more exploratory.
// Global signals (execution_decline, learning_without_application)
// are cross-cutting and scored conservatively.
//
// Rationale for ordering:
//   goal     → user explicitly committed to an outcome
//   project  → active execution vehicle tied to a goal
//   skill    → development investment the user is tracking
//   life_area→ broad wellness signal, less immediately actionable
//   idea     → opportunity, not a commitment
//   global   → systemic pattern, needs more AI interpretation

const SCOPE_SCORES: Record<RecommendationScopeType, number> = {
  goal:       15,
  project:    12,
  skill:       9,
  life_area:   6,
  idea:        4,
  global:      2,
};

function scoreScopeImportance(candidate: ProactiveCandidate): number {
  return SCOPE_SCORES[candidate.scopeType] ?? 2;
}

// ─── Recency scoring (0–10) ───────────────────────────────────
// All candidates in a single signal engine run share the same
// detectedAt (input.now), so recency is 10 for all of them within
// one run.
//
// In multi-batch scenarios (if the ranker ever receives candidates
// from different runs), more recently detected candidates receive
// a higher recency score. The decay function gives full score to
// candidates detected within the last 24h, and grades down to 1
// for candidates up to 7 days old.
//
// rankerNow must be supplied by the caller (same as signal engine
// pattern: no internal Date.now() calls).

function scoreRecency(candidate: ProactiveCandidate, rankerNow: string): number {
  const nowMs = Date.parse(rankerNow);
  const detectedMs = Date.parse(candidate.detectedAt);
  if (Number.isNaN(nowMs) || Number.isNaN(detectedMs)) return W_RECENCY;

  const ageMs = nowMs - detectedMs;
  const ageHours = ageMs / (1000 * 60 * 60);

  if (ageHours <= 24)  return 10;
  if (ageHours <= 48)  return  8;
  if (ageHours <= 72)  return  6;
  if (ageHours <= 120) return  4;
  if (ageHours <= 168) return  2; // 7 days
  return 1;
}

// ─── Actionability scoring (0–10) ────────────────────────────
// Measures whether enough evidence exists for a concrete next step.
//
// Signals that are inherently actionable (the next step is obvious
// from the signal semantics alone) receive the full bonus.
// Signals that require more interpretation receive a partial score.
//
// Inherently actionable (full 10):
//   goal_inactive               → create a task to restart
//   goal_without_clear_next_action → create a next action task
//   project_stalled             → create a task to unblock
//   skill_evidence_gap          → create a practice task
//   execution_decline           → review and reprioritise
//
// Moderately actionable (7):
//   goal_next_action            → designate a next-action task
//   project_next_action         → designate a next-action task
//   learning_without_application → create an application task
//
// Lower actionability (4 — needs more context):
//   life_area_attention         → broad area needs interpretation
//   completed_goal_followup     → follow-up is optional
//   idea_opportunity            → needs goal alignment decision

const ACTIONABILITY_SCORES: Record<SignalType, number> = {
  goal_inactive:                    10,
  goal_without_clear_next_action:   10,
  project_stalled:                  10,
  skill_evidence_gap:               10,
  execution_decline:                10,
  goal_next_action:                  7,
  project_next_action:               7,
  learning_without_application:      7,
  life_area_attention:               4,
  completed_goal_followup:           4,
  idea_opportunity:                  4,
};

function scoreActionability(candidate: ProactiveCandidate): number {
  return ACTIONABILITY_SCORES[candidate.signalType] ?? 4;
}

// ─── Total score ──────────────────────────────────────────────

function computeScore(candidate: ProactiveCandidate, rankerNow: string): ScoreBreakdown {
  const severity          = scoreSeverity(candidate);
  const evidenceStrength  = scoreEvidenceStrength(candidate);
  const scopeImportance   = scoreScopeImportance(candidate);
  const recency           = scoreRecency(candidate, rankerNow);
  const actionability     = scoreActionability(candidate);
  const total             = Math.min(100, severity + evidenceStrength + scopeImportance + recency + actionability);

  return { severity, evidenceStrength, scopeImportance, recency, actionability, total };
}

// ─── Tie-breaking comparator ──────────────────────────────────
// Applied when two candidates have the same total score.
// Returns negative if a should come before b (higher priority).

const SEVERITY_ORDER: Record<SignalSeverity, number> = { high: 0, medium: 1, low: 2 };
const SCOPE_ORDER: Record<RecommendationScopeType, number> = {
  goal: 0, project: 1, skill: 2, life_area: 3, idea: 4, global: 5,
};

function tieBreak(
  a: RankedCandidate,
  b: RankedCandidate,
  aOriginalIndex: number,
  bOriginalIndex: number,
): number {
  // 1. Severity (lower enum value = higher priority)
  const sevDiff = SEVERITY_ORDER[a.candidate.severity] - SEVERITY_ORDER[b.candidate.severity];
  if (sevDiff !== 0) return sevDiff;

  // 2. Scope importance (lower enum value = higher priority)
  const scopeDiff = SCOPE_ORDER[a.candidate.scopeType] - SCOPE_ORDER[b.candidate.scopeType];
  if (scopeDiff !== 0) return scopeDiff;

  // 3. Evidence key count (more keys = higher priority, so negate)
  const evDiff = Object.keys(b.candidate.evidence).length - Object.keys(a.candidate.evidence).length;
  if (evDiff !== 0) return evDiff;

  // 4. Original array order (stable)
  return aOriginalIndex - bOriginalIndex;
}

// ─── Public API ───────────────────────────────────────────────

/**
 * Rank a list of ProactiveCandidate[] and return the top-N
 * candidates that meet the minimum score threshold.
 *
 * This function is PURE and DETERMINISTIC:
 *   - No DB reads or writes
 *   - No AI calls
 *   - No side effects
 *   - Same (candidates, rankerNow, options) → same output
 *
 * @param candidates  Deduplicated candidates from the signal engine
 * @param rankerNow   ISO timestamp used for recency calculation
 *                    (same pattern as signal engine: no internal
 *                    Date.now() calls)
 * @param options     Optional overrides for maxCandidates and minScore
 * @returns           Ranked candidates, highest score first,
 *                    capped at maxCandidates
 */
export function rankCandidates(
  candidates: ProactiveCandidate[],
  rankerNow: string,
  options?: RankerOptions,
): RankedCandidate[] {
  const maxCandidates = options?.maxCandidates ?? DEFAULT_MAX_CANDIDATES;
  const minScore      = options?.minScore      ?? DEFAULT_MIN_SCORE;

  if (candidates.length === 0) return [];

  // Score all candidates
  const scored: Array<{ ranked: RankedCandidate; originalIndex: number }> = candidates.map(
    (candidate, index) => {
      const breakdown = computeScore(candidate, rankerNow);
      return {
        ranked: { candidate, score: breakdown.total, scoreBreakdown: breakdown },
        originalIndex: index,
      };
    }
  );

  // Filter by minimum threshold
  const eligible = scored.filter((s) => s.ranked.score >= minScore);

  // Sort: highest score first; tie-break deterministically
  eligible.sort((a, b) => {
    const scoreDiff = b.ranked.score - a.ranked.score;
    if (scoreDiff !== 0) return scoreDiff;
    return tieBreak(a.ranked, b.ranked, a.originalIndex, b.originalIndex);
  });

  // Return top-N
  return eligible.slice(0, maxCandidates).map((s) => s.ranked);
}

/**
 * Compute the score for a single candidate without ranking.
 * Useful for diagnostics, tests, and the trigger service's
 * pre-flight check.
 */
export function scoreCandidate(
  candidate: ProactiveCandidate,
  rankerNow: string,
): RankedCandidate {
  const breakdown = computeScore(candidate, rankerNow);
  return { candidate, score: breakdown.total, scoreBreakdown: breakdown };
}

/**
 * Exposed dimension scorers for unit testing.
 * The ranker's internal scoring logic is testable without
 * needing to call the full rankCandidates() pipeline.
 */
export const _scorers = {
  severity:         scoreSeverity,
  evidenceStrength: scoreEvidenceStrength,
  scopeImportance:  scoreScopeImportance,
  recency:          scoreRecency,
  actionability:    scoreActionability,
} as const;

/** Exposed constants for test assertions. */
export const RANKER_DEFAULTS = {
  MAX_CANDIDATES: DEFAULT_MAX_CANDIDATES,
  MIN_SCORE:      DEFAULT_MIN_SCORE,
  W_SEVERITY,
  W_EVIDENCE_STRENGTH,
  W_SCOPE_IMPORTANCE,
  W_RECENCY,
  W_ACTIONABILITY,
} as const;
