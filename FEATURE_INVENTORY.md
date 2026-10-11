# Aura Leveling — Feature Inventory for Flutter Conversion

**Repo:** `focused-salk` (branch: `codex/quick-capture`)  
**Stack:** React 19 · TypeScript · Dexie (IndexedDB) · Tailwind v4 · Custom SPA router (no React Router)  
**Generated:** 2026-09-02

---

## Architecture Overview

- **Router:** Custom hash-less HTML5 history router in `App.tsx` — `pathToRoute()` / `routeToPath()` pair, `navigate()` via `window.history.pushState`
- **Layout:** `AppShell` + `AppSidebar` shell; `MobileNavigation` for small screens
- **State:** React Context providers — `RepositoryProvider` (14 Dexie repos), `SettingsProvider`, `ReviewFilterProvider`
- **Data:** 17-table Dexie schema (`PersonalOperatingSystemDB`) across 17 schema versions
- **AI:** Pluggable provider abstraction (`IAIProvider`), 3 live providers + 3 mocks; proactive recommendation engine with deterministic signal engine + AI ranking

---

## Feature Modules (14 routes)

### 1. Command Center (Dashboard)
- **Route:** `/` (default), legacy `/dashboard`
- **Page component:** `DashboardPage` (`src/features/dashboard/DashboardPage.tsx`)
- **Data models:** `Activity`, `Task`, `Goal`, `Project`, `Practice`, `LifeArea`
- **UI components (6):**
  - `LiveClock` — real-time clock with date display
  - `DashboardFocusCard` — weekly focus / strategic hero
  - `TodayActivitySummary` — today's logged activities diptych
  - `ActiveTasksWidget` — in-progress / due tasks sidebar
  - `RecentCapturesWidget` — latest idea captures stream
  - `IdeaComposerModal` — modal shell, delegates to `IdeaComposer`
- **Key interactions:** Quick-add task, log activity, open idea composer, navigate to weekly review
- **Modals:** `IdeaComposerModal`, `DailyActivityFormModal`, `TaskFormModal`
- **Complexity:** ★★☆☆☆ — aggregator / home screen; moderate React state, heavy hook dependencies

---

### 2. Idea Capture
- **Route:** `/ideas` (list), `/ideas/:id` (workspace)
- **Page components:** `IdeasPage`, `IdeaWorkspacePage` (`src/features/idea-capture/`)
- **Data models:** `Capture`, `IdeaRevision`, `IdeaCategory`
- **UI components (5):**
  - `IdeaComposer` — single creation surface (text / voice / AI voice)
  - `IdeaAssistantPanel` — AI organizing assistant sidebar
  - `IdeaWorkspacePage` — per-idea workspace with revisions
  - `AttachmentPickerModal`
  - `IdeaComposerModal` — modal wrapper for composer
- **Key interactions:** Create idea (text/voice/AI), categorize, search/filter by category, archive, delete, log-as-activity, open workspace
- **Complexity:** ★★★★☆ — core capture system; voice input, AI integration, revision history, attachment system

---

### 3. Daily Activity Log
- **Route:** `/daily-log`
- **Page component:** `DailyLogPage` (`src/features/daily-log/`)
- **Data models:** `Activity`
- **UI components (4):**
  - `DailyLogPage` — main page
  - `ActivityTimeline` — chronological activity feed
  - `ActivityItem` — individual activity row
  - `DailyMetrics` — daily stats strip
  - `DailyActivityFormModal` — log new activity (shared across features)
- **Key interactions:** Log activity (manual), view timeline by date, filter by category/status
- **Complexity:** ★★☆☆☆ — straightforward log + timeline; form is the complex piece (shared)

---

### 4. Actions & Tasks
- **Route:** `/tasks`
- **Page component:** `TasksPage` (`src/features/tasks/`)
- **Data models:** `Task`
- **UI components (5):**
  - `TasksPage` — main list
  - `TaskList` — task list renderer
  - `TaskItem` — individual task row
  - `TaskFormModal` — create/edit task
  - `TaskDetailModal` — task detail view
