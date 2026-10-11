# Aura Leveling — System Architecture

> Last updated: 2026-09-02

## Overview

Aura Leveling is a **local-first, privacy-preserving personal operating system** built on React 19 + TypeScript + Dexie (IndexedDB) + Tailwind v4. All data lives in the user's browser. No cloud, no account, no telemetry.

The application is structured around **11 modules** layered over a shared AI foundation. The AI layer provides a pluggable provider abstraction, a tool-based action system, and a confirmation-gated mutation pipeline — ensuring the AI can never silently mutate user data.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          USER INTERFACE                          │
│   Dashboard · Idea Capture · Review · Settings · ...            │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    REACT HOOKS / PROVIDERS                        │
│   useCaptures · useTasks · useGoals · useSettings · ...         │
│   RepositoryProvider · SettingsProvider · ReviewFilterProvider   │
└──────────────────────────────┬──────────────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          ▼                    ▼                    ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────┐
│  REPOSITORIES    │ │  AI LAYER        │ │  ANALYTICS            │
│  (Dexie adapters)│ │  (providers,     │ │  (Module 09 review,   │
│                  │ │   agents, tools, │ │   Module 10 metrics,  │
│  IContracts      │ │   policies)      │ │   Module 11 signals)  │
└────────┬─────────┘ └────────┬─────────┘ └──────────┬───────────┘
         │                    │                      │
         └────────────────────┼──────────────────────┘
                              ▼
                   ┌──────────────────────┐
                   │    Dexie IndexedDB   │
                   │   posDexieDb.ts      │
                   │   37 tables, v17     │
                   └──────────────────────┘
```

## Data Flow

1. **User action** → React component calls a hook (`useCaptures.createCapture`, etc.)
2. **Hook** calls a repository contract method
3. **Dexie adapter** executes IndexedDB transaction
4. **UI** re-renders from updated hook state

For **AI-driven actions**:

1. **User prompt** → `PersonalAgentCore.processUserTurn()`
2. **ContextRouter** classifies intent + routes domains
3. **ContextBuilder** fetches bounded data via read tools
4. **IAIProvider.generateResponse()** produces response (text or ActionProposal)
5. If proposal → user confirms → `ActionPolicy.executeApprovedAction()`
6. ActionPolicy dispatches to `WriteToolExecutors` or `IdeaToolExecutors`
7. Executor writes to DB + logs `AIAuditEvent`

## Module Map

| Module | Purpose | Key Files |
|--------|---------|-----------|
| 01 | Core foundation, routing, providers | `src/app/` |
| 02 | Vision & long-term direction | `src/features/vision/` |
| 03 | Strategic goals (nested) | `src/features/goals/` |
| 04 | Development levels + requirements | `src/features/levels/` |
| 05 | Active projects | `src/features/projects/` |
| 06 | Skills + evidence + history | `src/features/skills/` |
| 07 | Practices + point ledger | `src/features/practices/`, `src/services/points/` |
| 08 | Idea Capture (unified) | `src/features/idea-capture/` |
| 09 | Review Dashboard | `src/features/review/`, `src/services/analytics/reviewAnalyticsService.ts` |
| 10 | Metrics & analytics | `src/services/analytics/metricsService.ts` |
| **11** | **Proactive AI Intelligence** | **`src/services/ai/proactive/`** |

## AI Architecture

See `docs/ai/proactive-intelligence.md` for Module 11 details.

### Provider Layer

```
IAIProvider (contract)
├── OpenRouterProvider    — real LLM via OpenAI-compatible protocol
├── DevelopmentMockProvider — keyword-matched responses (12 intents)
└── IdeaMockProvider       — idea-scoped mock (Arabic + English)
```

**Selection:** `PersonalAgentCore.configureFromSettings(settings)` switches provider based on `settings.provider`.

### Agent Layer

- **PersonalAgentCore** — global assistant; uses `ContextRouter` + `ContextBuilder`
- **IdeaAgentCore** — scoped to ONE idea; substitutes `IdeaMockProvider` in dev mode; uses `IDEA_TOOL_DEFINITIONS` only

### Tool Layer

- **Global tools (40):** 26 read + 10 write + 4 metrics
- **Idea tools (13):** 4 read + 9 write (physically isolated)
- **Proactive tools (3):** read-only recommendation queries

### Action Policy

All write operations flow through `ActionPolicy`:

1. `isConfirmationRequired(toolName)` — checks tool definition
2. `validateActionParameters(toolName, params)` — guardrails
3. `executeApprovedAction(proposal, ctx)` — dispatches to executor
4. Executor writes + logs audit event

## Runtime Policy System

The AI receives **Markdown policy documents** at runtime:

```
src/services/ai/policies/
├── SOUL.md                    — role, tone, epistemic humility
├── PERSONAL_OS_RULES.md       — system semantics
├── RECOMMENDATION_RULES.md    — recommendation quality rules
└── DOMAIN_KNOWLEDGE.md        — domain concepts
```

These are loaded via Vite's native `?raw` import (see `docs/ai/policy-loading.md`). They are **runtime AI instructions**, not coding assistant instructions.

## Key Invariants

1. **Provider abstraction** — never depend on concrete providers
2. **No direct DB mutation from AI** — always through ActionPolicy
3. **Audit on write** — every mutation logs `AIAuditEvent`
4. **Idea scope enforcement** — `ideaId` bound per session, checked before every mutation
5. **24h proactive cooldown** — MAX 1 AI batch per 24h, persisted in DB
6. **Recommendation isolation** — proposals only, never mutations
7. **Data URL redaction** — never send base64 to AI providers

## Storage

- **Database:** Dexie (IndexedDB wrapper), schema v17, 37 tables
- **Backup:** `ExportService` — full export/import/clear with backward compatibility
- **Schema changes:** always additive, backward-compatible

## Testing

- **Node-level:** `verify_module_NN_*.ts` suites using `fake-indexeddb`
- **Browser E2E:** Puppeteer-core + headless Edge, temporary scripts
- **AI testing:** mock provider branches for determinism

## Documentation

| Audience | Location |
|----------|----------|
| Coding assistants | `AGENTS.md`, `docs/` |
| Runtime AI | `src/services/ai/policies/` |
| Module 11 design | `docs/ai/proactive-intelligence.md` |
| Policy loading | `docs/ai/policy-loading.md` |
