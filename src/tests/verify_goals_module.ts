import {
  validateGoalTitle,
  validateGoalDates,
  validateParentRelationship,
  validateGoalPayload,
} from '../features/goals/validation/goalValidation';
import { Goal } from '../types/goal.types';

console.log('--- Verifying POS Module 02 Goals & Objectives ---');

// 1. Validate Goal Title
console.log('1. Title Validation:');
console.log('  - Empty title error:', validateGoalTitle('') !== null ? 'PASSED' : 'FAILED');
console.log('  - Whitespace title error:', validateGoalTitle('   ') !== null ? 'PASSED' : 'FAILED');
console.log('  - Valid title:', validateGoalTitle('Reach 68kg target weight') === null ? 'PASSED' : 'FAILED');

// 2. Validate Goal Date Ranges
console.log('2. Date Range Validation:');
console.log('  - Valid range (2026-01-01 to 2026-12-31):', validateGoalDates('2026-01-01', '2026-12-31') === null ? 'PASSED' : 'FAILED');
console.log('  - Same start and target date:', validateGoalDates('2026-06-01', '2026-06-01') === null ? 'PASSED' : 'FAILED');
console.log('  - Invalid range (2026-12-31 to 2026-01-01):', validateGoalDates('2026-12-31', '2026-01-01') !== null ? 'PASSED' : 'FAILED');
console.log('  - Optional start date only:', validateGoalDates('2026-01-01', undefined) === null ? 'PASSED' : 'FAILED');
console.log('  - Optional target date only:', validateGoalDates(undefined, '2026-12-31') === null ? 'PASSED' : 'FAILED');

// 3. Parent Relationship & Cycle Validation
console.log('3. Parent Hierarchy Validation:');
const mockGoals: Goal[] = [
  {
    id: 'goal-1',
    user_id: 'user',
    title: 'Annual Professional Growth',
    status: 'active',
    goal_type: 'outcome',
    time_horizon: 'annual',
    priority: 'high',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'goal-2',
    user_id: 'user',
    title: 'Monthly Case Study Completion',
    status: 'active',
    goal_type: 'milestone',
    time_horizon: 'monthly',
    priority: 'high',
    parent_goal_id: 'goal-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

console.log('  - Prevent self-parenting (goal-1 -> goal-1):', validateParentRelationship('goal-1', 'goal-1', mockGoals) !== null ? 'PASSED' : 'FAILED');
console.log('  - Valid parent (goal-2 -> goal-1):', validateParentRelationship('goal-2', 'goal-1', mockGoals) === null ? 'PASSED' : 'FAILED');
console.log('  - Prevent direct cyclic dependency (goal-1 parented by goal-2):', validateParentRelationship('goal-1', 'goal-2', mockGoals) !== null ? 'PASSED' : 'FAILED');

// 4. Validate Complete Goal Payload
console.log('4. Complete Payload Validation:');
const validPayload = validateGoalPayload(
  {
    title: 'Complete Module 02 Verification',
    start_date: '2026-08-01',
    target_date: '2026-08-31',
    parent_goal_id: 'goal-1',
  },
  'goal-new',
  mockGoals
);
console.log('  - Valid Payload isValid:', validPayload.isValid ? 'PASSED' : 'FAILED');

const invalidPayload = validateGoalPayload(
  {
    title: '   ',
    start_date: '2026-09-01',
    target_date: '2026-08-01',
  },
  'goal-new',
  mockGoals
);
console.log('  - Invalid Payload isValid false:', !invalidPayload.isValid ? 'PASSED' : 'FAILED');
console.log('  - Detected title error:', invalidPayload.errors.title ? 'PASSED' : 'FAILED');
console.log('  - Detected date error:', invalidPayload.errors.dateRange ? 'PASSED' : 'FAILED');

console.log('--- POS Module 02 Goals & Objectives Verification Complete ---');
