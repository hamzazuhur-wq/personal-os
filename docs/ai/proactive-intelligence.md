# Module 11 — Proactive AI Intelligence

> Version: 1.0.0  
> Last updated: 2026-01-15  
> Status: Approved for implementation

## 1. Objective

Transform the Personal OS from **reactive AI** (user asks → AI answers) to **proactive AI** (system detects signals → AI reasons → user decides).

The system must be:
- **Evidence-based** — all claims grounded in deterministic data
- **Explainable** — every recommendation exposes "Why am I seeing this?"
- **Bounded** — compact context, capped candidates, token-tracked
- **Cost-controlled** — MAX 1 AI batch per 24h globally
- **User-controlled** — accept / edit / dismiss; never auto-mutate
- **Provider-agnostic** — depends on `IAIProvider`, never on concrete providers

## 2. Pipeline Architecture

```
DOMAIN DATA
     ↓
MODULE 10 METRICS (reused, never recalculated)
     ↓
DETERMINISTIC SIGNAL ENGINE (pure, side-effect-free)
     ↓
CANDIDATE FILTER (eligibility + dedupe keys)
     ↓
CANDIDATE RANKER (scoring 0-100, top N=3, threshold 35)
     ↓
RECOMMENDATION CONTEXT BUILDER (bounded, <4000 tokens)
     ↓
POLICY LOADER (SOUL + RULES [+ DOMAIN if relevant])
     ↓
AI REASONING (1 bounded call via IAIProvider)
     ↓
STRUCTURED OUTPUT VALIDATION (reject malformed)
     ↓
FINGERPRINT DEDUPLICATION (SHA-256)
     ↓
PERSIST ai_recommendations + ai_recommendation_runs
     ↓
AIInsightsWidget (read-only display)
     ↓
Accept / Edit / Dismiss
     ↓
ActionProposal → existing ActionPolicy → WriteToolExecutor → audit
```

**Each layer is a separate module.** No collapsing into a single Agent class.

## 3. Responsibility Boundaries

### Deterministic code owns

- Dates, counts, comparisons, trends
- Point totals, inactivity durations
- Task completion, goal state, project inactivity
- Skill evidence availability, Level progress
- 24h cooldown enforcement (repository-level atomic claim)
- Duplicate suppression (fingerprinting)
- Candidate eligibility and ranking
- Recommendation expiration

### AI owns

- Interpreting candidate relevance
- Producing concise explanation and reason
- Proposing the most useful next step
- Structuring the recommendation
- Choosing between plausible recommendation forms

### AI MUST NOT own

- Authoritative calculations
- Direct database mutations
- Hallucinated user facts
- Cross-scope mutations

## 4. Trigger Architecture

### Primary: App Open

**File:** `src/services/ai/proactive/proactiveTriggerService.ts`

```typescript
class ProactiveTriggerService {
  async onAppOpen(repositories): Promise<ProactiveRunResult>
}
```

**Flow:**

1. Read `ai_recommendation_runs` for latest completed/no_candidates run.
2. If within 24h → return `{ skipped: true, reason: 'within_cooldown' }`. **Zero AI calls.**
3. Else: **atomic claim** the run slot (see §4.1 race protection).
4. Run `deterministicSignalEngine.evaluate(repositories)` → `Candidate[]`.
5. If 0 candidates → persist run with `status: 'no_candidates'`, `ai_call_count: 0`. **Zero AI calls.**
6. Rank → top 3.
7. Call `recommendationEngine.generate()` → one bounded AI call.
8. Validate output → dedupe by fingerprint → persist recommendations.
9. Complete run with actual token/cost metrics.

### 4.1 Race Protection (MANDATORY)

The in-memory `hasTriggered` flag is not sufficient alone. Repository-level atomic claim semantics enforce **MAX 1 proactive AI batch per 24h globally**, across browser tabs, sessions, and concurrent evaluations.

**Implementation:**

```typescript
// Dexie transaction: claim the run slot atomically
async claimRunSlot(now: ISOString, ttlMs: number): Promise<string | null> {
  // 1. Check latest completed run — if within TTL, return null (no run)
  // 2. Check for existing 'running' run — if still within timeout, return null
  // 3. Insert new run with status='running', started_at=now
  // 4. Return runId on success, null if race lost
}
```

The persisted `ai_recommendation_runs` table is the **source of truth**. In-memory flags are advisory only.

**Invariant:** Under any concurrency scenario (StrictMode, two tabs, two sessions), exactly 0 or 1 AI call occurs per 24h window.

### 4.2 Invocation Site

**ONLY ONE** invocation in the entire app:

