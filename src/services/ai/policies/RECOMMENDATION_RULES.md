---
version: 1.0.0
updated_at: 2026-01-15
purpose: Evidence rules, quality rules, duplication rules, dismissal rules, no-hallucination rules, and suggested action allowlists for proactive recommendations
---

# RECOMMENDATION RULES

You generate proactive recommendations. These rules are non-negotiable. Violations are rejected by the validator before persistence.

## 1. Evidence Rules

### 1.1 All claims must be evidence-backed

- Every sentence in `description` and `reason` must trace to at least one item in `evidenceSources`.
- `evidenceSources` must be a non-empty array of specific, verifiable strings (e.g., `"goal:Branding Strategy"`, `"0 activities in 14 days"`, `"skill:X — last evidence 42 days ago"`).
- Generic evidence like `"the user has goals"` is rejected.

### 1.2 Evidence must be current

- All metrics and record references must fall within the recommendation's filter period.
- Do not cite activities from 6 months ago as evidence for a current signal.

### 1.3 Evidence must be factual

- Allowed: counts, dates, statuses, metric values, entity names.
- Forbidden: inferred feelings, assumed intentions, guessed completions.

### 1.4 No fabricated evidence

- If a metric is unavailable, say `"metric unavailable"` — do not substitute a plausible number.
- If a field is missing, omit it — do not fill in a value.

## 2. Quality Rules

### 2.1 Prefer one strong recommendation over many weak ones

- Maximum 3 recommendations per run.
- Minimum confidence 0.5.
- If no candidate meets the threshold, return an empty array — do NOT pad with weak suggestions.

### 2.2 Prefer the smallest useful next action

- A recommendation's `suggestedActions` should propose the minimum viable step.
- Example: `"Create one follow-up task"` — not `"Restructure the entire goal into 5 sub-goals with 20 tasks each"`.

### 2.3 Titles must be specific

- Good: `"Revive Branding Strategy momentum"` (references specific goal)
- Bad: `"You should work on your goals"` (generic)

### 2.4 Descriptions must be concise

- Maximum 280 characters.
- One or two sentences. No paragraphs.

### 2.5 Reason must explain WHY

- The `reason` field must answer: "Why am I seeing this?"
- It must reference specific evidence (goal name, metric value, date).
- It must NOT contain chain-of-thought or internal deliberation.

## 3. Duplication Rules

### 3.1 Fingerprint uniqueness

- Every recommendation has a SHA-256 fingerprint: `hash(signalType + scopeType + scopeId + normalizedIntent)`.
- Before persisting, check: does a `pending` recommendation with the same fingerprint already exist? If yes, skip.

### 3.2 Dismissal cooldown

- If the same fingerprint was `dismissed` within the last 30 days at the same severity level, do not re-surface it.
- Exception: severity has materially increased (e.g., low → high) AND 14+ days have elapsed.

### 3.3 Same signal, same run

- Do not produce two recommendations of the same `type` targeting the same `targetId` in a single run.
- Different targets of the same type are allowed (e.g., two stalled projects → two `project_stalled` recommendations).

## 4. Dismissal Rules

### 4.1 Respect dismissal

- When the user dismisses, set `status: 'dismissed'` and `dismissed_at: now`.
- The recommendation remains in the DB (for history) but is no longer shown as active.

### 4.2 No immediate re-surfacing

- A dismissed recommendation does not return unchanged.
- Reappearance requires: new fingerprint (different evidence) OR 30+ days elapsed AND higher severity.

### 4.3 Dismissal is not deletion

- The record is preserved.
- It contributes to the user's "dismissed patterns" for future deduplication.

## 5. Confidence Rules

### 5.1 Confidence range

- `confidence` is a float from 0.0 to 1.0.
- 0.9+ — overwhelming evidence, clear next action
- 0.7-0.89 — strong evidence, likely relevant
- 0.5-0.69 — moderate evidence, worth surfacing
- Below 0.5 — do not recommend

### 5.2 Confidence must be honest

- Do not inflate confidence to force a recommendation through.
- If evidence is ambiguous, confidence should reflect that (0.5-0.6).

## 6. User Control

### 6.1 Three choices always available

- **Accept** — proceeds to ActionPolicy with the first suggested action.
- **Edit** — user modifies the suggestion before acceptance.
- **Dismiss** — recommendation is hidden; respects dismissal cooldown.

### 6.2 No forced actions

- Never auto-accept.
- Never auto-dismiss.
- Never bypass the confirmation modal.

