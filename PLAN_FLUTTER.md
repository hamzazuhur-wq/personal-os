# Aura Leveling → Flutter: Conversion Plan

## Overview
**Project**: focused-salk (Aura Leveling) — Personal Operating System
**Goal**: Convert the React web app to Flutter Android app
**Approach**: "Prototype-first" + vertical slices — same as Baytna workflow
**Stack**: Flutter + Riverpod + Drift (local) + Supabase (cloud sync) + same i18n pattern as Baytna

---

## 1. Source Inventory

### 1.1 Features (16 modules)

| # | Module | Route | Core Entities | Pages | Components |
|---|--------|-------|---------------|-------|------------|
| 01 | Dashboard (Command Center) | `/` | — | 1 | 5 |
| 02 | Idea Capture | `/ideas` | Capture, IdeaRevision, IdeaCategory | 2 (list + workspace) | 5 |
| 03 | Daily Log | `/daily-log` | Activity | 1 | 5 |
| 04 | Tasks | `/tasks` | Task | 1 | 4 |
| 05 | Weekly Review | `/weekly-review` | WeeklyFocus | 1 | 6 |
| 06 | Settings | `/settings` | UserSettings | 1 | 3 |
| 07 | Vision | `/vision` | Vision, LifeArea, AreaVision, VisionItem | 1 | — |
| 08 | Goals | `/goals` | Goal | 2 (list + detail) | 7 |
| 09 | Levels | `/levels` | Level, LevelRequirement, LevelMilestone, RequirementEvidence | 3 (list + area + detail) | 9 |
| 10 | Projects | `/projects` | Project | 2 (list + detail) | 8 |
| 11 | Skills | `/skills` | Skill, SkillEvidence, SkillHistory | 2 (list + detail) | 7 |
| 12 | Execution | `/execution` | Task (filtered) | 1 | 10 |
| 13 | Practices | `/practices` | Practice, PointLedgerEvent | 1 | 8 |
| 14 | AI Chat | `/ai` | AIConversation, AIMessage, AIMemory | 1 | 14 |
| 15 | Review | `/review` | — | 2 (overview + life-area) | 12 |
| 16 | Weekly Overview | `/weekly` | WeeklyFocus | 1 | 6 |

**Total**: ~24 pages, ~130+ components

### 1.2 Data Layer

**Dexie Schema** (`AuraDexieDB`) — 29 tables across 17 migrations:
- `captures`, `activities`, `tasks`, `weekly_focus`, `settings`
- `visions`, `life_areas`, `area_visions`, `current_states`, `vision_items`
- `goals`
- `levels`, `level_requirements`, `level_skills`, `level_milestones`, `requirement_evidence`, `level_history`, `progression_exceptions`
- `projects`
- `skills`, `skill_history`, `skill_evidence`, `skill_goal_relations`, `skill_project_relations`, `skill_level_relations`
- `ai_conversations`, `ai_conversation_groups`, `ai_messages`, `ai_memories`, `ai_audit_events`, `ai_settings`, `ai_request_logs`, `ai_provider_connections`
- `practices`, `point_ledger`
- `idea_revisions`, `idea_categories`
- `ai_recommendation_runs`, `ai_recommendations`

### 1.3 AI Layer

- **Providers**: IAIProvider interface + 5 implementations (DevelopmentMock, OpenRouter, OpenAI Compatible, Idea, Recommendation)
- **Agent**: PersonalAgentCore, ContextBuilder, ContextRouter, ActionPolicy
- **Eval**: AIEvaluationSuite (15 scenarios)
- **Proactive**: RecommendationEngine, DeterministicSignalEngine, FingerprintService
- **Conversations**: TitleService, ClassificationService
- **Settings**: AISettingsService, ModelCatalog, ProviderConnectionService

### 1.4 Shared Services

- `src/hooks/` — useAIAgent, useAISettings, useAIMemory, useGoals, useLevels, useProjects, useSkills, useExecution, usePractices, useVision
- `src/components/shared/` — LiveClock, SectionHeader, StatWidget, EmptyState, Skeleton
- `src/components/ui/` — Button, Badge, Select, Modal, etc.
- `src/utils/` — idGenerator, dateUtils, cn

---

## 2. Conversion: React → Flutter Mapping