```typescript
// src/app/App.tsx — top-level useEffect
let hasTriggered = false;
useEffect(() => {
  if (hasTriggered) return;
  hasTriggered = true;
  void proactiveTriggerService.onAppOpen(repositories);
}, []);
```

- No component mount calls the LLM.
- No widget render calls the LLM.
- No recommendation card calls the LLM.

### 4.3 Optional Event Triggers (future)

Signals like `goal_completed`, `project_completed`, `project_became_stale`, `weekly_review_completed` can mark "evaluation requested" via `proactiveTriggerService.requestEvaluation()`. They do NOT bypass the 24h cooldown.

## 5. Signal Architecture

**File:** `src/services/ai/proactive/deterministicSignalEngine.ts`

Each signal is a pure function returning `Candidate[]`.

### Signal Types

| Signal | Scope | Source | Dedupe Key |
|--------|-------|--------|------------|
| `goal_inactive` | goal | `getGoalHealthMetrics` stalled goals | `goal_inactive:{goalId}` |
| `goal_without_clear_next_action` | goal | goal state + tasks + activities + projects + sub-goals (multi-signal) | `goal_no_action:{goalId}` |
| `project_stalled` | project | `getProjectHealthMetrics` HealthSignal | `project_stalled:{projectId}` |
| `skill_evidence_gap` | skill | `getSkillMetrics().skillsWithoutRecentEvidence` | `skill_gap:{skillId}` |
| `life_area_attention` | life_area | distribution + trends (user-relative, NOT hard threshold) | `life_area:{areaId}` |
| `execution_decline` | global | `getExecutionMetrics` + `getTrendMetrics` | `exec_decline:{period}` |
| `learning_without_application` | global | activities + tasks + projects (broad evidence) | `learning_gap:{period}` |
| `completed_goal_followup` | goal | goals with `completed_at` in period | `goal_done:{goalId}` |
| `idea_opportunity` | idea | captures × goals overlap | `idea_opp:{categoryId}:{goalId}` |

### Mandatory Adjustments

#### Life Area Attention (NO hard threshold)

Do NOT use a hard-coded `< 10%` rule. Instead:

1. Compute each area's `percentOfTotal` and `trend` direction.
2. Build a **user-relative baseline**: average percent over the last 3 periods (or historical mean if available).
3. Flag an area when its current percent deviates significantly below its own baseline AND its trend is `'decreased'`.
4. If no defensible baseline exists (< 2 prior periods), expose the raw distribution/trend signal in `evidence` but **do not force a recommendation**. The AI may still choose not to recommend.

#### Learning Without Application (broad evidence)

Do NOT rely only on `ActivityCategory` values (`Study & Research` vs `Deep Work`). Aggregate evidence across:

- **Activities:** category-based (study vs deep work vs skill acquisition)
- **Tasks:** tasks tagged with learning-related goals vs application-related goals
- **Projects:** project state changes indicating application of learned concepts

The signal fires when: learning evidence count > 3 AND application evidence count < 1 within the period, across all three sources combined.

#### Goal Without Clear Next Action (semantic)

Use the semantic concept `goal_without_clear_next_action`, not just "0 open tasks."

Before emitting a strong candidate, evaluate ALL of:

- Goal state (active, not completed)
- Open tasks linked to the goal (including via sub-goals)
- Recent activities with `related_goal_id`
- Projects linked via `skill_goal_relations` or `goal_id`
- Sub-goals with their own open tasks

A goal has a "clear next action" if ANY of:
- It has ≥ 1 open task
- It has ≥ 1 active sub-goal with open tasks
- It has a recent qualifying activity (< 7 days)
- It has a linked active project with recent activity

Only when NONE of these are true → emit candidate.

## 6. Candidate Ranking

**File:** `src/services/ai/proactive/candidateRanker.ts`

Deterministic scoring (0-100):

| Dimension | Weight |
|-----------|--------|
| severity (high=40, medium=25, low=10) | 40 |
| evidenceStrength (count × recency decay) | 25 |
| scopeImportance (goal > project > skill > life_area > global) | 15 |
| nonDuplication (fingerprint not already pending) | 15 |
| actionability (clear next action available) | 5 |

**Threshold:** minimum score 35 to be eligible.  
**Cap:** top 3 candidates sent to AI.  
**Preference:** 1 strong candidate > 10 weak candidates.

## 7. Recommendation Data Model

### Types

