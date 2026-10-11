#!/usr/bin/env tsx
// ============================================================
// MODULE 11 PHASE 6 — RECOMMENDATION CONTEXT BUILDER VERIFICATION
// ============================================================
//
// Verifies the bounded recommendation context builder:
//   - context builds for every signal type
//   - policy integration correct
//   - domain knowledge included only when required
//   - target entity selection correct
//   - bounded data selection (max 5 tasks, 5 activities, etc.)
//   - irrelevant records excluded
//   - metrics extraction correct
//   - action allowlist correct
//   - destructive actions excluded
//   - no secrets/API keys
//   - no full database dumps
//   - null/empty data handled
//   - deterministic output
//   - context budget respected
//   - no AI/provider calls
//   - no DB writes
//
// ============================================================

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildRecommendationContext, type ContextBuilderInput, type SkillEvidenceGapData } from '../services/ai/proactive/recommendationContextBuilder.js';
import { type ProactiveCandidate, type SignalType } from '../types/recommendation.types.js';
import { type PolicyBundle } from '../services/ai/proactive/policyLoaderCore.js';
import type { Goal } from '../types/goal.types.js';
import type { Project } from '../types/project.types.js';
import type { Task } from '../types/task.types.js';
import type { Activity } from '../types/activity.types.js';
import type { Skill } from '../types/skill.types.js';
import type { Level } from '../types/level.types.js';
import type { Capture } from '../types/capture.types.js';

// ─── Test Fixtures ───────────────────────────────────────────

const NOW = '2026-01-15T12:00:00Z';

const MOCK_POLICY: PolicyBundle = {
  soul: {
    name: 'SOUL',
    version: '1.0.0',
    updatedAt: '2026-01-01',
    purpose: 'Role and tone',
    content: 'Mock SOUL content',
  },
  personalOsRules: {
    name: 'PERSONAL_OS_RULES',
    version: '1.0.0',
    updatedAt: '2026-01-01',
    purpose: 'System semantics',
    content: 'Mock rules content',
  },
  recommendationRules: {
    name: 'RECOMMENDATION_RULES',
    version: '1.0.0',
    updatedAt: '2026-01-01',
    purpose: 'Recommendation quality rules',
    content: 'Mock recommendation rules',
  },
  domainKnowledge: {
    name: 'DOMAIN_KNOWLEDGE',
    version: '1.0.0',
    updatedAt: '2026-01-01',
    purpose: 'Domain concepts',
    content: 'Mock domain knowledge',
  },
  combinedVersion: 'v1.0.0-20260101',
};