| React Concept | Flutter Equivalent |
|---|---|
| React 19 + hooks | Flutter StatefulWidget/StatelessWidget + Riverpod |
| Tailwind v4 + cn() | Flutter theme + custom Widget library |
| React Context (RepositoryProvider) | Riverpod (ProviderScope) |
| Dexie (IndexedDB) | Drift (SQLite) |
| React Router (custom) | go_router |
| Lucide React icons | flutter_lucide |
| Recharts | fl_chart |
| Vite dev server | flutter run |
| TypeScript .tsx | Dart .dart |
| .env variables | flutter_dotenv |
| AI via HTTP proxy | Same pattern (server AI proxy) |

---

## 3. Build Phases

### Phase 0: Project Scaffold (like Baytna)
- [ ] Create Flutter project with `flutter create`
- [ ] Add dependencies: riverpod, drift, drift_dev, go_router, flutter_lucide, fl_chart, shared_preferences, intl
- [ ] Set up folder structure mirroring React features (features/, core/, data/, etc.)
- [ ] Set up i18n: AR (RTL) + EN (LTR), locale_provider, SharedPreferences persistence
- [ ] Set up theme: dark-first (matches current UI), Tajawal font
- [ ] Set up Supabase config (same pattern as Baytna)

### Phase 1: Data Layer (Drift)
- [ ] Create Drift database with all 29 tables
- [ ] Write migration strategy (17 versions)
- [ ] Create DAOs for each table
- [ ] Verify schema matches React Dexie schema

### Phase 2: Navigation & Shell
- [ ] Bottom navigation (mobile equivalent of AppSidebar)
- [ ] go_router setup with all 16 routes
- [ ] AppShell with bottom nav

### Phase 3: Core Modules (MVP)
Priority order (like Baytna's feature-first approach):
1. **Dashboard** — simplest, validates the shell works
2. **Tasks** — core CRUD, familiar pattern
3. **Daily Log** — activity tracking
4. **Goals** — hierarchical goals
5. **Levels** — development levels with requirements/milestones
6. **Projects** — active projects

### Phase 4: AI Layer
- [ ] Port IAIProvider interface to Dart
- [ ] DevelopmentMockProvider (same logic as TS version)
- [ ] OpenRouterProvider (HTTP via Dart http package)
- [ ] AgentCore, ContextBuilder, ContextRouter, ActionPolicy in Dart
- [ ] AISettingsService, ProviderConnectionService
- [ ] AI Chat UI (14 components → Flutter)

### Phase 5: Secondary Modules
7. **Skills** — skill matrix
8. **Practices** — practices + points ledger
9. **Vision** — life areas, vision items
10. **Execution** — filtered task views
11. **Review** — analytics charts

### Phase 6: Idea Capture + Settings
12. **Idea Capture** — captures, revisions, categories
13. **Settings** — data management (export/import), AI settings, categories

### Phase 7: i18n + Polish
- [ ] Full Arabic translation of every string
- [ ] RTL layout verification
- [ ] Dark mode refinement
- [ ] APK build

---

## 4. Key Decisions (Same as Baytna)

| Decision | Choice |
|---|---|
| State management | Riverpod (flutter_riverpod) |
| Local database | Drift (same as Baytna) |
| Cloud sync | Supabase (same pattern as Baytna) |
| Routing | go_router |
| i18n | AR/EN, locale persisted in SharedPreferences |
| Font | Tajawal (same Arabic font as Baytna) |
| Currency | Not applicable (Personal OS, no financial data) |

---

## 5. Estimated Effort

| Phase | Complexity | Notes |
|---|---|
| Phase 0: Scaffold | Low | Baytna pattern, well-known |
| Phase 1: Data Layer | High | 29 tables, 17 migrations |
| Phase 2: Navigation | Medium | 16 routes |
| Phase 3: Core Modules | High | 6 features, ~60 components |
| Phase 4: AI Layer | Very High | Complex logic, 15 test scenarios |
| Phase 5: Secondary | High | 5 features, ~40 components |
| Phase 6: Idea + Settings | Medium | 2 features, ~17 components |
| Phase 7: i18n + Polish | Medium | Full translation + APK |

**Total**: ~7 phases, similar to Baytna's build timeline

---

## 6. Next Step (User Decision)

Per the "prototype-first" Baytna workflow:
- **Next**: Create HTML wireframe/mockup of the app shell + 2-3 key screens
- User reviews and approves the design direction
- Then start Phase 0 (scaffold)

**Or**: Start immediately with Phase 0 (scaffold) and iterate.