- **Key interactions:** CRUD tasks, filter by status/priority/project/goal, toggle completion
- **Complexity:** ★★☆☆☆ — standard CRUD list; task form is complex (shared across dashboard/execution/goals)

---

### 5. Weekly Overview
- **Route:** `/weekly-review`
- **Page component:** `WeeklyReviewPage` (`src/features/weekly-review/`)
- **Data models:** `WeeklyFocus`, `Activity`, `Task`, `Practice`, `Goal`
- **UI components (6):**
  - `WeeklyReviewPage` — main layout
  - `WeeklyFocusCard` — focus areas for the week
  - `WeeklyGoalSummary` — goal progress strip
  - `WeeklyMetrics` — numeric KPIs
  - `WeeklyTimelineGrid` — day-by-day activity grid
  - `WeeklyDevelopmentPoints` — points summary
- **Key interactions:** Navigate to daily log for a specific day, view weekly KPIs
- **Complexity:** ★★★☆☆ — aggregation view; moderate chart/grid complexity

---

### 6. System Settings
- **Route:** `/settings`
- **Page component:** `SettingsPage` (`src/features/settings/`)
- **Data models:** `UserSettings`, `IdeaCategory`
- **UI components (3):**
  - `SettingsPage` — main settings shell
  - `DataManagement` — import/export/clear data
  - `IdeaCategoriesSettings` — category CRUD for ideas
- **Key interactions:** Manage idea categories, data backup/restore
- **Complexity:** ★★☆☆☆ — settings forms; data management involves Dexie bulk operations

---

### 7. Vision & Long-Term
- **Route:** `/vision`, `/vision/overview`, `/vision/life-areas`, `/vision/life-areas/:areaId`, `/vision/current-state`
- **Page component:** `VisionPage` (`src/features/vision/`)
- **Data models:** `Vision`, `LifeArea`, `AreaVision`, `CurrentState`, `VisionItem`
- **UI components:** VisionPage itself + `LifeAreaDevelopmentPoints` (from practices)
- **Sub-views:** Overview, LifeAreas list, LifeArea detail, Current State
- **Key interactions:** Edit main vision, CRUD life areas, define per-area visions, record current states, add S/W/C items
- **Forms:** `MainVisionForm`, `AreaVisionForm`, `CurrentStateForm`, `LifeAreaForm`, `ItemSection`
- **Complexity:** ★★★☆☆ — multi-step forms, in-place editing, sortable area list

---

### 8. Strategic Goals
- **Route:** `/goals`, `/goals/:id`
- **Page components:** `GoalsPage`, `GoalDetailPage` (`src/features/goals/`)
- **Data models:** `Goal`, `Task` (through goal-task relationships)
- **UI components (10):**
  - `GoalsPage` — main list/grid/tree view
  - `GoalDetailPage` — goal detail with sub-goals, linked tasks
  - `GoalRow` — list view row
  - `GoalCard` — grid view card
  - `GoalHierarchyTree` — tree view with drag indicators
  - `GoalFilters` — filter bar
  - `GoalStatusBadge` — status badge
  - `GoalTreeItem` — tree node
  - `GoalFormModal` — create/edit goal
  - `MoveGoalModal` — reparent goal (circular dependency prevention)
  - `MoveTaskModal` — move task between goals
- **Key interactions:** CRUD goals, 3 view modes (list/grid/tree), filter/sort, hierarchy management, move tasks between goals
- **Validation:** `goalValidation.ts`
- **Complexity:** ★★★★☆ — hierarchy management, circular dependency prevention, multi-view rendering

---

