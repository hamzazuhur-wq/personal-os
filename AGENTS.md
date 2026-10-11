# AGENTS.md — focused-salk (Aura Leveling)

This file holds project-specific context for the `focused-salk` Aura Leveling repository (React 19 + TypeScript + Dexie + Tailwind v4).

## Repository
- Name: focused-salk (branch: `codex/quick-capture`)
- Tech: React 19, TypeScript, Dexie (IndexedDB), Tailwind v4, custom router (no React Router)
- Architecture: modular feature flags across `src/features/*`, shared in `src/services/*`, Dexie repos in `src/services/adapters/dexie/`

## Build & Test Commands
```bash
npm install        # setup
npm run dev        # vite dev server on localhost:5173
npm run build      # production build (TypeScript + Vite)
npm run test       # run unit tests
npm run test:ui    # run component tests in UI
npm run lint       # lint
npm run format     # format with prettier
npm run typecheck  # TypeScript type checking
```

## Key Architectural Notes
- AppShell + AppSidebar layout in `src/app/`
- 14 Dexie repositories via React Context (`RepositoryProvider.tsx`)
- AI settings + provider registry in `src/services/ai/`
- Runtime AI policy documents in `src/services/ai/policies/` (NOT to be confused with agent-level SOUL.md/USER.md)

## Working Conventions
- Feature flags gate modules under `src/features/`
- Dexie schemas in `src/services/adapters/dexie/posDexieDb.ts`
- Components: `src/components/` shared, plus per-feature folders
- Hooks: `src/hooks/` (useTasks, useCaptures, etc.)
- Types: `src/types/`

## Task Context
If this is an AI coding task spawned by Hermes (e.g. a codex/opencode/delegate_task run), the parent Hermes agent carries the global persona (SOUL.md / USER.md). This file is purely repo-local context: build commands, architecture map, and conventions.
