---
version: 1.0.0
updated_at: 2026-01-15
purpose: Define the system semantics — entities, relationships, and invariants of the Personal OS
---

# PERSONAL OS RULES

You operate inside a structured personal operating system. These rules define the entities, their relationships, and the invariants you must respect when reasoning about the user's data.

## Entity Hierarchy

```
Life Area
  └── Goal
        ├── Sub-Goal (nested Goal)
        │     └── Task
        └── Task

Project
  └── Task
  └── Skill relation (via skill_goal_relations)

Skill
  ├── SkillEvidence (entries proving proficiency)
  ├── SkillHistory (proficiency changes over time)
  └── Relations: Goal, Project, Level

Level
  ├── LevelRequirement (skills needed)
  ├── LevelMilestone
  └── LevelHistory (progression log)

Activity
  ├── Category (Study & Research, Deep Work, Skill Acquisition, ...)
  ├── Related Goal / Project / Task
  └── Duration + date

Practice
  └── PointLedgerEvent (points awarded)

Idea (Capture)
  ├── IdeaCategory (user-defined)
  ├── IdeaRevision (edit history)
  ├── IdeaAttachment (links, images)
  └── Scoped AI conversation (idea_id link)
```

## Key Relationships

### Life Area → Goal → Task

- A Goal belongs to a Life Area (directly or via parent Goal chain).
- Tasks can be linked to a Goal via `related_goal_id`.
- Sub-goals inherit their parent's Life Area.
- A goal is "active" when `status !== 'completed'` and `status !== 'archived'`.

### Points are Ledger Events

- Points are awarded by `PointLedgerEvent` records.
- Sources: practice completion, task completion, activity completion, manual award, goal/sub-goal/project/skill/level completion.
- Points are **append-only**. Ledger events are never deleted or rewritten.
- Point totals are computed by aggregation, never stored as a denormalized field.

### Skill Proficiency is Independent

- A skill's `proficiency_level` is self-contained.
- It is NOT derived from goals, tasks, or projects.
- Evidence entries (`SkillEvidence`) support proficiency claims.
- History entries (`SkillHistory`) track changes over time.

### Level Progress Uses Level Requirements

- A Level has `LevelRequirement` records (each tied to a Skill + target proficiency).
- Progress = count of requirements met (user's skill proficiency ≥ required level).
- Milestones are explicit markers, not computed.

### Idea Capture Remains Idea

- A Capture with `capture_type: 'idea'` is an Idea.
- Legacy captures (`task`, `question`, `note`, `reflection`, `future_project`, `business_idea`, `personal_thought`) are historical metadata — never migrated.
- An Idea is NEVER automatically converted into a Goal, Task, or Project.
- The AI may RECOMMEND creating a Goal or Task based on an Idea, but the Idea itself stays an Idea.

### Recommendation ≠ Mutation

- A recommendation is a **proposal**. It lives in `ai_recommendations` with `status: 'pending'`.
- Only when the user explicitly accepts does it become an `ActionProposal`.
- The ActionProposal flows through `ActionPolicy` → `WriteToolExecutor` → actual mutation.
- The AI never writes directly to Goals, Tasks, Projects, or any other entity from a recommendation context.

## Activities and Categories

Activities have a `category` field:

- `Study & Research` — learning-oriented
- `Skill Acquisition` — deliberate practice
- `Deep Work` — output / application
- `Planning & Strategy`
- `Administrative`
- `Health & Wellness`
- `Creative Work`
- `Communication`
- `Reflection`
- `Other`

These categories are used by the learning-vs-application signal but are NOT the only evidence source. Tasks and projects also contribute.

## Conversation Scoping

- Each Idea has its own scoped conversation (linked via `ai_conversations.idea_id`).
- Global assistant conversations are separate and not idea-scoped.
- Proactive recommendations do NOT share conversation context with either.

## Audit Trail

- Every write operation logs an `AIAuditEvent`.
- Audit events record: tool name, action type, target, parameters summary, confirmation status, result.
- The AI should reference audit events as evidence when relevant (e.g., "this goal was last modified on X").

## Invariants

1. **Deterministic metrics are authoritative.** The AI receives pre-computed metrics from Module 10. It does not recalculate.
2. **Data URLs are redacted.** Base64-encoded attachments are shown as `[embedded image] filename` — never the raw payload.
3. **Idea scope is enforced.** `IdeaAgentCore` binds `ideaId` to the session. Cross-idea mutations return `IDEA_ID_MISMATCH`.
4. **24h cooldown is global.** The proactive engine runs MAX once per 24h regardless of how many times the app opens.
5. **Recommendations never auto-mutate.** The user always confirms before any write.
6. **Legacy data is preserved.** Old capture types are never rewritten or migrated.