### 9. Development Levels
- **Route:** `/levels`, `/levels/:areaId`, `/levels/:areaId/:levelId`
- **Page components:** `LevelsPage`, `LifeAreaLevelsPage`, `LevelDetailPage` (`src/features/levels/`)
- **Data models:** `Level`, `LevelRequirement`, `LevelSkill`, `LevelMilestone`, `RequirementEvidence`, `LevelHistory`, `ProgressionException`
- **UI components (14):**
  - `LevelsPage` — overview grid of life-area level summaries
  - `LifeAreaLevelsPage` — levels for one life area
  - `LevelDetailPage` — single level detail
  - `LevelHero` — level header with progress
  - `LevelProgressionStrip` — visual level strip
  - `LevelRequirements` — requirements list
  - `LevelMilestones` — milestones
  - `LevelSkills` — linked skills
  - `LevelHistory` — history of completions
  - `LevelLinkedGoals` — goals tied to this level
  - `LifeAreaLevelSummary` — summary card per life area
  - `RequirementRow` — individual requirement
  - `ProgressionExceptionPanel` — exception handling UI
  - `ConfirmLevelCompletionModal` — confirm level up
  - `EvidenceFormModal` — submit requirement evidence
  - `LevelFormModal` — create/edit level
  - `MilestoneFormModal` — create/edit milestone
  - `RequirementFormModal` — create/edit requirement
  - `ProgressionExceptionFormModal` — log exception
- **Key interactions:** Level progression tracking, requirement evidence submission, milestone management, exception handling
- **Validation:** `levelValidation.ts`
- **Complexity:** ★★★★★ — most complex feature; gamification system with evidence chain, milestone tracking, progression rules

---

### 10. Active Projects
- **Route:** `/projects`, `/projects/:id`
- **Page components:** `ProjectsPage`, `ProjectDetailPage` (`src/features/projects/`)
- **Data models:** `Project`, `Task`, `Activity`, `Goal`, `Level`
- **UI components (11):**
  - `ProjectsPage` — main list with section grouping
  - `ProjectDetailPage` — project detail
  - `ProjectRow` — list row
  - `ProjectHero` — project header
  - `ProjectFilters` — filter bar
  - `ProjectActivities` — linked activities
  - `ProjectHistory` — status/history
  - `ProjectRelationships` — linked goals, skills, levels
  - `ProjectTasks` — linked tasks
  - `ProjectStatusBadge`
  - `ProjectFormModal` — create/edit project
  - `CompleteProjectModal` — mark complete
- **Key interactions:** CRUD projects, status transitions, link to goals/tasks/activities
- **Validation:** `projectValidation.ts`
- **Complexity:** ★★★☆☆ — project lifecycle, status machine, relationship management

---

### 11. Skill Matrix
- **Route:** `/skills`, `/skills/:id`
- **Page components:** `SkillsPage`, `SkillDetailPage` (`src/features/skills/`)
- **Data models:** `Skill`, `SkillHistory`, `SkillEvidence`, `SkillGoalRelation`, `SkillProjectRelation`, `SkillLevelRelation`
- **UI components (12):**
  - `SkillsPage` — main matrix view
  - `SkillDetailPage` — skill detail
  - `SkillMatrix` — grid of skill cards
  - `SkillRow` — list row
  - `SkillHero` — skill header
  - `SkillFilters` — filter bar
  - `SkillProficiencyIndicator` — proficiency level display
  - `SkillDevelopmentBadge` — development state badge
  - `SkillEvidence` — evidence list
  - `SkillHistory` — history log
  - `SkillRelationships` — linked goals/projects/levels
  - `SkillFormModal` — create/edit skill
  - `SkillEvidenceFormModal` — submit evidence
  - `SkillProficiencyModal` — update proficiency level
- **Key interactions:** CRUD skills, proficiency tracking, evidence submission, relationship management
- **Validation:** `skillValidation.ts`
- **Complexity:** ★★★★☆ — matrix view, proficiency state machine, evidence chain, junction tables

---

### 12. Execution Engine
- **Route:** `/execution`
- **Page component:** `ExecutionPage` (`src/features/execution/`)
- **Data models:** `Task`, `Project`, `Goal`
- **Sections (7):**
  - `ExecutionHeader` — page header with stats
  - `InProgressSection` — actively working tasks
  - `ReadyActionsSection` — next actions available
  - `BlockedWaitingSection` — blocked/waiting tasks
  - `DueAndOverdueSection` — time-sensitive tasks
  - `DailyPrioritiesSection` — user-prioritized daily list
  - `CompletedTodaySection` — done today