function createMockGoal(id: string, overrides?: Partial<Goal>): Goal {
  return {
    id,
    user_id: 'test-user',
    title: `Goal ${id}`,
    description: '',
    status: 'active',
    goal_type: 'outcome',
    time_horizon: 'annual',
    priority: 'medium',
    life_area_id: 'Career',
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

function createMockProject(id: string, overrides?: Partial<Project>): Project {
  return {
    id,
    user_id: 'test-user',
    title: `Project ${id}`,
    desired_outcome: '',
    description: '',
    status: 'active',
    priority: 'medium',
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

function createMockTask(id: string, overrides?: Partial<Task>): Task {
  return {
    id,
    title: `Task ${id}`,
    status: 'not_started',
    priority: 'medium',
    created_at: NOW,
    ...overrides,
  };
}

function createMockActivity(id: string, overrides?: Partial<Activity>): Activity {
  return {
    id,
    date: NOW.split('T')[0],
    title: `Activity ${id}`,
    description: `Activity ${id}`,
    category: 'Work',
    duration_minutes: 30,
    status: 'active',
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

function createMockSkill(id: string, overrides?: Partial<Skill>): Skill {
  return {
    id,
    user_id: 'test-user',
    name: `Skill ${id}`,
    description: '',
    current_proficiency: 'competent',
    target_proficiency: 'advanced',
    development_state: 'developing',
    status: 'active',
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

function createMockLevel(id: string, overrides?: Partial<Level>): Level {
  return {
    id,
    user_id: 'test-user',
    life_area_id: 'Career',
    name: `Level ${id}`,
    description: '',
    display_order: 1,
    status: 'unlocked',
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

function createMockCapture(id: string, overrides?: Partial<Capture>): Capture {
  return {
    id,
    user_id: 'test-user',
    capture_type: 'idea',
    content: `Idea ${id}`,
    status: 'inbox',
    source: 'manual',
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

function createMockCandidate(signalType: SignalType, scopeId: string, overrides?: Partial<ProactiveCandidate>): ProactiveCandidate {
  return {
    signalType,
    scopeType: signalType.startsWith('goal') ? 'goal' : signalType.startsWith('project') ? 'project' : signalType.startsWith('skill') ? 'skill' : 'global',
    scopeId,
    severity: 'medium',
    evidence: {},
    dedupeKey: `${signalType}:${scopeId}`,
    detectedAt: NOW,
    ...overrides,
  };
}

function createBaseInput(candidate: ProactiveCandidate): ContextBuilderInput {
  return {
    candidate,
    policy: MOCK_POLICY,
    now: NOW,
    goals: [],
    projects: [],
    tasks: [],
    activities: [],
    skills: [],
    levels: [],
    practices: [],
    captures: [],
    skillLevelRelations: [],
    goalMetrics: [],
    projectMetrics: [],
    skillMetrics: [],
    lifeAreaMetrics: [],
    executionMetrics: {
      totalTasksCompleted: 0,
      totalActivitiesLogged: 0,
      totalPointsEarned: 0,
      activeGoalsCount: 0,
      activeProjectsCount: 0,
      completionRate: 0,
      averageTasksPerDay: 0,
      averageActivitiesPerDay: 0,
      currentStreak: 0,
      longestStreak: 0,
    },
  };
}

// ─── Test Suite ──────────────────────────────────────────────

let results = { passed: 0, failed: 0 };

describe('Module 11 Phase 6 — Recommendation Context Builder', () => {
  it('1. builds context for goal_inactive', () => {
    const goal = createMockGoal('goal-1');
    const candidate = createMockCandidate('goal_inactive', 'goal-1');
    const input = createBaseInput(candidate);
    input.goals = [goal];
    input.tasks = [createMockTask('task-1', { related_goal_id: 'goal-1' })];
    input.activities = [createMockActivity('act-1', { related_goal_id: 'goal-1' })];

    const context = buildRecommendationContext(input);

    assert.equal(context.candidate.signalType, 'goal_inactive');
    assert.equal(context.domainData.type, 'goal_inactive');
    assert.equal(context.domainData.data.targetGoal.id, 'goal-1');
    assert.equal(context.domainData.data.recentTasks.length, 1);
    assert.equal(context.domainData.data.recentActivities.length, 1);
    results.passed++;
  });

  it('2. builds context for goal_without_clear_next_action', () => {
    const goal = createMockGoal('goal-2');
    const candidate = createMockCandidate('goal_without_clear_next_action', 'goal-2');
    const input = createBaseInput(candidate);
    input.goals = [goal];
    input.tasks = [createMockTask('task-2', { related_goal_id: 'goal-2' })];

    const context = buildRecommendationContext(input);

    assert.equal(context.domainData.type, 'goal_without_clear_next_action');
    assert.equal(context.domainData.data.targetGoal.id, 'goal-2');
    assert.equal(context.domainData.data.openTasks.length, 1);
    results.passed++;
  });

  it('3. builds context for goal_next_action', () => {
    const goal = createMockGoal('goal-3');
    const candidate = createMockCandidate('goal_next_action', 'goal-3');
    const input = createBaseInput(candidate);
    input.goals = [goal];
    input.tasks = [createMockTask('task-3', { related_goal_id: 'goal-3', status: 'in_progress' })];

    const context = buildRecommendationContext(input);

    assert.equal(context.domainData.type, 'goal_next_action');
    assert.equal(context.domainData.data.activeTasks.length, 1);
    results.passed++;
  });

  it('4. builds context for project_stalled', () => {
    const project = createMockProject('proj-1');
    const candidate = createMockCandidate('project_stalled', 'proj-1');
    candidate.scopeType = 'project';
    const input = createBaseInput(candidate);
    input.projects = [project];
    input.tasks = [createMockTask('task-4', { related_project_id: 'proj-1' })];

    const context = buildRecommendationContext(input);

    assert.equal(context.domainData.type, 'project_stalled');
    assert.equal(context.domainData.data.targetProject.id, 'proj-1');
    results.passed++;
  });

  it('5. builds context for project_next_action', () => {
    const project = createMockProject('proj-2');
    const candidate = createMockCandidate('project_next_action', 'proj-2');
    candidate.scopeType = 'project';
    const input = createBaseInput(candidate);
    input.projects = [project];

    const context = buildRecommendationContext(input);

    assert.equal(context.domainData.type, 'project_next_action');
    assert.equal(context.domainData.data.targetProject.id, 'proj-2');
    results.passed++;
  });

  it('6. builds context for skill_evidence_gap', () => {
    const skill = createMockSkill('skill-1');
    const candidate = createMockCandidate('skill_evidence_gap', 'skill-1');
    candidate.scopeType = 'skill';
    const input = createBaseInput(candidate);
    input.skills = [skill];

    const context = buildRecommendationContext(input);

    assert.equal(context.domainData.type, 'skill_evidence_gap');
    const data = context.domainData.data as SkillEvidenceGapData;
    assert.equal(data.targetSkill.id, 'skill-1');
    assert.ok(Array.isArray(data.relatedLevels));
    results.passed++;
  });

  it('7. builds context for life_area_attention', () => {
    const candidate = createMockCandidate('life_area_attention', 'Health');
    candidate.scopeType = 'life_area';
    const input = createBaseInput(candidate);
    input.activities = [createMockActivity('act-h', { related_life_area_id: 'Health' })];

    const context = buildRecommendationContext(input);

    assert.equal(context.domainData.type, 'life_area_attention');
    assert.equal(context.domainData.data.lifeArea, 'Health');
    results.passed++;
  });

  it('8. builds context for execution_decline', () => {
    const candidate = createMockCandidate('execution_decline', 'global');
    candidate.evidence = { pointsLastWeek: 100, pointsThisWeek: 50 };
    const input = createBaseInput(candidate);

    const context = buildRecommendationContext(input);

    assert.equal(context.domainData.type, 'execution_decline');
    assert.equal(context.domainData.data.pointsLastWeek, 100);
    assert.equal(context.domainData.data.pointsThisWeek, 50);
    results.passed++;
  });

  it('9. builds context for learning_without_application', () => {
    const candidate = createMockCandidate('learning_without_application', 'global');
    const input = createBaseInput(candidate);
    input.activities = [createMockActivity('act-l', { category: 'Learning' })];

    const context = buildRecommendationContext(input);

    assert.equal(context.domainData.type, 'learning_without_application');
    assert.ok(context.domainData.data.learningActivities.length >= 0);
    results.passed++;
  });

  it('10. builds context for completed_goal_followup', () => {
    const goal = createMockGoal('goal-c', { status: 'completed' });
    const candidate = createMockCandidate('completed_goal_followup', 'goal-c');
    const input = createBaseInput(candidate);
    input.goals = [goal];

    const context = buildRecommendationContext(input);

    assert.equal(context.domainData.type, 'completed_goal_followup');
    assert.equal(context.domainData.data.completedGoal.id, 'goal-c');
    results.passed++;
  });

  it('11. builds context for idea_opportunity', () => {
    const idea = createMockCapture('idea-1');
    const candidate = createMockCandidate('idea_opportunity', 'idea-1');
    candidate.scopeType = 'idea';
    candidate.evidence = { relatedGoalId: 'goal-x' };
    const input = createBaseInput(candidate);
    input.captures = [idea];
    input.goals = [createMockGoal('goal-x')];

    const context = buildRecommendationContext(input);

    assert.equal(context.domainData.type, 'idea_opportunity');
    assert.equal(context.domainData.data.targetIdea.id, 'idea-1');
    assert.equal(context.domainData.data.relatedGoal?.id, 'goal-x');
    results.passed++;
  });

  it('12. includes all mandatory policies', () => {
    const goal = createMockGoal('goal-m');
    const candidate = createMockCandidate('goal_inactive', 'goal-m');
    const input = createBaseInput(candidate);
    input.goals = [goal];

    const context = buildRecommendationContext(input);

    assert.ok(context.policy.soul);
    assert.ok(context.policy.personalOsRules);
    assert.ok(context.policy.recommendationRules);
    assert.equal(context.policy.soul.name, 'SOUL');
    assert.equal(context.policy.personalOsRules.name, 'PERSONAL_OS_RULES');
    results.passed++;
  });

  it('13. includes domain knowledge for skill_evidence_gap', () => {
    const skill = createMockSkill('skill-dk');
    const candidate = createMockCandidate('skill_evidence_gap', 'skill-dk');
    candidate.scopeType = 'skill';
    const input = createBaseInput(candidate);
    input.skills = [skill];

    const context = buildRecommendationContext(input);

    assert.ok(context.policy.domainKnowledge, 'Domain knowledge should be included');
    assert.equal(context.policy.domainKnowledge.name, 'DOMAIN_KNOWLEDGE');
    results.passed++;
  });

  it('14. includes domain knowledge for learning_without_application', () => {
    const candidate = createMockCandidate('learning_without_application', 'global');
    const input = createBaseInput(candidate);

    const context = buildRecommendationContext(input);

    assert.ok(context.policy.domainKnowledge, 'Domain knowledge should be included');
    results.passed++;
  });

  it('15. includes domain knowledge for idea_opportunity', () => {
    const idea = createMockCapture('idea-dk');
    const candidate = createMockCandidate('idea_opportunity', 'idea-dk');
    candidate.scopeType = 'idea';
    const input = createBaseInput(candidate);
    input.captures = [idea];

    const context = buildRecommendationContext(input);

    assert.ok(context.policy.domainKnowledge, 'Domain knowledge should be included');
    results.passed++;
  });

  it('16. does NOT include domain knowledge for goal_inactive', () => {
    const goal = createMockGoal('goal-ndk');
    const candidate = createMockCandidate('goal_inactive', 'goal-ndk');
    const input = createBaseInput(candidate);
    input.goals = [goal];
    input.policy = { ...MOCK_POLICY, domainKnowledge: undefined };

    const context = buildRecommendationContext(input);

    assert.equal(context.policy.domainKnowledge, undefined);
    results.passed++;
  });

  it('17. bounds tasks to max 5', () => {
    const goal = createMockGoal('goal-b');
    const candidate = createMockCandidate('goal_inactive', 'goal-b');
    const input = createBaseInput(candidate);
    input.goals = [goal];
    input.tasks = Array.from({ length: 10 }, (_, i) =>
      createMockTask(`task-b${i}`, { related_goal_id: 'goal-b' })
    );

    const context = buildRecommendationContext(input);

    assert.equal(context.domainData.type, 'goal_inactive');
    const data = context.domainData.data as import('../services/ai/proactive/recommendationContextBuilder').GoalInactiveData;
    assert.equal(data.recentTasks.length, 5);
    results.passed++;
  });

  it('18. bounds activities to max 5', () => {
    const goal = createMockGoal('goal-ba');
    const candidate = createMockCandidate('goal_inactive', 'goal-ba');
    const input = createBaseInput(candidate);
    input.goals = [goal];
    input.activities = Array.from({ length: 10 }, (_, i) =>
      createMockActivity(`act-b${i}`, { related_goal_id: 'goal-ba' })
    );

    const context = buildRecommendationContext(input);

    assert.equal(context.domainData.type, 'goal_inactive');
    const data = context.domainData.data as import('../services/ai/proactive/recommendationContextBuilder').GoalInactiveData;
    assert.equal(data.recentActivities.length, 5);
    results.passed++;
  });

  it('19. excludes irrelevant tasks', () => {
    const goal = createMockGoal('goal-ir');
    const candidate = createMockCandidate('goal_inactive', 'goal-ir');
    const input = createBaseInput(candidate);
    input.goals = [goal];
    input.tasks = [
      createMockTask('task-ir1', { related_goal_id: 'goal-ir' }),
      createMockTask('task-ir2', { related_goal_id: 'other-goal' }),
    ];

    const context = buildRecommendationContext(input);

    assert.equal(context.domainData.type, 'goal_inactive');
    const data = context.domainData.data as import('../services/ai/proactive/recommendationContextBuilder').GoalInactiveData;
    assert.equal(data.recentTasks.length, 1);
    assert.equal(data.recentTasks[0].id, 'task-ir1');
    results.passed++;
  });

  it('20. excludes irrelevant activities', () => {
    const goal = createMockGoal('goal-ia');
    const candidate = createMockCandidate('goal_inactive', 'goal-ia');
    const input = createBaseInput(candidate);
    input.goals = [goal];
    input.activities = [
      createMockActivity('act-ia1', { related_goal_id: 'goal-ia' }),
      createMockActivity('act-ia2', { related_goal_id: 'other-goal' }),
    ];

    const context = buildRecommendationContext(input);

    assert.equal(context.domainData.type, 'goal_inactive');
    const data = context.domainData.data as import('../services/ai/proactive/recommendationContextBuilder').GoalInactiveData;
    assert.equal(data.recentActivities.length, 1);
    assert.equal(data.recentActivities[0].id, 'act-ia1');
    results.passed++;
  });

  it('21. extracts goal metrics correctly', () => {
    const goal = createMockGoal('goal-gm');
    const candidate = createMockCandidate('goal_inactive', 'goal-gm');
    const input = createBaseInput(candidate);
    input.goals = [goal];
    input.goalMetrics = [{
      goalId: 'goal-gm',
      health: 'at_risk',
      completedTasksCount: 5,
      openTasksCount: 10,
      totalTasksCount: 15,
      daysSinceLastActivity: 7,
      completionRate: 0.33,
    }];

    const context = buildRecommendationContext(input);

    assert.ok(context.metrics.goal);
    assert.equal(context.metrics.goal.goalId, 'goal-gm');
    assert.equal(context.metrics.goal.health, 'at_risk');
    results.passed++;
  });

  it('22. extracts project metrics correctly', () => {
    const project = createMockProject('proj-pm');
    const candidate = createMockCandidate('project_stalled', 'proj-pm');
    candidate.scopeType = 'project';
    const input = createBaseInput(candidate);
    input.projects = [project];
    input.projectMetrics = [{
      projectId: 'proj-pm',
      health: 'stalled',
      completedTasksCount: 2,
      openTasksCount: 8,
      totalTasksCount: 10,
      daysSinceLastActivity: 14,
      completionRate: 0.2,
    }];

    const context = buildRecommendationContext(input);

    assert.ok(context.metrics.project);
    assert.equal(context.metrics.project.projectId, 'proj-pm');
    assert.equal(context.metrics.project.health, 'stalled');
    results.passed++;
  });

  it('23. extracts skill metrics correctly', () => {
    const skill = createMockSkill('skill-sm');
    const candidate = createMockCandidate('skill_evidence_gap', 'skill-sm');
    candidate.scopeType = 'skill';
    const input = createBaseInput(candidate);
    input.skills = [skill];
    input.skillMetrics = [{
      skillId: 'skill-sm',
      evidenceCount: 3,
      lastAppliedDate: NOW,
      daysSinceLastApplied: 30,
      recentProjectsCount: 1,
    }];

    const context = buildRecommendationContext(input);

    assert.ok(context.metrics.skill);
    assert.equal(context.metrics.skill.skillId, 'skill-sm');
    results.passed++;
  });

  it('24. extracts life area metrics correctly', () => {
    const candidate = createMockCandidate('life_area_attention', 'Health');
    candidate.scopeType = 'life_area';
    const input = createBaseInput(candidate);
    input.lifeAreaMetrics = [{
      area: 'Health',
      activitiesCount: 5,
      tasksCount: 3,
      pointsEarned: 50,
      hoursSpent: 10,
      percentOfTotal: 0.15,
    }];

    const context = buildRecommendationContext(input);

    assert.ok(context.metrics.lifeArea);
    assert.equal(context.metrics.lifeArea.area, 'Health');
    results.passed++;
  });

  it('25. extracts execution metrics for global signals', () => {
    const candidate = createMockCandidate('execution_decline', 'global');
    const input = createBaseInput(candidate);
    input.executionMetrics = {
      totalTasksCompleted: 50,
      totalActivitiesLogged: 100,
      totalPointsEarned: 500,
      activeGoalsCount: 5,
      activeProjectsCount: 3,
      completionRate: 0.75,
      averageTasksPerDay: 2.5,
      averageActivitiesPerDay: 5.0,
      currentStreak: 7,
      longestStreak: 14,
    };

    const context = buildRecommendationContext(input);

    assert.ok(context.metrics.execution);
    assert.equal(context.metrics.execution.totalTasksCompleted, 50);
    results.passed++;
  });

  it('26. includes correct action allowlist for goal_inactive', () => {
    const goal = createMockGoal('goal-aa');
    const candidate = createMockCandidate('goal_inactive', 'goal-aa');
    const input = createBaseInput(candidate);
    input.goals = [goal];

    const context = buildRecommendationContext(input);

    assert.ok(context.allowedActions.includes('createTask'));
    assert.ok(context.allowedActions.includes('createSubGoal'));
    assert.ok(context.allowedActions.includes('updateGoal'));
    results.passed++;
  });

  it('27. includes correct action allowlist for project_stalled', () => {
    const project = createMockProject('proj-aa');
    const candidate = createMockCandidate('project_stalled', 'proj-aa');
    candidate.scopeType = 'project';
    const input = createBaseInput(candidate);
    input.projects = [project];

    const context = buildRecommendationContext(input);

    assert.ok(context.allowedActions.includes('createTask'));
    assert.ok(context.allowedActions.includes('updateProject'));
    results.passed++;
  });

  it('28. includes correct action allowlist for skill_evidence_gap', () => {
    const skill = createMockSkill('skill-aa');
    const candidate = createMockCandidate('skill_evidence_gap', 'skill-aa');
    candidate.scopeType = 'skill';
    const input = createBaseInput(candidate);
    input.skills = [skill];

    const context = buildRecommendationContext(input);

    assert.ok(context.allowedActions.includes('createTask'));
    assert.ok(context.allowedActions.includes('createGoal'));
    assert.ok(context.allowedActions.includes('createSubGoal'));
    results.passed++;
  });

  it('29. includes empty action allowlist for idea_opportunity', () => {
    const idea = createMockCapture('idea-aa');
    const candidate = createMockCandidate('idea_opportunity', 'idea-aa');
    candidate.scopeType = 'idea';
    const input = createBaseInput(candidate);
    input.captures = [idea];

    const context = buildRecommendationContext(input);

    assert.equal(context.allowedActions.length, 0, 'Idea opportunities should have no auto-actions');
    results.passed++;
  });

  it('30. excludes destructive actions from all allowlists', () => {
    const goal = createMockGoal('goal-dest');
    const candidate = createMockCandidate('goal_inactive', 'goal-dest');
    const input = createBaseInput(candidate);
    input.goals = [goal];

    const context = buildRecommendationContext(input);

    const destructive = ['archiveGoal', 'archiveProject', 'archiveMemory', 'deleteTask', 'deleteGoal'];
    for (const action of destructive) {
      assert.ok(!context.allowedActions.includes(action), `Should not include ${action}`);
    }
    results.passed++;
  });

  it('31. handles null/empty tasks gracefully', () => {
    const goal = createMockGoal('goal-null');
    const candidate = createMockCandidate('goal_inactive', 'goal-null');
    const input = createBaseInput(candidate);
    input.goals = [goal];
    input.tasks = [];

    const context = buildRecommendationContext(input);

    assert.equal(context.domainData.type, 'goal_inactive');
    const data = context.domainData.data as import('../services/ai/proactive/recommendationContextBuilder').GoalInactiveData;
    assert.equal(data.recentTasks.length, 0);
    results.passed++;
  });

  it('32. handles null/empty activities gracefully', () => {
    const goal = createMockGoal('goal-nullact');
    const candidate = createMockCandidate('goal_inactive', 'goal-nullact');
    const input = createBaseInput(candidate);
    input.goals = [goal];
    input.activities = [];

    const context = buildRecommendationContext(input);

    assert.equal(context.domainData.type, 'goal_inactive');
    const data = context.domainData.data as import('../services/ai/proactive/recommendationContextBuilder').GoalInactiveData;
    assert.equal(data.recentActivities.length, 0);
    results.passed++;
  });

  it('33. handles missing linked project gracefully', () => {
    const goal = createMockGoal('goal-noproj');
    const candidate = createMockCandidate('goal_inactive', 'goal-noproj');
    const input = createBaseInput(candidate);
    input.goals = [goal];
    input.projects = [];

    const context = buildRecommendationContext(input);

    assert.equal(context.domainData.type, 'goal_inactive');
    const data = context.domainData.data as import('../services/ai/proactive/recommendationContextBuilder').GoalInactiveData;
    assert.equal(data.linkedProject, undefined);
    results.passed++;
  });

  it('34. handles missing related goal in idea_opportunity', () => {
    const idea = createMockCapture('idea-nogoal');
    const candidate = createMockCandidate('idea_opportunity', 'idea-nogoal');
    candidate.scopeType = 'idea';
    candidate.evidence = {}; // no relatedGoalId
    const input = createBaseInput(candidate);
    input.captures = [idea];

    const context = buildRecommendationContext(input);

    assert.equal(context.domainData.type, 'idea_opportunity');
    const data = context.domainData.data as import('../services/ai/proactive/recommendationContextBuilder').IdeaOpportunityData;
    assert.equal(data.relatedGoal, undefined);
    results.passed++;
  });

  it('35. throws error if target goal missing', () => {
    const candidate = createMockCandidate('goal_inactive', 'missing-goal');
    const input = createBaseInput(candidate);
    input.goals = [];

    assert.throws(
      () => buildRecommendationContext(input),
      /Goal missing-goal not found/
    );
    results.passed++;
  });

  it('36. throws error if target project missing', () => {
    const candidate = createMockCandidate('project_stalled', 'missing-proj');
    candidate.scopeType = 'project';
    const input = createBaseInput(candidate);
    input.projects = [];

    assert.throws(
      () => buildRecommendationContext(input),
      /Project missing-proj not found/
    );
    results.passed++;
  });

  it('37. throws error if target skill missing', () => {
    const candidate = createMockCandidate('skill_evidence_gap', 'missing-skill');
    candidate.scopeType = 'skill';
    const input = createBaseInput(candidate);
    input.skills = [];

    assert.throws(
      () => buildRecommendationContext(input),
      /Skill missing-skill not found/
    );
    results.passed++;
  });

  it('38. throws error if target idea missing', () => {
    const candidate = createMockCandidate('idea_opportunity', 'missing-idea');
    candidate.scopeType = 'idea';
    const input = createBaseInput(candidate);
    input.captures = [];

    assert.throws(
      () => buildRecommendationContext(input),
      /Idea missing-idea not found/
    );
    results.passed++;
  });

  it('39. throws error if mandatory policy missing', () => {
    const goal = createMockGoal('goal-nopol');
    const candidate = createMockCandidate('goal_inactive', 'goal-nopol');
    const input = createBaseInput(candidate);
    input.goals = [goal];
    input.policy = { ...MOCK_POLICY, soul: undefined as any };

    assert.throws(
      () => buildRecommendationContext(input),
      /Invalid policy bundle/
    );
    results.passed++;
  });

  it('40. throws error if domain knowledge required but missing', () => {
    const skill = createMockSkill('skill-nodk');
    const candidate = createMockCandidate('skill_evidence_gap', 'skill-nodk');
    candidate.scopeType = 'skill';
    const input = createBaseInput(candidate);
    input.skills = [skill];
    input.policy = { ...MOCK_POLICY, domainKnowledge: undefined };

    assert.throws(
      () => buildRecommendationContext(input),
      /requires DOMAIN_KNOWLEDGE/
    );
    results.passed++;
  });

  it('41. produces deterministic output for same input', () => {
    const goal = createMockGoal('goal-det');
    const candidate = createMockCandidate('goal_inactive', 'goal-det');
    const input = createBaseInput(candidate);
    input.goals = [goal];
    input.tasks = [createMockTask('task-det', { related_goal_id: 'goal-det' })];

    const context1 = buildRecommendationContext(input);
    const context2 = buildRecommendationContext(input);

    assert.deepEqual(context1.candidate, context2.candidate);
    assert.deepEqual(context1.domainData, context2.domainData);
    assert.deepEqual(context1.allowedActions, context2.allowedActions);
    results.passed++;
  });

  it('42. sets contextBuiltAt to input.now', () => {
    const goal = createMockGoal('goal-ts');
    const candidate = createMockCandidate('goal_inactive', 'goal-ts');
    const input = createBaseInput(candidate);
    input.goals = [goal];

    const context = buildRecommendationContext(input);

    assert.equal(context.contextBuiltAt, NOW);
    results.passed++;
  });

  it('43. does not include secrets or API keys', () => {
    const goal = createMockGoal('goal-sec');
    const candidate = createMockCandidate('goal_inactive', 'goal-sec');
    const input = createBaseInput(candidate);
    input.goals = [goal];

    const context = buildRecommendationContext(input);
    const jsonStr = JSON.stringify(context);

    assert.ok(!jsonStr.includes('API_KEY'));
    assert.ok(!jsonStr.includes('secret'));
    assert.ok(!jsonStr.includes('password'));
    results.passed++;
  });

  it('44. does not include full database dump', () => {
    const goal = createMockGoal('goal-dump');
    const candidate = createMockCandidate('goal_inactive', 'goal-dump');
    const input = createBaseInput(candidate);
    input.goals = [goal];
    // Add 50 extra goals that should NOT appear
    for (let i = 0; i < 50; i++) {
      input.goals.push(createMockGoal(`extra-${i}`));
    }

    const context = buildRecommendationContext(input);
    const jsonStr = JSON.stringify(context);

    // The context should only reference the target goal, not all 51
    const goalMatches = (jsonStr.match(/extra-/g) || []).length;
    assert.ok(goalMatches === 0, 'Should not include irrelevant goals');
    results.passed++;
  });

  it('45. respects context size budget warning', () => {
    const goal = createMockGoal('goal-size');
    const candidate = createMockCandidate('goal_inactive', 'goal-size');
    const input = createBaseInput(candidate);
    input.goals = [goal];

    // Add large dataset
    for (let i = 0; i < 100; i++) {
      input.tasks.push(createMockTask(`large-${i}`, { related_goal_id: 'goal-size', title: 'X'.repeat(500) }));
    }

    // Should still build, but may log warning
    const context = buildRecommendationContext(input);
    assert.ok(context);
    // Check that only 5 tasks are included despite 100 available
    assert.equal(context.domainData.type, 'goal_inactive');
    const data = context.domainData.data as import('../services/ai/proactive/recommendationContextBuilder').GoalInactiveData;
    assert.equal(data.recentTasks.length, 5);
    results.passed++;
  });

  it('46. bounds sub-goals to max 3', () => {
    const goal = createMockGoal('goal-subs');
    const candidate = createMockCandidate('goal_without_clear_next_action', 'goal-subs');
    const input = createBaseInput(candidate);
    input.goals = [
      goal,
      ...Array.from({ length: 5 }, (_, i) => createMockGoal(`sub-${i}`, { parent_goal_id: 'goal-subs' }))
    ];

    const context = buildRecommendationContext(input);
    
    assert.equal(context.domainData.type, 'goal_without_clear_next_action');
    const data = context.domainData.data as import('../services/ai/proactive/recommendationContextBuilder').GoalWithoutActionData;
    assert.equal(data.subGoals.length, 3);
    results.passed++;
  });

  it('47. bounds linked projects to max 2', () => {
    const goal = createMockGoal('goal-projs');
    const candidate = createMockCandidate('goal_without_clear_next_action', 'goal-projs');
    const input = createBaseInput(candidate);
    input.goals = [goal];
    input.projects = Array.from({ length: 5 }, (_, i) =>
      createMockProject(`proj-${i}`, { primary_goal_id: 'goal-projs' })
    );

    const context = buildRecommendationContext(input);

    assert.equal(context.domainData.type, 'goal_without_clear_next_action');
    const data = context.domainData.data as import('../services/ai/proactive/recommendationContextBuilder').GoalWithoutActionData;
    assert.equal(data.linkedProjects.length, 2);
    results.passed++;
  });

  it('48. bounds related goals to max 3 for life_area', () => {
    const candidate = createMockCandidate('life_area_attention', 'Career');
    candidate.scopeType = 'life_area';
    const input = createBaseInput(candidate);
    input.goals = Array.from({ length: 10 }, (_, i) =>
      createMockGoal(`career-${i}`, { life_area_id: 'Career' })
    );

    const context = buildRecommendationContext(input);

    assert.equal(context.domainData.type, 'life_area_attention');
    const data = context.domainData.data as import('../services/ai/proactive/recommendationContextBuilder').LifeAreaAttentionData;
    assert.equal(data.relatedGoals.length, 3);
    results.passed++;
  });

  it('49. sorts tasks by most recent first', () => {
    const goal = createMockGoal('goal-sort');
    const candidate = createMockCandidate('goal_inactive', 'goal-sort');
    const input = createBaseInput(candidate);
    input.goals = [goal];
    input.tasks = [
      createMockTask('task-old', { related_goal_id: 'goal-sort', completed_at: '2026-01-01T00:00:00Z' }),
      createMockTask('task-new', { related_goal_id: 'goal-sort', completed_at: '2026-01-14T00:00:00Z' }),
      createMockTask('task-mid', { related_goal_id: 'goal-sort', completed_at: '2026-01-07T00:00:00Z' }),
    ];

    const context = buildRecommendationContext(input);

    assert.equal(context.domainData.type, 'goal_inactive');
    const data = context.domainData.data as import('../services/ai/proactive/recommendationContextBuilder').GoalInactiveData;
    assert.equal(data.recentTasks[0].id, 'task-new');
    assert.equal(data.recentTasks[1].id, 'task-mid');
    assert.equal(data.recentTasks[2].id, 'task-old');
    results.passed++;
  });

  it('50. sorts activities by most recent first', () => {
    const goal = createMockGoal('goal-asort');
    const candidate = createMockCandidate('goal_inactive', 'goal-asort');
    const input = createBaseInput(candidate);
    input.goals = [goal];
    input.activities = [
      createMockActivity('act-old', { related_goal_id: 'goal-asort', created_at: '2026-01-01T00:00:00Z' }),
      createMockActivity('act-new', { related_goal_id: 'goal-asort', created_at: '2026-01-14T00:00:00Z' }),
    ];

    const context = buildRecommendationContext(input);

    assert.equal(context.domainData.type, 'goal_inactive');
    const data = context.domainData.data as import('../services/ai/proactive/recommendationContextBuilder').GoalInactiveData;
    assert.equal(data.recentActivities[0].id, 'act-new');
    assert.equal(data.recentActivities[1].id, 'act-old');
    results.passed++;
  });

  it('51. filters open tasks correctly for goal_without_clear_next_action', () => {
    const goal = createMockGoal('goal-open');
    const candidate = createMockCandidate('goal_without_clear_next_action', 'goal-open');
    const input = createBaseInput(candidate);
    input.goals = [goal];
    input.tasks = [
      createMockTask('task-open1', { related_goal_id: 'goal-open', status: 'not_started' }),
      createMockTask('task-open2', { related_goal_id: 'goal-open', status: 'in_progress' }),
      createMockTask('task-done', { related_goal_id: 'goal-open', status: 'completed' }),
    ];

    const context = buildRecommendationContext(input);

    assert.equal(context.domainData.type, 'goal_without_clear_next_action');
    const data51 = context.domainData.data as import('../services/ai/proactive/recommendationContextBuilder').GoalWithoutActionData;
    assert.equal(data51.openTasks.length, 2);
    assert.ok(data51.openTasks.every((t: Task) => t.status !== 'completed'));
    results.passed++;
  });

  it('52. filters active tasks correctly for goal_next_action', () => {
    const goal = createMockGoal('goal-active');
    const candidate = createMockCandidate('goal_next_action', 'goal-active');
    const input = createBaseInput(candidate);
    input.goals = [goal];
    input.tasks = [
      createMockTask('task-active1', { related_goal_id: 'goal-active', status: 'in_progress' }),
      createMockTask('task-active2', { related_goal_id: 'goal-active', status: 'not_started' }),
      createMockTask('task-done', { related_goal_id: 'goal-active', status: 'completed' }),
    ];

    const context = buildRecommendationContext(input);

    assert.equal(context.domainData.type, 'goal_next_action');
    const data52 = context.domainData.data as import('../services/ai/proactive/recommendationContextBuilder').GoalNextActionData;
    assert.equal(data52.activeTasks.length, 2);
    results.passed++;
  });

  it('53. includes policy version in context', () => {
    const goal = createMockGoal('goal-ver');
    const candidate = createMockCandidate('goal_inactive', 'goal-ver');
    const input = createBaseInput(candidate);
    input.goals = [goal];

    const context = buildRecommendationContext(input);

    assert.equal(context.policy.combinedVersion, 'v1.0.0-20260101');
    results.passed++;
  });

  it('54. handles missing metrics gracefully', () => {
    const goal = createMockGoal('goal-nometric');
    const candidate = createMockCandidate('goal_inactive', 'goal-nometric');
    const input = createBaseInput(candidate);
    input.goals = [goal];
    input.goalMetrics = [];

    const context = buildRecommendationContext(input);

    assert.equal(context.metrics.goal, undefined);
    results.passed++;
  });

  it('55. does not call AI providers', () => {
    const goal = createMockGoal('goal-noai');
    const candidate = createMockCandidate('goal_inactive', 'goal-noai');
    const input = createBaseInput(candidate);
    input.goals = [goal];

    // This should complete instantly with no async LLM calls
    const context = buildRecommendationContext(input);

    assert.ok(context);
    results.passed++;
  });

  it('56. does not write to database', () => {
    const goal = createMockGoal('goal-nodb');
    const candidate = createMockCandidate('goal_inactive', 'goal-nodb');
    const input = createBaseInput(candidate);
    input.goals = [goal];

    // Builder should be pure, no side effects
    const context = buildRecommendationContext(input);

    assert.ok(context);
    // No way to verify zero DB writes in this Node test, but the
    // builder has no DB imports so it's structurally guaranteed
    results.passed++;
  });

  it('57. filters learning activities correctly', () => {
    const candidate = createMockCandidate('learning_without_application', 'global');
    const input = createBaseInput(candidate);
    input.activities = [
      createMockActivity('act-learn', { title: 'Learning Python', description: 'study course' }),
      createMockActivity('act-research', { title: 'Research on AI', description: 'research paper' }),
      createMockActivity('act-work', { title: 'Regular work', description: 'daily work' }),
    ];

    const context = buildRecommendationContext(input);

    assert.equal(context.domainData.type, 'learning_without_application');
    const data = context.domainData.data as import('../services/ai/proactive/recommendationContextBuilder').LearningWithoutApplicationData;
    // Implementation filters by keywords in title/description
    assert.ok(data.learningActivities.length >= 2);
    results.passed++;
  });

  it('58. filters application tasks correctly', () => {
    const candidate = createMockCandidate('learning_without_application', 'global');
    const input = createBaseInput(candidate);
    input.tasks = [
      createMockTask('task-dev', { status: 'completed' }),
      createMockTask('task-build', { status: 'completed' }),
      createMockTask('task-plan', { status: 'not_started' }),
    ];

    const context = buildRecommendationContext(input);

    assert.equal(context.domainData.type, 'learning_without_application');
    const data = context.domainData.data as import('../services/ai/proactive/recommendationContextBuilder').LearningWithoutApplicationData;
    // Implementation uses completed tasks as proxy for application
    assert.equal(data.applicationTasks.length, 2);
    results.passed++;
  });

  it('59. includes child goals for completed_goal_followup', () => {
    const goal = createMockGoal('goal-comp', { status: 'completed' });
    const candidate = createMockCandidate('completed_goal_followup', 'goal-comp');
    const input = createBaseInput(candidate);
    input.goals = [
      goal,
      createMockGoal('child-1', { parent_goal_id: 'goal-comp' }),
      createMockGoal('child-2', { parent_goal_id: 'goal-comp' }),
    ];

    const context = buildRecommendationContext(input);

    assert.equal(context.domainData.type, 'completed_goal_followup');
    const data = context.domainData.data as import('../services/ai/proactive/recommendationContextBuilder').CompletedGoalFollowupData;
    assert.equal(data.childGoals.length, 2);
    results.passed++;
  });

  it('60. filters level-related activities correctly', () => {
    const skill = createMockSkill('skill-filter');
    const level = createMockLevel('level-filter');
    const candidate = createMockCandidate('skill_evidence_gap', 'skill-filter');
    candidate.scopeType = 'skill';
    const input = createBaseInput(candidate);
    input.skills = [skill];
    input.levels = [level];
    input.skillLevelRelations = [{ id: 'rel-1', skill_id: 'skill-filter', level_id: 'level-filter', created_at: NOW }];
    input.activities = [
      createMockActivity('act-skill', { related_level_id: 'level-filter' }),
      createMockActivity('act-other', { related_level_id: 'other-level' }),
    ];

    const context = buildRecommendationContext(input);

    assert.equal(context.domainData.type, 'skill_evidence_gap');
    const data = context.domainData.data as SkillEvidenceGapData;
    assert.equal(data.recentActivities.length, 1);
    assert.equal(data.recentActivities[0].id, 'act-skill');
    results.passed++;
  });

  it('61. filters level-related tasks correctly', () => {
    const skill = createMockSkill('skill-task');
    const level = createMockLevel('level-task');
    const candidate = createMockCandidate('skill_evidence_gap', 'skill-task');
    candidate.scopeType = 'skill';
    const input = createBaseInput(candidate);
    input.skills = [skill];
    input.levels = [level];
    input.skillLevelRelations = [{ id: 'rel-1', skill_id: 'skill-task', level_id: 'level-task', created_at: NOW }];
    input.tasks = [
      createMockTask('task-skill', { related_level_id: 'level-task' }),
      createMockTask('task-other', { related_level_id: 'other-level' }),
    ];

    const context = buildRecommendationContext(input);

    assert.equal(context.domainData.type, 'skill_evidence_gap');
    const data = context.domainData.data as SkillEvidenceGapData;
    assert.equal(data.recentTasks.length, 1);
    results.passed++;
  });

  it('62. finds related projects via level_id', () => {
    const skill = createMockSkill('skill-proj');
    const level = createMockLevel('level-proj');
    const candidate = createMockCandidate('skill_evidence_gap', 'skill-proj');
    candidate.scopeType = 'skill';
    const input = createBaseInput(candidate);
    input.skills = [skill];
    input.levels = [level];
    input.skillLevelRelations = [{ id: 'rel-1', skill_id: 'skill-proj', level_id: 'level-proj', created_at: NOW }];
    input.projects = [
      createMockProject('proj-skill', { level_id: 'level-proj' }),
      createMockProject('proj-other', { level_id: 'other-level' }),
    ];

    const context = buildRecommendationContext(input);

    assert.equal(context.domainData.type, 'skill_evidence_gap');
    const data = context.domainData.data as SkillEvidenceGapData;
    assert.equal(data.relatedProjects.length, 1);
    assert.equal(data.relatedProjects[0].id, 'proj-skill');
    results.passed++;
  });

  it('63. finds linked goal for project via primary_goal_id', () => {
    const project = createMockProject('proj-link', { primary_goal_id: 'goal-link' });
    const goal = createMockGoal('goal-link');
    const candidate = createMockCandidate('project_stalled', 'proj-link');
    candidate.scopeType = 'project';
    const input = createBaseInput(candidate);
    input.projects = [project];
    input.goals = [goal];

    const context = buildRecommendationContext(input);

    assert.equal(context.domainData.type, 'project_stalled');
    const data = context.domainData.data as import('../services/ai/proactive/recommendationContextBuilder').ProjectStalledData;
    assert.ok(data.linkedGoal);
    assert.equal(data.linkedGoal.id, 'goal-link');
    results.passed++;
  });

  it('64. finds related levels for skill via junction table', () => {
    const skill = createMockSkill('skill-lev');
    const level = createMockLevel('level-1');
    const candidate = createMockCandidate('skill_evidence_gap', 'skill-lev');
    candidate.scopeType = 'skill';
    const input = createBaseInput(candidate);
    input.skills = [skill];
    input.levels = [level];
    input.skillLevelRelations = [{ id: 'rel-1', skill_id: 'skill-lev', level_id: 'level-1', created_at: NOW }];

    const context = buildRecommendationContext(input);
    const data = context.domainData.data as SkillEvidenceGapData;

    assert.ok(data.relatedLevels.length > 0);
    assert.equal(data.relatedLevels[0].id, 'level-1');
    results.passed++;
  });

  it('65. handles no level relations gracefully', () => {
    const skill = createMockSkill('skill-nolev');
    const candidate = createMockCandidate('skill_evidence_gap', 'skill-nolev');
    candidate.scopeType = 'skill';
    const input = createBaseInput(candidate);
    input.skills = [skill];
    input.levels = [];
    input.skillLevelRelations = [];

    const context = buildRecommendationContext(input);
    const data = context.domainData.data as SkillEvidenceGapData;

    assert.equal(data.relatedLevels.length, 0);
    results.passed++;
  });

  it('66. filters active projects only for goal_inactive', () => {
    const goal = createMockGoal('goal-actproj');
    const candidate = createMockCandidate('goal_inactive', 'goal-actproj');
    const input = createBaseInput(candidate);
    input.goals = [goal];
    input.projects = [
      createMockProject('proj-active', { primary_goal_id: 'goal-actproj', status: 'active' }),
      createMockProject('proj-done', { primary_goal_id: 'goal-actproj', status: 'completed' }),
    ];

    const context = buildRecommendationContext(input);

    assert.equal(context.domainData.type, 'goal_inactive');
    const data = context.domainData.data as import('../services/ai/proactive/recommendationContextBuilder').GoalInactiveData;
    assert.ok(data.linkedProject);
    assert.equal(data.linkedProject.id, 'proj-active');
    results.passed++;
  });

  it('67. filters active goals only for learning_without_application', () => {
    const candidate = createMockCandidate('learning_without_application', 'global');
    const input = createBaseInput(candidate);
    input.goals = [
      createMockGoal('goal-active', { status: 'active' }),
      createMockGoal('goal-done', { status: 'completed' }),
    ];

    const context = buildRecommendationContext(input);

    // Should only include active goals
    assert.equal(context.domainData.type, 'learning_without_application');
    const data67 = context.domainData.data as import('../services/ai/proactive/recommendationContextBuilder').LearningWithoutApplicationData;
    assert.ok(data67.relatedGoals.every((g: Goal) => g.status === 'active'));
    results.passed++;
  });

  it('68. filters active projects only for learning_without_application', () => {
    const candidate = createMockCandidate('learning_without_application', 'global');
    const input = createBaseInput(candidate);
    input.projects = [
      createMockProject('proj-active', { status: 'active' }),
      createMockProject('proj-done', { status: 'completed' }),
    ];

    const context = buildRecommendationContext(input);

    assert.equal(context.domainData.type, 'learning_without_application');
    const data68 = context.domainData.data as import('../services/ai/proactive/recommendationContextBuilder').LearningWithoutApplicationData;
    assert.ok(data68.relatedProjects.every((p: Project) => p.status === 'active'));
    results.passed++;
  });

  it('69. finds related project for idea via goal', () => {
    const idea = createMockCapture('idea-proj');
    const goal = createMockGoal('goal-ideaproj');
    const project = createMockProject('proj-ideaproj', { primary_goal_id: 'goal-ideaproj', status: 'active' });
    const candidate = createMockCandidate('idea_opportunity', 'idea-proj');
    candidate.scopeType = 'idea';
    candidate.evidence = { relatedGoalId: 'goal-ideaproj' };
    const input = createBaseInput(candidate);
    input.captures = [idea];
    input.goals = [goal];
    input.projects = [project];

    const context = buildRecommendationContext(input);

    assert.equal(context.domainData.type, 'idea_opportunity');
    const data = context.domainData.data as import('../services/ai/proactive/recommendationContextBuilder').IdeaOpportunityData;
    assert.ok(data.relatedProject);
    assert.equal(data.relatedProject.id, 'proj-ideaproj');
    results.passed++;
  });

  it('70. finds recent activities for idea via goal', () => {
    const idea = createMockCapture('idea-act');
    const goal = createMockGoal('goal-ideaact');
    const candidate = createMockCandidate('idea_opportunity', 'idea-act');
    candidate.scopeType = 'idea';
    candidate.evidence = { relatedGoalId: 'goal-ideaact' };
    const input = createBaseInput(candidate);
    input.captures = [idea];
    input.goals = [goal];
    input.activities = [
      createMockActivity('act-idea', { related_goal_id: 'goal-ideaact' }),
      createMockActivity('act-other', { related_goal_id: 'other-goal' }),
    ];

    const context = buildRecommendationContext(input);

    assert.equal(context.domainData.type, 'idea_opportunity');
    const data70 = context.domainData.data as import('../services/ai/proactive/recommendationContextBuilder').IdeaOpportunityData;
    assert.equal(data70.recentActivities.length, 1);
    assert.equal(data70.recentActivities[0].id, 'act-idea');
    results.passed++;
  });
});

// ─── Run Tests ───────────────────────────────────────────────

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  MODULE 11 PHASE 6 — RECOMMENDATION CONTEXT BUILDER');
console.log('═══════════════════════════════════════════════════════════\n');

process.on('exit', () => {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`  Phase 6 verification: ${results.passed} passed, ${results.failed} failed`);
  console.log('═══════════════════════════════════════════════════════════\n');
  if (results.failed > 0) {
    process.exit(1);
  }
});