```typescript
type RecommendationType =
  | 'goal_next_action' | 'goal_inactive'
  | 'project_next_action' | 'project_stalled'
  | 'learning_gap' | 'learning_without_application'
  | 'skill_evidence_gap'
  | 'life_area_attention'
  | 'execution_decline'
  | 'idea_opportunity'
  | 'completed_goal_followup';

type RecommendationStatus =
  | 'pending' | 'accepted' | 'edited' | 'dismissed' | 'completed' | 'expired';

interface AIRecommendation {
  id: string;
  type: RecommendationType;
  title: string;
  description: string;
  reason: string;
  confidence: number;       // 0.0-1.0
  status: RecommendationStatus;
  targetType?: string;
  targetId?: string;
  scopeType?: string;
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

interface AIRecommendationRun {
  id: string;
  started_at: string;
  completed_at?: string;
  status: 'running' | 'completed' | 'no_candidates' | 'failed';
  candidate_count: number;
  ai_call_count: number;
  recommendation_count: number;
  error_code?: string;
  tokens_in?: number;
  tokens_out?: number;
  estimated_cost?: number;
  policy_version: string;
}
```

### Schema (Dexie v17)

```typescript
this.version(17).stores({
  ai_recommendation_runs: 'id, status, completed_at, [status+completed_at]',
  ai_recommendations: 'id, type, status, fingerprint, target_type, target_id, created_at, expires_at, [status+created_at], [target_type+target_id], [fingerprint+status]',
});
```

**Indexes:**
- `[status+completed_at]` — find latest completed run for cooldown check
- `[status+created_at]` — active recommendations sorted by date
- `[target_type+target_id]` — find recommendations for a specific entity
- `[fingerprint+status]` — deduplication lookup

## 8. Recommendation Lifecycle

```
created (status=pending)
  ├── Accept   → status=accepted → ActionProposal → ActionPolicy → status=completed
  ├── Edit     → status=edited   → modified suggestion → ActionPolicy → status=completed
  ├── Dismiss  → status=dismissed, dismissed_at set
  ├── Expired (target done) → status=expired
  └── Expired (time)       → status=expired
```

### Dismissal Rule

Dismissed recommendations do NOT return unchanged. Reappearance requires:
- Fingerprint no longer matches (materially different evidence), OR
- 30+ days elapsed since dismissal AND signal is still present with higher severity

### Expiration

At every trigger pass, any `status === 'pending'` recommendation whose:
- `expires_at < now`, OR
- target entity status is `completed` or `archived`

→ set `status = 'expired'`.

## 9. Suggested Action Allowlist (MANDATORY)

The model MUST NOT choose arbitrary write tools. Each recommendation type is validated against an explicit allowlist:

| Recommendation Type | Allowed Tools |
|---------------------|---------------|
| `goal_next_action` | `createTask` |
| `goal_inactive` | `createTask`, `updateGoal` |
| `project_next_action` | `createTask` |
| `project_stalled` | `createTask` |
| `learning_gap` | `createTask`, `createGoal` |
| `learning_without_application` | `createTask` |
| `skill_evidence_gap` | `createTask` |
| `life_area_attention` | `createTask`, `updateGoal` |
| `execution_decline` | `createTask` |
| `idea_opportunity` | `createTask`, `createGoal` |
| `completed_goal_followup` | `createTask` |

**Forbidden tools for proactive recommendations:**
- `archiveGoal`, `archiveProject` (destructive)
- `archiveMemory` (destructive)
- Any idea write tool (scope-isolated)
- Any tool not in the allowlist above

**Validation:** `recommendationValidator.ts` checks every `SuggestedAction.toolName` against the allowlist before persisting. Non-conforming recommendations are rejected.

## 10. AI Context Architecture

**File:** `src/services/ai/proactive/recommendationContextBuilder.ts`

For each candidate, builds bounded context:

```typescript
{
  candidate: { signalType, scope, severity, evidence },
  relevantMetrics: { only metrics that produced this signal },
  relevantEntities: { the specific goal/project/skill/area record },
  relatedActivities: { up to 5 most recent related },
  relatedTasks: { up to 5 related open tasks },
  recentIdeaContext: { if applicable, up to 2 ideas, metadata only }
}
```

**Never sends:**
- Full DB dump
- Full Point Ledger
- All activities or goals
- Full conversation history
- Binary data (data: URLs redacted to `[embedded type] label`)

**Budget:** ~3500 tokens per candidate.

## 11. Structured Output

AI must return:

```json
{
  "recommendations": [
    {
      "type": "goal_inactive",
      "title": "Revive Branding Strategy momentum",
      "description": "...",
      "reason": "...",
      "confidence": 0.85,
      "target": { "type": "Goal", "id": "..." },
      "suggestedActions": [
        {
          "toolName": "createTask",
          "parameters": { "title": "...", "related_goal_id": "..." },
          "label": "Create a next action task"
        }
      ],
      "evidenceSources": ["goal:Branding Strategy", "0 activities in 14 days"]
    }
  ]
}
```