- **Modals (5):**
  - `FocusModeModal` — single-task focus view
  - `QuickNextActionModal` — create next action
  - `BlockTaskModal` — mark blocked with reason
  - `WaitingTaskModal` — mark waiting with expected date
  - `DailyPriorityPickerModal` — pick/排序 daily priorities
- **Components:** `ExecutionFiltersBar`, `ExecutionTaskRow`
- **Key interactions:** Start/complete/block/wait tasks, set daily priorities, focus mode, filter by project/goal
- **Validation:** `executionValidation.ts`
- **Complexity:** ★★★★☆ — complex state transitions, multi-section task management, focus mode

---

### 13. Development Practices & Points
- **Route:** `/practices`
- **Page component:** `PracticesPage` (`src/features/practices/`)
- **Data models:** `Practice`, `PointLedgerEvent`
- **UI components:**
  - `PracticesPage` — 3-tab layout
  - `PracticesHeader` — metrics strip
  - `PracticeCard` — catalog card
  - `PointLedgerTable` — audit table
  - `DevelopmentOverview` — dev points dashboard
  - `LifeAreaDevelopmentPoints` — per-area points
  - `DevelopmentPointsBlock` — points summary
  - `PointHistoryList` — history list
  - `PointStepper` — add/subtract points widget
  - `PracticeFormModal` — define practice
  - `LogPracticeModal` — log completion
  - `LedgerAdjustmentModal` — adjust ledger entry
- **Tabs:** Development Points / Practice Catalog / Point Ledger Audit
- **Key interactions:** Define practices, log completions (generates `PointLedgerEvent`), view ledger, make adjustments
- **Complexity:** ★★★★☆ — point ledger accounting system, multi-entity point attribution, adjustment mechanism

---

### 14. AI Intelligence
- **Route:** `/ai`
- **Page component:** `AIPage` (`src/features/ai/`)
- **Data models:** `AIConversation`, `AIConversationGroup`, `AIMessage`, `AIMemory`, `AIAuditEvent`, `AISettings`, `AIRequestLog`, `AIProviderConnection`, `AIRecommendation`, `AIRecommendationRun`
- **UI components (12):**
  - `AIPage` — 3-column layout (sidebar / chat / context)
  - `AIConversationSidebar` — conversation list + groups
  - `AIChat` — message feed + input
  - `AIContextPanel` — context + memories panel
  - `AISettingsPanel` — AI settings form
  - `AIMemoryManagerModal` — memory CRUD
  - `AIAuditLogModal` — request audit log
  - `AIConversationGroupModal` — group management
  - `AIConversationSearch` — search conversations
  - `AIMessageItem` — individual message
  - `AIModelIndicator` — model status display
  - `ModelSelector` — model picker
  - `ProviderConnectionForm` — add/edit provider connection
  - `ProviderConnectionList` — list connections
  - `AIActionProposalCard` — action proposal display
- **Key interactions:** Chat with AI, manage conversations/groups, configure providers, view audit logs, manage memories, human-in-loop action approval
- **Complexity:** ★★★★★ — full AI chat system, streaming, tool execution, multi-provider, action proposals, memory management

---

### 15. Review & Analytics
- **Route:** `/review` (overview), `/review/life-area/:id` (drilldown)
- **Page components:** `ReviewOverviewPage`, `LifeAreaReviewPage` (`src/features/review/`)
- **Data models:** Aggregated from all entity tables via `reviewAnalyticsService`
- **UI components (14):**
  - `ReviewOverviewPage` — global period review
  - `LifeAreaReviewPage` — per-area drilldown
  - `DateRangeBar` — date range selector
  - `KpiStrip` — KPI cards
  - `LifeAreaCards` — life area summary cards
  - `GoalExecutionBars` — goal progress bars
  - `TaskExecutionRadial` — task completion radial chart
  - `PointsTotalCard` — points total
  - `TrendChart` — trend line chart
  - `WhatHappenedTimeline` — timeline of events
  - `ReviewSummarySection` — AI-generated summary
  - `TaskDrilldownPanel` — task-level analysis
  - `PointBreakdownPanel` — point breakdown
  - `ProjectAnalysisSection` — project analysis