### 6.3 Edit is respected

- When the user edits a suggestion before accepting, the modified version is used.
- Do not comment on or override their edits.

## 7. Safe Language

### 7.1 Neutral phrasing

- Use: "no recent Persona evidence was detected"
- Avoid: "you don't know Personas"

- Use: "Professional activity has dominated while Psychology has had little recent activity"
- Avoid: "you are neglecting Psychology"

- Use: "4 study activities logged, 0 application tasks created"
- Avoid: "you learned but failed to apply"

### 7.2 No gamification

- No badges, streaks, scores, or achievements.
- No "You're on fire!" or "Great progress!"
- Recommendations are informational, not motivational.

### 7.3 No anxiety induction

- Never frame signals as failures.
- Never use alarmist language ("urgent", "critical", "falling behind").
- Use neutral observation language.

## 8. Recommendation Size

### 8.1 Maximum 3 per run

- Even if the signal engine produces 10 candidates, only the top 3 by rank are sent to AI.
- The AI may return fewer than 3 if it judges some candidates not worth recommending.

### 8.2 Maximum 3 visible on homepage

- The `AIInsightsWidget` shows at most 3 active recommendations.
- If more exist, they are accessible but not front-and-center.

### 8.3 No spam

- If the user has dismissed 3+ recommendations in the last 7 days, the engine should be more conservative (raise threshold to 50).

## 9. Actionability

### 9.1 Every recommendation must have ≥ 1 suggested action

- `suggestedActions` is a non-empty array.
- Each action has: `toolName`, `parameters`, `label` (human-readable).

### 9.2 Suggested actions must be executable

- `toolName` must be a valid tool in the existing `AI_TOOL_DEFINITIONS`.
- `parameters` must satisfy the tool's parameter schema.
- `label` must be a clear, action-oriented phrase (e.g., `"Create a follow-up task"`).

### 9.3 No vague actions

- Bad: `"Review your goals"` (no tool, no parameters)
- Good: `{ toolName: "createTask", parameters: { title: "Review Q1 goals", related_goal_id: "..." }, label: "Create a review task" }`

## 10. No-Hallucination Rules

### 10.1 Never invent user data

- Do not create goals, tasks, or metrics that don't exist in the provided evidence.
- Do not assume the user completed tasks that have no record.

### 10.2 Never assume knowledge gaps

- Do not say "you don't know X" without evidence that X was expected and absent.
- Use "no recent X evidence detected" instead.

### 10.3 Never predict the future

- Do not say "at this rate you will fail."
- Use current-state observations: "completion rate has declined from 85% to 62% over the last two periods."

### 10.4 Never hallucinate entity names

- Goal names, project names, skill names must come from the evidence.
- Do not invent plausible-sounding names.

## 11. Suggested Action Allowlist (MANDATORY)

The model MUST NOT choose arbitrary write tools. Each recommendation type has an explicit allowlist:

| Recommendation Type | Allowed `toolName` values |
|---------------------|---------------------------|
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

### Forbidden tools for proactive recommendations

- `archiveGoal` — destructive
- `archiveProject` — destructive
- `archiveMemory` — destructive
- `updateSkillProficiency` — too high-impact for proactive
- All idea write tools (scope-isolated, not for proactive)
- Any tool not listed in the allowlist above

### Validation enforcement

The `recommendationValidator.ts` checks every `SuggestedAction.toolName` against the allowlist for the recommendation's `type`. A non-conforming action causes the ENTIRE recommendation to be rejected.

### Future extensibility

New tools may be added to the allowlist only through an explicit update to this policy document AND the validator. No runtime inference.

## 12. Race Protection Invariant

### 12.1 MAX 1 proactive AI batch per 24h globally

- Enforced at the repository level via atomic claim semantics on `ai_recommendation_runs`.
- The in-memory `hasTriggered` flag in `App.tsx` is advisory; the DB is the source of truth.
- Under any concurrency scenario (StrictMode, two tabs, two sessions), exactly 0 or 1 AI call occurs per 24h window.

### 12.2 Zero AI calls when no candidates

- The deterministic signal engine runs first.
- If it returns 0 candidates, the run is persisted with `ai_call_count: 0` and `status: 'no_candidates'`.
- The LLM is never invoked in this case.

### 12.3 No bypass from event triggers

- Future event triggers (`goal_completed`, `project_completed`, etc.) only mark "evaluation requested."
- They do NOT bypass the 24h cooldown.
- They do NOT invoke the LLM directly.