**Validation (`recommendationValidator.ts`):**
- Required fields present
- `type` is a known `RecommendationType`
- `suggestedActions[].toolName` is in the allowlist for that type
- `evidenceSources` is non-empty
- `confidence` is 0.0-1.0
- `target.type` is a known entity type

Malformed output → reject entire batch, log audit event, persist run with `status: 'failed'`, `error_code: 'malformed_output'`.

## 12. Fingerprinting

**File:** `src/services/ai/proactive/fingerprintService.ts`

```
SHA-256(
  signalType +
  scopeType +
  scopeId +
  normalizedIntent (lowercased title stem)
)
```

- Deterministic for same input
- Differs for different intent/target
- Checked before persisting: if `[fingerprint+status]` already has a `pending` recommendation → skip
- Checked before persisting: if same fingerprint was `dismissed` within 30 days at same severity → skip

## 13. Homepage UI

**File:** `src/features/dashboard/AIInsightsWidget.tsx`

- Renders as Section 5 on `DashboardPage`
- **Never invokes AI** — reads from `recommendationRepo.getActive()`
- Max 3 visible recommendations
- Hidden when 0 active recommendations
- "Why am I seeing this?" collapsible — factual evidence only
- Actions: Accept / Edit / Dismiss
- Shows "Last analyzed: Nh ago" from latest run

## 14. ActionPolicy Integration

Acceptance flow (reuses existing infrastructure):

1. User clicks **Accept** → `recommendationService.acceptRecommendation(id)`
2. Service: `status = 'accepted'`, `accepted_at = now`
3. Service: creates `ActionProposal` from first `suggestedAction`
4. UI: shows existing confirmation modal
5. On confirm: `ActionPolicy.executeApprovedAction(proposal, ctx)`
6. Dispatches to `WriteToolExecutors` or `IdeaToolExecutors`
7. On success: `status = 'completed'`, `completed_at = now`, audit event logged

**No new confirmation system.** No new mutation paths.

## 15. Cost Control

| Guard | Mechanism |
|-------|-----------|
| 1 batch / 24h | Persisted `ai_recommendation_runs` + atomic claim |
| 0 AI calls when no candidates | Deterministic engine runs first |
| Bounded context | ~3500 tokens per candidate, top 3 |
| Token tracking | `aiRepo.logRequest()` per provider call |
| Cost estimation | `calculateEstimatedCost()` from model catalog (null if unknown) |
| No DB dump | `RecommendationContextBuilder` fetches only relevant slices |

## 16. Failure Handling

| Failure | Behavior |
|---------|----------|
| Signal engine throws | No AI call. Run `status: 'failed'`, `error_code: 'signal_engine_error'` |
| Provider unavailable | Retain previous recommendations. Run `status: 'failed'`, `error_code: 'provider_unavailable'` |
| Malformed AI output | Reject batch. Log audit. Run `status: 'failed'`, `error_code: 'malformed_output'` |
| Unsupported type | Reject that recommendation only. Others may persist. |
| DB write fails | Do not surface as persisted. Show error. |
| Missing policy file | Fail closed. No recommendation. Log error. |

## 17. Integration Points

### Reads from existing

- `IAIProvider` (contract)
- `PersonalAgentCore.configureFromSettings()` / `.getProvider()`
- Module 10 metrics (10 functions)
- `aiRepo.logRequest()` / `logAuditEvent()` / `getSettings()`
- `ActionPolicy.executeApprovedAction()`
- `WriteToolExecutors` (existing write tools)

### Adds to existing

- 3 read tools in `AI_TOOL_DEFINITIONS`
- Dexie v17 schema (2 tables)
- 1 widget on DashboardPage
- 1 top-level `useEffect` in App.tsx

### Does NOT modify

- `ActionPolicy` logic
- `IdeaAgentCore` or idea tools
- Module 09 review files
- Module 10 metrics files
- Any Idea Capture / Workspace files

## 18. Testing

See `docs/testing/ai-testing.md` for full strategy.

**Module 11 specific:** `src/tests/verify_module_11_proactive.ts`

Covers: cooldown, signals, ranking, fingerprinting, AI validation, lifecycle, policy loading, context bounding, safety, cost.

## 19. Implementation Phases

| Phase | Work |
|-------|------|
| 1 | Documentation + policy architecture |
| 2 | Recommendation types / repository / schema |
| 3 | 24h trigger / run state |
| 4 | Deterministic signal engine |
| 5 | Candidate ranking / deduplication |
| 6 | Policy loader |
| 7 | AI recommendation generation |
| 8 | Structured validation |
| 9 | Recommendation persistence / lifecycle |
| 10 | Homepage UI |
| 11 | ActionPolicy integration |
| 12 | AI read tools |
| 13 | Tests |
| 14 | Runtime verification |
| 15 | Typecheck / build |