- **Charts:** Recharts (bar, radial, line)
- **Complexity:** ★★★★☆ — analytics aggregation, date range filtering, multi-entity drilldown

---

## AI Layer

### Providers (`src/services/ai/providers/`)
| Provider | File | Type |
|---|---|---|
| `IAIProvider` | `IAIProvider.ts` | Interface |
| `DevelopmentMockProvider` | `DevelopmentMockProvider.ts` | Mock |
| `OpenRouterProvider` | `OpenRouterProvider.ts` | Live |
| `OpenAICompatibleProvider` | `OpenAICompatibleProvider.ts` | Live |
| `IdeaMockProvider` | `IdeaMockProvider.ts` | Mock |
| `RecommendationMockProvider` | `RecommendationMockProvider.ts` | Mock |

### Agent Core (`src/services/ai/agent/`)
| File | Role |
|---|---|
| `agentCore.ts` | `PersonalAgentCore` — main turn handler, context building, provider routing |
| `ideaAgentCore.ts` | `IdeaAgentCore` — idea-specific AI processing |
| `contextBuilder.ts` | Builds bounded context payload for each turn |
| `contextRouter.ts` | Routes user prompt to domain area |
| `actionPolicy.ts` | Executes user-approved actions via tools |

### Proactive AI (`src/services/ai/proactive/`)
| File | Role |
|---|---|
| `aiRecommendationEngine.ts` | `AIRecommendationEngine` — generates structured recommendations from candidates |
| `deterministicSignalEngine.ts` | `DeterministicSignalEngine` — emits signals based on data patterns |
| `candidateRanker.ts` | `CandidateRanker` — ranks signal candidates before AI evaluation |
| `fingerprintService.ts` | `FingerprintService` — deduplication of recommendations |
| `policyLoader.ts` | Loads runtime policy documents |
| `policyLoaderCore.ts` | Core policy loading logic |
| `recommendationContextBuilder.ts` | Builds context for recommendation engine |

### Tools (`src/services/ai/tools/`)
| File | Tools |
|---|---|
| `toolRegistry.ts` | `AI_TOOL_DEFINITIONS` — all tool definitions |
| `readTools.ts` | Read operations (goals, tasks, projects, skills, practices) |
| `writeTools.ts` | Write operations (create/update tasks, log activities, etc.) |
| `ideaTools.ts` | Idea-specific operations |

### Routing & Services
| File | Role |
|---|---|
| `routingEngine.ts` | `RoutingEngine` — prompt routing |
| `conversationTitleService.ts` | Auto-generates conversation titles |
| `conversationClassificationService.ts` | Auto-classifies conversations |
| `modelDiscovery.ts` | Model discovery for providers |
| `providerConnectionService.ts` | Provider connection CRUD |
| `providerResolver.ts` | Resolves provider by connection ID |

### Settings
| File | Role |
|---|---|
| `aiSettingsService.ts` | AI settings management |
| `modelCatalog.ts` | Model catalog / registry |
| `providerRegistry.ts` | Provider registry |

### Policy Documents (`src/services/ai/policies/`)
| File | Purpose |
|---|---|
| `SOUL.md` | Agent persona / soul |
| `PERSONAL_OS_RULES.md` | Operating rules for the OS |
| `RECOMMENDATION_RULES.md` | Recommendation generation rules |
| `DOMAIN_KNOWLEDGE.md` | Domain knowledge base |

### Evaluation (`src/services/ai/evaluation/`)
- `aiEvaluationSuite.ts` — AI evaluation harness

---

## Data Layer (Dexie Repositories)

**Database:** `AuraDexieDB` / `posDexieDb` — 17 schema versions, 28 tables

### Repository Interfaces (`src/services/contracts/`)
| Interface | Methods |
|---|---|
| `IActivityRepository` | CRUD activities |
| `ICaptureRepository` | CRUD captures |
| `IGoalRepository` | CRUD goals |
| `ILevelRepository` | CRUD levels + requirements/milestones |
| `IPracticeRepository` | CRUD practices |
| `IProjectRepository` | CRUD projects |
| `ISkillRepository` | CRUD skills + evidence/history/relations |
| `ITaskRepository` | CRUD tasks |
| `IVisionRepository` | CRUD vision + life areas + area visions |
| `IWeeklyFocusRepository` | CRUD weekly focus |
| `IAIRepository` | Conversations, messages, memories, settings, audit |
| `IIdeaCategoryRepository` | Category CRUD |
| `IIdeaRevisionRepository` | Revision history |
| `IRecommendationRepository` | Recommendation runs + recommendations |
| `ISettingsRepository` | User settings |
| `ICaptureRepository` | (duplicate name, captures & idea revisions) |

### Dexie Implementations (`src/services/adapters/dexie/`)
| Class | Tables |
|---|---|
| `DexieActivityRepository` | `activities` |
| `DexieCaptureRepository` | `captures` |
| `DexieGoalRepository` | `goals` |
| `DexieLevelRepository` | `levels`, `level_requirements`, `level_skills`, `level_milestones`, `requirement_evidence`, `level_history`, `progression_exceptions` |
| `DexiePracticeRepository` | `practices`, `point_ledger` |
| `DexieProjectRepository` | `projects` |
| `DexieSkillRepository` | `skills`, `skill_history`, `skill_evidence`, `skill_goal_relations`, `skill_project_relations`, `skill_level_relations` |
| `DexieTaskRepository` | `tasks` |
| `DexieVisionRepository` | `visions`, `life_areas`, `area_visions`, `current_states`, `vision_items` |
| `DexieWeeklyFocusRepository` | `weekly_focus` |
| `DexieAIRepository` | `ai_conversations`, `ai_conversation_groups`, `ai_messages`, `ai_memories`, `ai_audit_events`, `ai_settings`, `ai_request_logs`, `ai_provider_connections` |
| `DexieIdeaCategoryRepository` | `idea_categories` |
| `DexieIdeaRevisionRepository` | `idea_revisions` |
| `DexieRecommendationRepository` | `ai_recommendation_runs`, `ai_recommendations` |
| `DexieSettingsRepository` | `settings` |

---

## Shared Services

| File | Role |
|---|---|
| `analytics/metricDefinitions.ts` | Metric definitions |
| `analytics/metricsService.ts` | Metrics calculation |
| `analytics/reviewAnalyticsService.ts` | Review period analytics |
| `points/pointService.ts` | Point calculation across entities |
| `backup/exportService.ts` | Data export/backup |

---

## Shared UI Components (`src/components/ui/`)
`Badge`, `Button`, `Card`, `ConfirmDialog`, `EmptyState`, `Input`, `Modal`, `Select`, `Skeleton`, `Textarea`

## Shared Layout Components (`src/app/layout/`)
`AppShell`, `AppHeader`, `AppSidebar`, `MobileNavigation`

## Shared Feature Components (`src/components/shared/`)
`DatePickerBar`, `GoalProjectSelects`, `LiveClock`, `SectionHeader`, `StatWidget`

## Charts (`src/components/charts/`)
`ChartContainer` — Recharts wrapper

---

## Hooks (`src/hooks/`)
| Hook | Feature |
|---|---|
| `useActivities` | Daily log |
| `useAIAgent` | AI chat |
| `useAIMemory` | AI memories |
| `useAISettings` | AI settings |
| `useCaptures` | Idea captures |
| `useDevelopmentPoints` | Points system |
| `useExecution` | Execution engine |
| `useGoals` | Goals |
| `useIdeaAssistant` | Idea AI assistant |
| `useIdeaCategories` | Idea categories |
| `useIdeaWorkspace` | Idea workspace |
| `useLevelDetail` | Level detail |
| `useLevels` | Levels |
| `useLiveDateTime` | Clock |
| `useMediaQuery` | Responsive |
| `usePractices` | Practices |
| `useProjectDetail` | Project detail |
| `useProjects` | Projects |
| `useReviewAnalytics` | Review analytics |
| `useSkillDetail` | Skill detail |
| `useSkills` | Skills |
| `useTasks` | Tasks |
| `useVision` | Vision |
| `useVoiceInput` | Voice capture |
| `useWeeklyData` | Weekly data |

---

## Constants (`src/constants/`)
`categories.ts`, `goals.ts`, `levels.ts`, `navigation.ts`, `priorities.ts`, `projects.ts`, `skills.ts`

## Types (`src/types/`)
`activity.types.ts`, `ai.types.ts`, `aiProvider.types.ts`, `aiTool.types.ts`, `analytics.types.ts`, `capture.types.ts`, `goal.types.ts`, `ideaCategory.types.ts`, `level.types.ts`, `metrics.types.ts`, `practice.types.ts`, `project.types.ts`, `recommendation.types.ts`, `settings.types.ts`, `skill.types.ts`, `task.types.ts`, `vision.types.ts`, `weekly.types.ts`

## Utils (`src/utils/`)
`cn.ts` (clsx merger), `dateUtils.ts`, `formatters.ts`, `goalHierarchy.ts`, `ideaContent.ts`, `idGenerator.ts`

---

## Component Count Summary

| Feature | Page Components | Sub-Components | Forms/Modals | Total |
|---|---|---|---|---|
| Dashboard | 1 | 5 | 3 | **9** |
| Idea Capture | 2 | 3 | 1 | **6** |
| Daily Log | 1 | 4 | 1 | **6** |
| Tasks | 1 | 4 | 2 | **7** |
| Weekly Review | 1 | 6 | 0 | **7** |
| Settings | 1 | 2 | 0 | **3** |
| Vision | 1 | 4 (inline) | 5 (inline) | **~10** |
| Goals | 2 | 8 | 3 | **13** |
| Levels | 3 | 14 | 6 | **23** |
| Projects | 2 | 8 | 2 | **12** |
| Skills | 2 | 10 | 3 | **15** |
| Execution | 1 | 9 | 5 | **15** |
| Practices | 1 | 10 | 3 | **14** |
| AI | 1 | 14 | 4 | **19** |
| Review | 2 | 14 | 0 | **16** |
| **Shared** | — | 10 ui + 5 shared + 4 layout + 1 chart | — | **20** |
| **TOTAL** | | | | **~195** |

---

## Complexity Estimate by Feature

| Feature | Complexity | Notes |
|---|---|---|
| Dashboard | ★★☆☆☆ | Aggregator; low business logic |
| Idea Capture | ★★★★☆ | Voice, AI, revisions, attachments |
| Daily Log | ★★☆☆☆ | Simple log + timeline |
| Tasks | ★★☆☆☆ | Standard CRUD list |
| Weekly Review | ★★★☆☆ | Aggregation + charts |
| Settings | ★★☆☆☆ | Forms + data ops |
| Vision | ★★★☆☆ | Multi-step forms, in-place edit |
| Goals | ★★★★☆ | Hierarchy, circular prevention, 3 views |
| Levels | ★★★★★ | Evidence chain, milestones, exceptions, progression rules |
| Projects | ★★★☆☆ | Lifecycle, relationships |
| Skills | ★★★★☆ | Matrix, proficiency, evidence, junctions |
| Execution | ★★★★☆ | State machine, 7 sections, focus mode |
| Practices | ★★★★☆ | Point ledger accounting, adjustments |
| AI | ★★★★★ | Streaming, tools, multi-provider, action proposals |
| Review | ★★★★☆ | Analytics aggregation, drilldowns, charts |

**Overall app complexity: ★★★★☆ (High)**  
The app is substantial — 14 feature areas, 28 Dexie tables, full AI layer with 3 live providers + proactive recommendations, gamification (levels/points), and complex task management. Flutter conversion requires careful domain modeling especially for: (1) the AI provider abstraction, (2) the point ledger accounting, (3) the level progression system, and (4) the execution engine's task state machine.
